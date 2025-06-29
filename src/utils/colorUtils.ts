/**
 * Convert hex color to HSL
 */
function hexToHsl(hex: string): [number, number, number] {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h: number, s: number, l: number;

    l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
            default: h = 0;
        }
        h /= 6;
    }

    return [h * 360, s * 100, l * 100];
}

/**
 * Convert HSL to hex color
 */
function hslToHex(h: number, s: number, l: number): string {
    h /= 360;
    s /= 100;
    l /= 100;

    const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };

    let r: number, g: number, b: number;

    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    const toHex = (c: number) => {
        const hex = Math.round(c * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Generate RGB values from hex color
 */
function hexToRgb(hex: string): [number, number, number] {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
}

/**
 * Generate color variants from a base color
 */
export interface ColorVariants {
    base: string;
    light: string;
    dark: string;
    rgb: string; // "r, g, b" format for CSS variables
}

export function generateColorVariants(baseColor: string): ColorVariants {
    // Ensure hex format
    const hex = baseColor.startsWith('#') ? baseColor : `#${baseColor}`;

    // Convert to HSL for manipulation
    const [h, s, l] = hexToHsl(hex);

    // Generate lighter variant (+25% lightness, capped at 95%)
    const lightL = Math.min(95, l + 25);
    const light = hslToHex(h, s, lightL);

    // Generate darker variant (-25% lightness, minimum 5%)
    const darkL = Math.max(5, l - 25);
    const dark = hslToHex(h, s, darkL);

    // Generate RGB string for CSS variables
    const [r, g, b] = hexToRgb(hex);
    const rgb = `${r}, ${g}, ${b}`;

    return {
        base: hex,
        light,
        dark,
        rgb
    };
}

/**
 * Apply theme colors to CSS variables
 */
export function applyThemeColors(accentColor: string, backgroundColor: string): void {
    const root = document.documentElement;

    // Generate accent color variants
    const accentVariants = generateColorVariants(accentColor);
    const backgroundVariants = generateColorVariants(backgroundColor);

    // Apply accent colors
    root.style.setProperty('--color-amber', accentVariants.base);
    root.style.setProperty('--color-amber-light', accentVariants.light);
    root.style.setProperty('--color-amber-dark', accentVariants.dark);
    root.style.setProperty('--color-text-primary', accentVariants.base);
    root.style.setProperty('--color-border', accentVariants.base);
    root.style.setProperty('--color-border-muted', accentVariants.dark);
    root.style.setProperty('--color-editor-cursor', accentVariants.base);
    root.style.setProperty('--color-glow-rgb', accentVariants.rgb);

    // Apply RGB variants for accent colors
    const [accentR, accentG, accentB] = hexToRgb(accentVariants.base);
    const [accentDarkR, accentDarkG, accentDarkB] = hexToRgb(accentVariants.dark);
    root.style.setProperty('--color-border-muted-rgb', `${accentDarkR}, ${accentDarkG}, ${accentDarkB}`);

    // Apply background colors
    root.style.setProperty('--color-background', backgroundVariants.base);
    root.style.setProperty('--color-editor-background', backgroundVariants.base);

    // Generate secondary and tertiary backgrounds (lighter variants)
    const [h, s, l] = hexToHsl(backgroundVariants.base);
    const secondaryL = Math.min(95, l + 8); // 8% lighter
    const tertiaryL = Math.min(95, l + 4); // 4% lighter

    const secondaryBg = hslToHex(h, s, secondaryL);
    const tertiaryBg = hslToHex(h, s, tertiaryL);

    root.style.setProperty('--color-background-secondary', secondaryBg);
    root.style.setProperty('--color-background-tertiary', tertiaryBg);
    root.style.setProperty('--color-editor-gutter', tertiaryBg);

    // Update RGB values for transparency effects
    const [bgR, bgG, bgB] = hexToRgb(backgroundVariants.base);
    root.style.setProperty('--color-background-rgb', `${bgR}, ${bgG}, ${bgB}`);

    // Generate editor selection color (accent color with low opacity background)
    const [accentHue, accentSat, accentLight] = hexToHsl(accentVariants.base);
    const selectionBg = hslToHex(accentHue, Math.max(20, accentSat - 40), Math.max(10, accentLight - 60));
    root.style.setProperty('--color-editor-selection', selectionBg);

    // Update error RGB for consistency (keep error colors but update their RGB for transparency)
    root.style.setProperty('--color-error-rgb', '255, 68, 68');

    console.log('DRO: Theme colors applied', {
        accent: accentVariants.base,
        background: backgroundVariants.base,
        selection: selectionBg
    });
} 