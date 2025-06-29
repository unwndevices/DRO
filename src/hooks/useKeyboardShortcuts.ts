import { useEffect } from 'react';

interface KeyboardShortcutsOptions {
    onToggleBiggerEditor?: () => void;
    onEscape?: () => void;
    onSave?: () => void;
    onLoad?: () => void;
    onExecute?: () => void;
}

export const useKeyboardShortcuts = (options: KeyboardShortcutsOptions) => {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Don't trigger shortcuts when typing in input fields (except for execution)
            const target = event.target as HTMLElement;
            const isInputField = target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.contentEditable === 'true';

            // Check if we're in CodeMirror editor
            // const isInCodeMirror = target.closest('.cm-editor') !== null;

            // Ctrl+Return / Cmd+Return - Execute code (works globally and in editor)
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                event.preventDefault();
                options.onExecute?.();
                console.log('DRO: Global Ctrl+Return executed');
                return;
            }

            // F key - Toggle bigger editor (only when not in input field)
            if (event.key === 'f' && !event.ctrlKey && !event.metaKey && !event.altKey && !isInputField) {
                event.preventDefault();
                options.onToggleBiggerEditor?.();
                return;
            }

            // Escape key - Close modals/dialogs
            if (event.key === 'Escape') {
                event.preventDefault();
                options.onEscape?.();
                return;
            }

            // Ctrl+S / Cmd+S - Save
            if ((event.ctrlKey || event.metaKey) && event.key === 's') {
                event.preventDefault();
                options.onSave?.();
                return;
            }

            // Ctrl+O / Cmd+O - Load
            if ((event.ctrlKey || event.metaKey) && event.key === 'o') {
                event.preventDefault();
                options.onLoad?.();
                return;
            }
        };

        // Add event listener
        document.addEventListener('keydown', handleKeyDown);

        // Cleanup
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [options]);
}; 