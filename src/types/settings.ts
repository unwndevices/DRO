export interface LayoutSettings {
    flipUI: boolean;
    biggerEditor: boolean;
}

export interface ThemeSettings {
    accentColor: string;
    backgroundColor: string;
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
        accentColor: '#C7EE1B', // Current amber color
        backgroundColor: '#181818', // Current background
    }
}; 