import { LuaFactory, LuaEngine } from 'wasmoon';
import type { SpectralFrame, Datum, LuaError } from '../DataModel/types';

export interface LuaExecutionResult {
  success: boolean;
  datum?: Datum;
  errors?: LuaError[];
  executionTime: number;
}

export class LuaService {
  private luaEngine: LuaEngine | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const factory = new LuaFactory();
      this.luaEngine = await factory.createEngine();
      this.isInitialized = true;
      console.log('DRO: Lua engine initialized successfully');
    } catch (error) {
      console.error('DRO: Failed to initialize Lua engine:', error);
      throw error;
    }
  }

  async executeScript(
    code: string, 
    frameCount: number = 32, 
    bandCount: number = 20
  ): Promise<LuaExecutionResult> {
    const startTime = performance.now();

    if (!this.isInitialized || !this.luaEngine) {
      await this.initialize();
    }

    if (!this.luaEngine) {
      return {
        success: false,
        errors: [{ message: 'Lua engine not available', type: 'runtime' }],
        executionTime: 0
      };
    }

    try {
      // Set up global variables available to user code
      this.luaEngine.global.set('i_amt', bandCount);
      this.luaEngine.global.set('f_amt', frameCount);
      
      console.log('DRO: Set global variables - i_amt:', bandCount, 'f_amt:', frameCount);

      // Inject standard math functions for convenience
      this.luaEngine.doString(`
        -- Ensure math library is available
        math = math or {}
        
        -- Standard math functions for spectral processing
        function pow(base, exp) 
          return base ^ exp  -- Use Lua's built-in power operator
        end
        function sin(x) return math.sin(x) end
        function cos(x) return math.cos(x) end
        function exp(x) return math.exp(x) end
        function log(x) return math.log(x) end
        function abs(x) return math.abs(x) end
        function min(a, b) return math.min(a, b) end
        function max(a, b) return math.max(a, b) end
        function pi() return math.pi end
        function random() return math.random() end
        function sqrt(x) return math.sqrt(x) end
        
        -- Clamp function for ensuring values stay in range
        function clamp(value, minVal, maxVal)
          minVal = minVal or 0
          maxVal = maxVal or 1
          if value < minVal then return minVal end
          if value > maxVal then return maxVal end
          return value
        end
      `);

      // Execute user code (this should define a process function)
      console.log('DRO: Executing user code...');
      this.luaEngine.doString(code);

      // Get the process function
      const processFunction = this.luaEngine.global.get('process');
      console.log('DRO: Process function found:', typeof processFunction);
      
      if (typeof processFunction !== 'function') {
        return {
          success: false,
          errors: [{
            message: 'Code must define a "process()" function that returns a value for the current band',
            type: 'api',
            line: 1
          }],
          executionTime: performance.now() - startTime
        };
      }

      // Execute the shader-like processing
      const frames: SpectralFrame[] = [];
      
      console.log('DRO: Starting Lua execution with', frameCount, 'frames and', bandCount, 'bands');
      
      // Set the constant globals once
      this.luaEngine.global.set('i_amt', bandCount);
      this.luaEngine.global.set('f_amt', frameCount);
      
      console.log(`DRO: Set globals - i_amt: ${bandCount}, f_amt: ${frameCount}`);

      for (let f = 0; f < frameCount; f++) {
        // Set current frame global
        this.luaEngine.global.set('f', f);
        const bands: number[] = [];
        
        for (let i = 0; i < bandCount; i++) {
          // Set current band global
          this.luaEngine.global.set('i', i);
          
          try {
            // Execute user process function for this band
            const result = processFunction();
            
            // Debug just a few key points to verify fix
            if ((f === 0 && i < 2) || (f === 1 && i < 2) || (f >= 20 && i === 0)) {
              console.log(`DRO: Band ${i} frame ${f} result:`, result, typeof result);
            }
            
            // Ensure result is a number and clamp to valid range
            let value;
            if (typeof result === 'number' && !isNaN(result)) {
              value = Math.max(0, Math.min(1, result));
            } else {
              console.warn(`DRO: Invalid result for band ${i} frame ${f}:`, result, typeof result);
              value = 0;
            }
            
            bands.push(value);
          } catch (bandError) {
            // If band processing fails, use 0 (not 0.5!)
            console.error(`DRO: Error processing band ${i} in frame ${f}:`, bandError);
            bands.push(0);
          }
        }
        
        frames.push({
          bands,
          timestamp: f,
          metadata: { frame: f }
        });
      }
      
      // Debug final results
      const firstFrame = frames[0];
      const lastFrame = frames[frames.length - 1];
      console.log('DRO: First frame bands:', firstFrame.bands.slice(0, 5));
      console.log('DRO: Last frame bands:', lastFrame.bands.slice(0, 5));

      const datum: Datum = {
        frames,
        sampleRate: 44100,
        frameCount,
        bandCount,
        name: 'Lua Generated Spectral Data',
        createdAt: new Date()
      };

      const executionTime = performance.now() - startTime;
      
      console.log(`DRO: Lua execution completed in ${executionTime.toFixed(2)}ms`);
      console.log(`DRO: Generated ${frameCount} frames with ${bandCount} bands each`);

      return {
        success: true,
        datum,
        executionTime
      };

    } catch (error) {
      const executionTime = performance.now() - startTime;
      
      let luaError: LuaError;
      if (error instanceof Error) {
        // Parse Lua error message for line numbers
        const lineMatch = error.message.match(/:(\d+):/);
        luaError = {
          message: error.message,
          line: lineMatch ? parseInt(lineMatch[1]) : undefined,
          type: 'runtime'
        };
      } else {
        luaError = {
          message: 'Unknown Lua execution error',
          type: 'runtime'
        };
      }

      console.error('DRO: Lua execution error:', error);

      return {
        success: false,
        errors: [luaError],
        executionTime
      };
    }
  }

  getDefaultTemplate(): string {
    return `-- DRO Lua Spectral Processor
-- This code runs for each band (i) in each frame (f)
-- Available globals: i (band index), f (frame), i_amt (20), f_amt (32)

function process()
    -- Calculate frequency for current band (logarithmic scale: 80Hz - 8kHz)
    local freq = 80 * pow(8000/80, i/(i_amt-1))
    
    -- Create a time-varying sine wave based on frequency
    local time_factor = f / f_amt  -- 0 to 1
    local wave = sin(2 * pi() * time_factor * freq / 1000)
    
    -- Add some bass boost for lower frequencies
    local bass_boost = 1.0
    if i <= 2 then
        bass_boost = 1.5 + 0.5 * sin(time_factor * pi() * 3)
    end
    
    -- Combine and normalize to [0, 1] range
    local magnitude = 0.3 + 0.4 * wave * bass_boost
    
    return clamp(magnitude, 0, 1)
end`;
  }

  getSineWaveTemplate(): string {
    return `-- Simple sine wave generator
function process()
    local time = f / f_amt
    local value = 0.5 + 0.5 * sin(2 * pi() * time)
    return value
end`;
  }

  getSimpleTestTemplate(): string {
    return `-- Simple test: different value per band
function process()
    -- Return band index as percentage
    return i / (i_amt - 1)
end`;
  }

  getDiagonalTestTemplate(): string {
    return `-- Diagonal test: band i lights up at frame i
function process()
    if i == f then
        return 1
    else
        return 0
    end
end`;
  }

  getFrequencyResponseTemplate(): string {
    return `-- Frequency response curve
function process()
    -- Calculate frequency for this band
    local freq = 80 * pow(8000/80, i/(i_amt-1))
    
    -- Create a low-pass filter response
    local cutoff = 2000 -- Hz
    local response = 1 / (1 + pow(freq/cutoff, 2))
    
    return response
end`;
  }

  destroy(): void {
    if (this.luaEngine) {
      this.luaEngine.global.close();
      this.luaEngine = null;
    }
    this.isInitialized = false;
    console.log('DRO: Lua engine destroyed');
  }
}

// Create singleton instance
export const luaService = new LuaService(); 