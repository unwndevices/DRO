import { luaService } from './services/LuaEngine/LuaService';

export async function debugLuaGlobals() {
  console.log('=== DEBUG: Testing Lua global variables in actual LuaService ===');
  
  // Test script that explicitly shows the f variable value
  const testScript = `
    function process()
      -- Debug what we actually see in the process function
      local f_type = type(f)
      local f_value = tostring(f)
      
      print("DEBUG process(): f type=" .. f_type .. ", value=" .. f_value)
      
      if f_type == "nil" then
        print("ERROR: f is nil!")
        return 0
      elseif f_type ~= "number" then
        print("ERROR: f is not a number, it's " .. f_type)
        return 0
      end
      
      -- Simple animation based on f
      local normalized = f / f_amt
      print("DEBUG: f=" .. f .. ", f_amt=" .. f_amt .. ", normalized=" .. normalized)
      
      return normalized * 0.5 + 0.25  -- Range 0.25 to 0.75
    end
  `;
  
  try {
    console.log('Executing debug script...');
    const result = await luaService.executeScript(testScript, 5, 3);
    
    if (result.success && result.datum) {
      console.log('SUCCESS: Script executed');
      console.log('Frames generated:', result.datum.frameCount);
      console.log('Bands per frame:', result.datum.bandCount);
      
      // Check first few frames to see if animation is working
      for (let f = 0; f < Math.min(3, result.datum.frames.length); f++) {
        const frame = result.datum.frames[f];
        console.log(`Frame ${f} first band value:`, frame.bands[0]);
      }
      
      return result.datum;
    } else {
      console.error('FAILED: Script execution failed');
      console.error('Errors:', result.errors);
      return null;
    }
  } catch (error) {
    console.error('ERROR: Exception during execution:', error);
    return null;
  }
}

// Export for console testing
(window as any).debugLuaGlobals = debugLuaGlobals;