export interface LayoutSettings {
    flipUI: boolean;
    biggerEditor: boolean;
}

export type ThemeName = 'rose-pine' | 'catppuccin' | 'gruvbox' | 'nord' | 'rose-pine-dawn' | 'jellyfish' | 'aura' | 'dobri' | 'cute-pink-light';

export interface ThemeSettings {
    name: ThemeName;
}

export interface Settings {
    layout: LayoutSettings;
    theme: ThemeSettings;
}

export interface SettingsContextType {
    settings: Settings;
    updateSettings: (newSettings: Partial<Settings>) => void;
    resetSettings: () => void;
}

export const defaultSettings: Settings = {
    layout: {
        flipUI: false,
        biggerEditor: false,
    },
    theme: {
        name: 'gruvbox',
    }
}; 