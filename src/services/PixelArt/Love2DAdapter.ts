/**
 * Simple Love2D-style API for Pixel Art
 * 
 * Just creates aliases without the "love." prefix while keeping "graphics."
 * Uses actual Love2D function names for familiarity.
 */

export const Love2DGraphicsAPI = `
-- Simple Love2D-style API - Remove "love." prefix only
-- Users can call graphics.setColor() instead of love.graphics.setColor()

-- Ensure frame variable is accessible (it should be set externally)
f = f or 0

-- Store primitive functions before we create the graphics table
local _circle = circle
local _rect = rect
local _line = line
local _setPixel = setPixel
local _clearCanvas = clearCanvas

-- Create graphics table that uses the existing primitive functions
graphics = {
    -- Current drawing state
    _current_color = 15,  -- White (0-15 grayscale)
    _line_width = 1,
    
    -- Color management (Love2D uses 0-1, we use 0-15)
    setColor = function(gray)
        if gray then
            graphics._current_color = math.floor(gray * 15)
        end
        graphics._current_color = math.max(0, math.min(15, graphics._current_color))
    end,
    
    getColor = function()
        return graphics._current_color / 15
    end,
    
    -- Line drawing
    setLineWidth = function(width)
        graphics._line_width = math.max(1, math.floor(width))
    end,
    
    getLineWidth = function()
        return graphics._line_width
    end,
    
    line = function(x1, y1, x2, y2)
        _line(math.floor(x1), math.floor(y1), math.floor(x2), math.floor(y2), graphics._current_color)
    end,
    
    -- Rectangle drawing
    rectangle = function(mode, x, y, width, height)
        local filled = (mode == "fill")
        _rect(math.floor(x), math.floor(y), math.floor(width), math.floor(height), graphics._current_color, filled)
    end,
    
    -- Circle drawing
    circle = function(mode, x, y, radius)
        local filled = (mode == "fill")
        _circle(math.floor(x), math.floor(y), math.floor(radius), graphics._current_color, filled)
    end,
    
    -- Point drawing
    points = function(...)
        local coords = {...}
        for i = 1, #coords, 2 do
            if coords[i + 1] then
                _setPixel(math.floor(coords[i]), math.floor(coords[i + 1]), graphics._current_color)
            end
        end
    end,
    
    -- Canvas management
    clear = function(gray)
        local clear_color = gray and math.floor(gray * 15) or 0
        _clearCanvas(clear_color)
    end,
    
    -- Utility functions
    getDimensions = function()
        return canvas_width, canvas_height
    end,
    
    getWidth = function()
        return canvas_width
    end,
    
    getHeight = function()
        return canvas_height
    end,
    
    -- Simple text printing using setPixel
    print = function(text, x, y)
        -- Very basic 3x5 font
        local font = {
            ['0'] = {'111', '101', '101', '101', '111'},
            ['1'] = {'010', '110', '010', '010', '111'},
            ['2'] = {'111', '001', '111', '100', '111'},
            ['3'] = {'111', '001', '111', '001', '111'},
            ['4'] = {'101', '101', '111', '001', '001'},
            ['5'] = {'111', '100', '111', '001', '111'},
            ['6'] = {'111', '100', '111', '101', '111'},
            ['7'] = {'111', '001', '001', '001', '001'},
            ['8'] = {'111', '101', '111', '101', '111'},
            ['9'] = {'111', '101', '111', '001', '111'},
            [' '] = {'000', '000', '000', '000', '000'},
        }
        
        local char_x = math.floor(x)
        local char_y = math.floor(y)
        
        for i = 1, #text do
            local char = text:sub(i, i)
            local pattern = font[char]
            
            if pattern then
                for row = 1, 5 do
                    for col = 1, 3 do
                        if pattern[row]:sub(col, col) == '1' then
                            _setPixel(char_x + col - 1, char_y + row - 1, graphics._current_color)
                        end
                    end
                end
            end
            
            char_x = char_x + 4  -- Move to next character position
        end
    end
}

-- Also create the love table for full compatibility if someone wants it
love = {
    graphics = graphics
}

-- Make the graphics table global
_G.graphics = graphics
_G.love = love
`;

/**
 * Initialize Love2D-compatible graphics API
 */
export function initializeLove2DAPI(lua: any): void {
  lua.doString(Love2DGraphicsAPI);
}