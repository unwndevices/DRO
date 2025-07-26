/**
 * Love2D-inspired Graphics API for Pixel Art
 * 
 * This implements a subset of the Love2D graphics API that's familiar
 * to Lua developers, adapted for pixel art and embedded displays.
 */

export const LuaDrawingHelpers = `
-- Love2D-inspired Graphics API for Pixel Art
-- Version 1.0 - Compatible with Eisei 127x127 OLED display
-- Based on Love2D API: https://love2d.org/wiki/love.graphics

local helpers = {}

-- Constants
helpers.PI = math.pi
helpers.TWO_PI = 2 * math.pi
helpers.HALF_PI = math.pi / 2

-- Color constants (0-15 grayscale)
helpers.BLACK = 0
helpers.DARK_GRAY = 3
helpers.GRAY = 7
helpers.LIGHT_GRAY = 11
helpers.WHITE = 15

-- Canvas center constants
helpers.CENTER_X = math.floor(canvas_width / 2)
helpers.CENTER_Y = math.floor(canvas_height / 2)

-- Utility Functions
function helpers.clamp(value, min_val, max_val)
    return math.max(min_val, math.min(max_val, value))
end

function helpers.lerp(a, b, t)
    return a + (b - a) * helpers.clamp(t, 0, 1)
end

function helpers.map(value, from_min, from_max, to_min, to_max)
    local t = (value - from_min) / (from_max - from_min)
    return helpers.lerp(to_min, to_max, t)
end

function helpers.smoothstep(t)
    t = helpers.clamp(t, 0, 1)
    return t * t * (3 - 2 * t)
end

-- Distance and Angle Functions
function helpers.dist(x1, y1, x2, y2)
    local dx = x2 - x1
    local dy = y2 - y1
    return math.sqrt(dx * dx + dy * dy)
end

function helpers.angle(x1, y1, x2, y2)
    return math.atan2(y2 - y1, x2 - x1)
end

function helpers.polar_to_cart(radius, angle, center_x, center_y)
    center_x = center_x or helpers.CENTER_X
    center_y = center_y or helpers.CENTER_Y
    return center_x + radius * math.cos(angle), center_y + radius * math.sin(angle)
end

-- Advanced Drawing Functions
function helpers.thick_line(x1, y1, x2, y2, thickness, value)
    value = value or helpers.WHITE
    thickness = thickness or 1
    
    if thickness <= 1 then
        line(x1, y1, x2, y2, value)
        return
    end
    
    local dx = x2 - x1
    local dy = y2 - y1
    local length = math.sqrt(dx * dx + dy * dy)
    
    if length == 0 then return end
    
    -- Perpendicular vector for thickness
    local px = -dy / length * (thickness / 2)
    local py = dx / length * (thickness / 2)
    
    -- Draw multiple parallel lines
    for i = -math.floor(thickness / 2), math.floor(thickness / 2) do
        local offset = i / math.max(1, thickness / 2)
        line(
            math.floor(x1 + px * offset),
            math.floor(y1 + py * offset),
            math.floor(x2 + px * offset),
            math.floor(y2 + py * offset),
            value
        )
    end
end

function helpers.rounded_rect(x, y, w, h, radius, value, filled)
    value = value or helpers.WHITE
    filled = filled or false
    radius = math.min(radius, math.floor(w / 2), math.floor(h / 2))
    
    if filled then
        -- Fill main rectangle
        rect(x + radius, y, w - 2 * radius, h, value, true)
        rect(x, y + radius, w, h - 2 * radius, value, true)
        
        -- Fill corners with circles
        circle(x + radius, y + radius, radius, value, true)
        circle(x + w - radius - 1, y + radius, radius, value, true)
        circle(x + radius, y + h - radius - 1, radius, value, true)
        circle(x + w - radius - 1, y + h - radius - 1, radius, value, true)
    else
        -- Draw edges
        line(x + radius, y, x + w - radius - 1, y, value) -- Top
        line(x + radius, y + h - 1, x + w - radius - 1, y + h - 1, value) -- Bottom
        line(x, y + radius, x, y + h - radius - 1, value) -- Left
        line(x + w - 1, y + radius, x + w - 1, y + h - radius - 1, value) -- Right
        
        -- Draw corner arcs (simplified as quarter circles)
        for angle = 0, helpers.HALF_PI, 0.1 do
            -- Top-left
            local tx = x + radius - math.floor(radius * math.cos(angle))
            local ty = y + radius - math.floor(radius * math.sin(angle))
            setPixel(tx, ty, value)
            
            -- Top-right
            tx = x + w - radius - 1 + math.floor(radius * math.cos(angle))
            ty = y + radius - math.floor(radius * math.sin(angle))
            setPixel(tx, ty, value)
            
            -- Bottom-left
            tx = x + radius - math.floor(radius * math.cos(angle))
            ty = y + h - radius - 1 + math.floor(radius * math.sin(angle))
            setPixel(tx, ty, value)
            
            -- Bottom-right
            tx = x + w - radius - 1 + math.floor(radius * math.cos(angle))
            ty = y + h - radius - 1 + math.floor(radius * math.sin(angle))
            setPixel(tx, ty, value)
        end
    end
end

function helpers.ellipse(cx, cy, rx, ry, value, filled)
    value = value or helpers.WHITE
    filled = filled or false
    
    if filled then
        for y = -ry, ry do
            for x = -rx, rx do
                if (x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1 then
                    setPixel(cx + x, cy + y, value)
                end
            end
        end
    else
        -- Draw ellipse outline using parametric equations
        local step = 0.1
        for t = 0, helpers.TWO_PI, step do
            local x = math.floor(cx + rx * math.cos(t))
            local y = math.floor(cy + ry * math.sin(t))
            setPixel(x, y, value)
        end
    end
end

function helpers.triangle(x1, y1, x2, y2, x3, y3, value, filled)
    value = value or helpers.WHITE
    filled = filled or false
    
    if filled then
        -- Simple scanline fill algorithm
        local min_y = math.max(0, math.min(y1, y2, y3))
        local max_y = math.min(canvas_height - 1, math.max(y1, y2, y3))
        
        for y = min_y, max_y do
            local intersections = {}
            
            -- Check intersections with each edge
            local function add_intersection(ax, ay, bx, by)
                if (ay <= y and by > y) or (by <= y and ay > y) then
                    local x = ax + (y - ay) * (bx - ax) / (by - ay)
                    table.insert(intersections, x)
                end
            end
            
            add_intersection(x1, y1, x2, y2)
            add_intersection(x2, y2, x3, y3)
            add_intersection(x3, y3, x1, y1)
            
            table.sort(intersections)
            
            -- Fill between pairs of intersections
            for i = 1, #intersections, 2 do
                if intersections[i + 1] then
                    local start_x = math.max(0, math.floor(intersections[i]))
                    local end_x = math.min(canvas_width - 1, math.floor(intersections[i + 1]))
                    for x = start_x, end_x do
                        setPixel(x, y, value)
                    end
                end
            end
        end
    else
        -- Draw outline
        line(x1, y1, x2, y2, value)
        line(x2, y2, x3, y3, value)
        line(x3, y3, x1, y1, value)
    end
end

function helpers.polygon(points, value, filled)
    value = value or helpers.WHITE
    filled = filled or false
    
    if #points < 6 then return end -- Need at least 3 points (x,y pairs)
    
    if filled then
        -- Find bounding box
        local min_x, max_x = canvas_width, 0
        local min_y, max_y = canvas_height, 0
        
        for i = 1, #points, 2 do
            min_x = math.min(min_x, points[i])
            max_x = math.max(max_x, points[i])
            min_y = math.min(min_y, points[i + 1])
            max_y = math.max(max_y, points[i + 1])
        end
        
        -- Scanline fill
        for y = math.max(0, min_y), math.min(canvas_height - 1, max_y) do
            local intersections = {}
            
            -- Check intersections with each edge
            for i = 1, #points - 2, 2 do
                local x1, y1 = points[i], points[i + 1]
                local x2, y2 = points[i + 2] or points[1], points[i + 3] or points[2]
                
                if (y1 <= y and y2 > y) or (y2 <= y and y1 > y) then
                    local x = x1 + (y - y1) * (x2 - x1) / (y2 - y1)
                    table.insert(intersections, x)
                end
            end
            
            table.sort(intersections)
            
            -- Fill between pairs
            for i = 1, #intersections, 2 do
                if intersections[i + 1] then
                    local start_x = math.max(0, math.floor(intersections[i]))
                    local end_x = math.min(canvas_width - 1, math.floor(intersections[i + 1]))
                    for x = start_x, end_x do
                        setPixel(x, y, value)
                    end
                end
            end
        end
    else
        -- Draw outline
        for i = 1, #points - 2, 2 do
            local x1, y1 = points[i], points[i + 1]
            local x2, y2 = points[i + 2] or points[1], points[i + 3] or points[2]
            line(x1, y1, x2, y2, value)
        end
    end
end

-- Pattern and Texture Functions
function helpers.checkerboard(x, y, size, value1, value2)
    value1 = value1 or helpers.BLACK
    value2 = value2 or helpers.WHITE
    size = size or 8
    
    local grid_x = math.floor(x / size)
    local grid_y = math.floor(y / size)
    return (grid_x + grid_y) % 2 == 0 and value1 or value2
end

function helpers.perlin_noise(x, y, scale, octaves, persistence)
    scale = scale or 0.1
    octaves = octaves or 4
    persistence = persistence or 0.5
    
    local value = 0
    local amplitude = 1
    local frequency = scale
    local max_value = 0
    
    for i = 1, octaves do
        value = value + noise(x * frequency, y * frequency) * amplitude
        max_value = max_value + amplitude
        amplitude = amplitude * persistence
        frequency = frequency * 2
    end
    
    return math.floor((value / max_value) * 15)
end

function helpers.mandelbrot(px, py, max_iter, zoom, offset_x, offset_y)
    max_iter = max_iter or 50
    zoom = zoom or 1
    offset_x = offset_x or 0
    offset_y = offset_y or 0
    
    local x = (px - helpers.CENTER_X) / (canvas_width / 4) / zoom + offset_x
    local y = (py - helpers.CENTER_Y) / (canvas_height / 4) / zoom + offset_y
    
    local zx, zy = 0, 0
    local iter = 0
    
    while zx * zx + zy * zy < 4 and iter < max_iter do
        local temp = zx * zx - zy * zy + x
        zy = 2 * zx * zy + y
        zx = temp
        iter = iter + 1
    end
    
    return math.floor((iter / max_iter) * 15)
end

-- Animation Helpers
function helpers.wave(t, frequency, amplitude, phase)
    frequency = frequency or 1
    amplitude = amplitude or 1
    phase = phase or 0
    return amplitude * math.sin(frequency * t + phase)
end

function helpers.pulse(t, frequency, duty_cycle)
    frequency = frequency or 1
    duty_cycle = duty_cycle or 0.5
    local cycle = (t * frequency) % 1
    return cycle < duty_cycle and 1 or 0
end

function helpers.ease_in_out(t)
    return t < 0.5 and 2 * t * t or 1 - 2 * (1 - t) * (1 - t)
end

-- Text and Font Helpers (Simple 3x5 font)
helpers.font_3x5 = {
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
    ['.'] = {'000', '000', '000', '000', '100'},
    ['-'] = {'000', '000', '111', '000', '000'},
}

function helpers.draw_char(char, x, y, value, scale)
    value = value or helpers.WHITE
    scale = scale or 1
    local pattern = helpers.font_3x5[char]
    
    if not pattern then return end
    
    for row = 1, 5 do
        for col = 1, 3 do
            if pattern[row]:sub(col, col) == '1' then
                if scale == 1 then
                    setPixel(x + col - 1, y + row - 1, value)
                else
                    rect(x + (col - 1) * scale, y + (row - 1) * scale, scale, scale, value, true)
                end
            end
        end
    end
end

function helpers.draw_text(text, x, y, value, scale, spacing)
    value = value or helpers.WHITE
    scale = scale or 1
    spacing = spacing or 1
    
    local offset_x = 0
    for i = 1, #text do
        local char = text:sub(i, i)
        helpers.draw_char(char, x + offset_x, y, value, scale)
        offset_x = offset_x + (3 * scale) + spacing
    end
end

-- Return the helpers table so it can be used
return helpers
`;

/**
 * Initialize drawing helpers in Lua environment
 */
export function initializeLuaDrawingHelpers(lua: any): void {
  lua.doString(`
    -- Load drawing helpers library
    local helpers = (function()
      ${LuaDrawingHelpers}
    end)()
    
    -- Make helper functions globally available
    for k, v in pairs(helpers) do
      _G[k] = v
    end
    
    -- Also keep the helpers table available
    _G.helpers = helpers
  `);
}