import { LuaFactory, LuaEngine } from 'wasmoon';
import type { SpectralFrame, Datum, LuaError } from '../DataModel/types';

interface LintDiagnostic {
  message: string;
  line: number;
  severity: 'error' | 'warning' | 'info';
}

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

  // Lua code validation (same logic as editor linter)
  private validateLuaCode(code: string): LintDiagnostic[] {
    const diagnostics: LintDiagnostic[] = [];

    // Check for basic syntax errors
    this.checkSyntaxErrors(code, diagnostics);

    // Check for undefined variables
    this.checkUndefinedVariables(code, diagnostics);

    // Check for common Lua mistakes
    this.checkCommonMistakes(code, diagnostics);

    return diagnostics;
  }

  private checkSyntaxErrors(text: string, diagnostics: LintDiagnostic[]): void {
    const lines = text.split('\n');

    lines.forEach((line, lineIndex) => {
      const trimmedLine = line.trim();

      // Check for unmatched brackets
      const brackets = { '(': ')', '[': ']', '{': '}' };
      const stack: string[] = [];
      let inString = false;
      let stringChar = '';

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const prevChar = line[i - 1];

        // Handle string literals
        if ((char === '"' || char === "'") && prevChar !== '\\') {
          if (!inString) {
            inString = true;
            stringChar = char;
          } else if (char === stringChar) {
            inString = false;
            stringChar = '';
          }
        }

        if (!inString) {
          if (char in brackets) {
            stack.push(brackets[char as keyof typeof brackets]);
          } else if (Object.values(brackets).includes(char)) {
            const expected = stack.pop();
            if (expected !== char) {
              diagnostics.push({
                line: lineIndex + 1,
                severity: 'error',
                message: `Unmatched '${char}'. Expected '${expected || 'nothing'}'`
              });
            }
          }
        }
      }

      // Check for incomplete function definitions
      if (trimmedLine.startsWith('function') && !trimmedLine.includes('end') && !text.slice(text.indexOf(line)).includes('end')) {
        diagnostics.push({
          line: lineIndex + 1,
          severity: 'error',
          message: 'Function definition missing "end" keyword'
        });
      }

      // Check for incomplete if statements
      if (trimmedLine.match(/^if\s+.*\s+then\s*$/) && !text.slice(text.indexOf(line)).includes('end')) {
        diagnostics.push({
          line: lineIndex + 1,
          severity: 'error',
          message: 'If statement missing "end" keyword'
        });
      }

      // Check for incomplete for loops
      if (trimmedLine.match(/^for\s+.*\s+do\s*$/) && !text.slice(text.indexOf(line)).includes('end')) {
        diagnostics.push({
          line: lineIndex + 1,
          severity: 'error',
          message: 'For loop missing "end" keyword'
        });
      }
    });
  }

  private checkUndefinedVariables(text: string, diagnostics: LintDiagnostic[]): void {
    // Extract all local variables and function parameters
    const localVars = new Set<string>();
    const globalVars = new Set(['i', 'f', 'i_amt', 'f_amt', 'math', 'print', 'type', 'tonumber', 'tostring', 'pairs', 'ipairs', 'next', 'string', 'table']);

    // Standard Lua globals
    globalVars.add('_G');
    globalVars.add('_VERSION');
    globalVars.add('assert');
    globalVars.add('collectgarbage');
    globalVars.add('error');
    globalVars.add('getmetatable');
    globalVars.add('setmetatable');
    globalVars.add('rawget');
    globalVars.add('rawset');
    globalVars.add('select');
    globalVars.add('unpack');
    globalVars.add('pcall');
    globalVars.add('xpcall');

    // Add functions injected by LuaService
    globalVars.add('pow');
    globalVars.add('sin');
    globalVars.add('cos');
    globalVars.add('exp');
    globalVars.add('log');
    globalVars.add('abs');
    globalVars.add('min');
    globalVars.add('max');
    globalVars.add('pi');
    globalVars.add('random');
    globalVars.add('sqrt');
    globalVars.add('clamp');

    // Extract local variable declarations
    const localVarRegex = /local\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*)/g;
    let match;
    while ((match = localVarRegex.exec(text)) !== null) {
      const vars = match[1].split(',').map(v => v.trim());
      vars.forEach(varName => {
        if (varName && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varName)) {
          localVars.add(varName);
        }
      });
    }

    // Extract function names and parameters
    const functionParamRegex = /function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)/g;
    while ((match = functionParamRegex.exec(text)) !== null) {
      // Add function name to local variables
      if (match[1] && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(match[1])) {
        localVars.add(match[1]);
      }
      // Add function parameters
      if (match[2] && match[2].trim()) {
        const params = match[2].split(',').map(p => p.trim());
        params.forEach(param => {
          if (param && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(param)) {
            localVars.add(param);
          }
        });
      }
    }

    // Extract local function declarations: local function name()
    const localFunctionRegex = /local\s+function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
    while ((match = localFunctionRegex.exec(text)) !== null) {
      if (match[1] && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(match[1])) {
        localVars.add(match[1]);
      }
    }

    // Extract for loop variables
    const forLoopRegex = /for\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*)\s+[=in]/g;
    while ((match = forLoopRegex.exec(text)) !== null) {
      const vars = match[1].split(',').map(v => v.trim());
      vars.forEach(varName => {
        if (varName && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varName)) {
          localVars.add(varName);
        }
      });
    }

    // Check for undefined variable usage
    const lines = text.split('\n');

    lines.forEach((line, lineIndex) => {
      // Skip comments and strings
      const cleanLine = line.replace(/--.*$/, '').replace(/"[^"]*"/g, '').replace(/'[^']*'/g, '');

      let varMatch;
      const usageRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
      while ((varMatch = usageRegex.exec(cleanLine)) !== null) {
        const varName = varMatch[1];

        // Skip keywords and known patterns
        const keywords = ['function', 'local', 'if', 'then', 'else', 'elseif', 'end', 'for', 'while', 'do', 'return', 'break', 'true', 'false', 'nil', 'and', 'or', 'not', 'in'];
        if (keywords.includes(varName)) continue;

        // Skip if it's a property access (after a dot)
        const beforeVar = cleanLine.substring(0, varMatch.index);
        if (beforeVar.endsWith('.')) continue;

        // Skip if it's a function declaration
        if (cleanLine.includes(`function ${varName}`) || cleanLine.includes(`function(`) || cleanLine.includes(`local ${varName}`)) continue;

        // Check if variable is defined
        if (!localVars.has(varName) && !globalVars.has(varName)) {
          diagnostics.push({
            line: lineIndex + 1,
            severity: 'warning',
            message: `Undefined variable '${varName}'. Did you mean to declare it with 'local ${varName}'?`
          });
        }
      }
    });
  }

  private checkCommonMistakes(text: string, diagnostics: LintDiagnostic[]): void {
    const lines = text.split('\n');

    lines.forEach((line, lineIndex) => {
      const trimmedLine = line.trim();

      // Check for assignment instead of comparison (but not <=, >=, ~=, ==)
      if (trimmedLine.match(/if\s+.*[^<>=~]=(?!=)/)) {
        diagnostics.push({
          line: lineIndex + 1,
          severity: 'warning',
          message: 'Did you mean "==" for comparison instead of "=" for assignment?'
        });
      }

      // Check for missing "then" in if statements
      if (trimmedLine.match(/^if\s+.*[^then]\s*$/) && !trimmedLine.includes('then')) {
        diagnostics.push({
          line: lineIndex + 1,
          severity: 'error',
          message: 'If statement missing "then" keyword'
        });
      }

      // Check for missing "do" in loops
      if ((trimmedLine.match(/^for\s+/) || trimmedLine.match(/^while\s+/)) && !trimmedLine.includes('do')) {
        diagnostics.push({
          line: lineIndex + 1,
          severity: 'error',
          message: 'Loop missing "do" keyword'
        });
      }

      // Check for incorrect string concatenation
      if (trimmedLine.includes('+') && (trimmedLine.includes('"') || trimmedLine.includes("'"))) {
        diagnostics.push({
          line: lineIndex + 1,
          severity: 'info',
          message: 'Use ".." for string concatenation instead of "+"'
        });
      }

      // Check for deprecated math.pow usage
      if (trimmedLine.includes('math.pow(')) {
        diagnostics.push({
          line: lineIndex + 1,
          severity: 'warning',
          message: 'math.pow may not be available. Use ^ operator instead: (base)^(exp)'
        });
      }
    });
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

    // Pre-execution linting validation
    console.log('DRO: Running pre-execution validation...');
    const lintDiagnostics = this.validateLuaCode(code);
    const errors = lintDiagnostics.filter(d => d.severity === 'error');

    if (errors.length > 0) {
      console.log('DRO: Validation failed with', errors.length, 'errors');
      return {
        success: false,
        errors: errors.map(err => ({
          message: err.message,
          line: err.line,
          type: 'syntax' as const
        })),
        executionTime: performance.now() - startTime
      };
    }

    // Log warnings but continue execution
    const warnings = lintDiagnostics.filter(d => d.severity === 'warning');
    if (warnings.length > 0) {
      console.warn('DRO: Code has', warnings.length, 'warnings:', warnings.map(w => `Line ${w.line}: ${w.message}`));
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

local function clamp (value,min,max)
  return math.max(math.min(value,max),min)
end

function process()
    -- Calculate frequency for current band (logarithmic scale: 80Hz - 8kHz)
    local freq = 80 * (8000/80)^(i/(i_amt-1))
    
    -- Create a time-varying sine wave based on frequency
    local time_factor = f / f_amt  -- 0 to 1
    local wave = math.sin(2 * math.pi * time_factor * freq / 1000)
    
    -- Add some bass boost for lower frequencies
    local bass_boost = 1.0
    if i <= 2 then
        bass_boost = 1.5 + 0.5 * math.sin(time_factor * math.pi * 3)
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
    local value = 0.5 + 0.5 * math.sin(2 * math.pi * time)
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
    local freq = 80 * (8000/80)^(i/(i_amt-1))
    
    -- Create a low-pass filter response
    local cutoff = 2000 -- Hz
    local response = 1 / (1 + (freq/cutoff)^2)
    
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