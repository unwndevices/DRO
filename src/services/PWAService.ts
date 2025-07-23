// PWA Service - Handles service worker registration and PWA features
export interface PWAInstallPrompt {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PWAStatus {
    isInstalled: boolean;
    isOnline: boolean;
    canInstall: boolean;
    updateAvailable: boolean;
}

class PWAService {
    private installPrompt: PWAInstallPrompt | null = null;
    private registration: ServiceWorkerRegistration | null = null;
    private statusCallbacks: ((status: PWAStatus) => void)[] = [];
    private status: PWAStatus = {
        isInstalled: false,
        isOnline: navigator.onLine,
        canInstall: false,
        updateAvailable: false
    };

    constructor() {
        this.setupEventListeners();
        this.checkInstallStatus();
    }

    // Initialize PWA service
    async initialize(): Promise<void> {
        console.log('DRO PWA: Initializing PWA service');

        if ('serviceWorker' in navigator) {
            try {
                // Only register in production or when explicitly enabled
                if (import.meta.env.PROD) {
                    await this.registerServiceWorker();
                    console.log('DRO PWA: Service worker registered successfully');
                } else {
                    console.log('DRO PWA: Service worker disabled in development');
                }
            } catch (error) {
                console.error('DRO PWA: Service worker registration failed:', error);
            }
        } else {
            console.warn('DRO PWA: Service workers not supported');
        }
    }

    // Register service worker
    private async registerServiceWorker(): Promise<void> {
        try {
            // Use Vite PWA plugin service worker
            const swUrl = import.meta.env.DEV ? '/dev-sw.js?dev-sw' : '/sw.js';

            this.registration = await navigator.serviceWorker.register(swUrl, {
                scope: '/',
                type: import.meta.env.DEV ? 'module' : 'classic'
            });

            console.log('DRO PWA: Service worker registered with scope:', this.registration.scope);

            // Listen for updates
            this.registration.addEventListener('updatefound', () => {
                console.log('DRO PWA: Service worker update found');
                this.handleServiceWorkerUpdate();
            });

            // Check for existing updates
            if (this.registration.waiting) {
                console.log('DRO PWA: Service worker update waiting');
                this.status.updateAvailable = true;
                this.notifyStatusChange();
            }

        } catch (error) {
            console.error('DRO PWA: Service worker registration failed:', error);
            throw error;
        }
    }

    // Handle service worker updates
    private handleServiceWorkerUpdate(): void {
        if (!this.registration) return;

        const newWorker = this.registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('DRO PWA: New service worker installed, update available');
                this.status.updateAvailable = true;
                this.notifyStatusChange();
            }
        });
    }

    // Setup event listeners
    private setupEventListeners(): void {
        // Install prompt event
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            console.log('DRO PWA: Install prompt available');
            this.installPrompt = e as any;
            this.status.canInstall = true;
            this.notifyStatusChange();
        });

        // App installed event
        window.addEventListener('appinstalled', () => {
            console.log('DRO PWA: App installed successfully');
            this.installPrompt = null;
            this.status.isInstalled = true;
            this.status.canInstall = false;
            this.notifyStatusChange();
        });

        // Online/offline events
        window.addEventListener('online', () => {
            console.log('DRO PWA: App came online');
            this.status.isOnline = true;
            this.notifyStatusChange();
        });

        window.addEventListener('offline', () => {
            console.log('DRO PWA: App went offline');
            this.status.isOnline = false;
            this.notifyStatusChange();
        });

        // Service worker controller change
        navigator.serviceWorker?.addEventListener('controllerchange', () => {
            console.log('DRO PWA: Service worker controller changed, reloading');
            window.location.reload();
        });
    }

    // Check if app is installed
    private checkInstallStatus(): void {
        // Check if running as PWA
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
        const isMinimalUI = window.matchMedia('(display-mode: minimal-ui)').matches;

        // Check iOS Safari PWA
        const isIOSPWA = (window.navigator as any).standalone === true;

        this.status.isInstalled = isStandalone || isFullscreen || isMinimalUI || isIOSPWA;

        if (this.status.isInstalled) {
            console.log('DRO PWA: App is running as installed PWA');
        }
    }

    // Trigger install prompt
    async showInstallPrompt(): Promise<{ outcome: 'accepted' | 'dismissed' } | null> {
        if (!this.installPrompt) {
            console.warn('DRO PWA: Install prompt not available');
            return null;
        }

        try {
            console.log('DRO PWA: Showing install prompt');
            await this.installPrompt.prompt();
            const result = await this.installPrompt.userChoice;

            console.log('DRO PWA: Install prompt result:', result.outcome);

            if (result.outcome === 'accepted') {
                this.installPrompt = null;
                this.status.canInstall = false;
                this.notifyStatusChange();
            }

            return result;
        } catch (error) {
            console.error('DRO PWA: Install prompt failed:', error);
            return null;
        }
    }

    // Update service worker
    async updateServiceWorker(): Promise<void> {
        if (!this.registration || !this.registration.waiting) {
            console.warn('DRO PWA: No service worker update available');
            return;
        }

        console.log('DRO PWA: Updating service worker');

        // Send skip waiting message
        this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });

        // Immediately update status to prevent multiple prompts
        this.status.updateAvailable = false;
        this.notifyStatusChange();

        // Wait for controller change before resolving
        return new Promise((resolve) => {
            const handleControllerChange = () => {
                console.log('DRO PWA: Service worker updated, controller changed');
                navigator.serviceWorker?.removeEventListener('controllerchange', handleControllerChange);
                resolve();
            };

            navigator.serviceWorker?.addEventListener('controllerchange', handleControllerChange);

            // Fallback timeout in case controllerchange doesn't fire
            setTimeout(() => {
                navigator.serviceWorker?.removeEventListener('controllerchange', handleControllerChange);
                resolve();
            }, 5000);
        });
    }

    // Get PWA status
    getStatus(): PWAStatus {
        return { ...this.status };
    }

    // Subscribe to status changes
    onStatusChange(callback: (status: PWAStatus) => void): () => void {
        this.statusCallbacks.push(callback);

        // Return unsubscribe function
        return () => {
            const index = this.statusCallbacks.indexOf(callback);
            if (index > -1) {
                this.statusCallbacks.splice(index, 1);
            }
        };
    }

    // Notify status change
    private notifyStatusChange(): void {
        this.statusCallbacks.forEach(callback => {
            try {
                callback(this.status);
            } catch (error) {
                console.error('DRO PWA: Status callback error:', error);
            }
        });
    }

    // Clear all caches
    async clearCaches(): Promise<void> {
        if (!this.registration || !this.registration.active) {
            console.warn('DRO PWA: No active service worker registration');
            return;
        }

        console.log('DRO PWA: Clearing all caches');

        return new Promise((resolve, reject) => {
            const messageChannel = new MessageChannel();

            messageChannel.port1.onmessage = (event) => {
                if (event.data.success) {
                    console.log('DRO PWA: Caches cleared successfully');
                    resolve();
                } else {
                    console.error('DRO PWA: Failed to clear caches:', event.data.error);
                    reject(new Error(event.data.error));
                }
            };

            // TypeScript now knows this.registration.active is not null
            this.registration!.active!.postMessage(
                { type: 'CLEAR_CACHE' },
                [messageChannel.port2]
            );
        });
    }

    // Get cache usage
    async getCacheUsage(): Promise<{ used: number; quota: number } | null> {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            try {
                const estimate = await navigator.storage.estimate();
                return {
                    used: estimate.usage || 0,
                    quota: estimate.quota || 0
                };
            } catch (error) {
                console.error('DRO PWA: Failed to get cache usage:', error);
            }
        }
        return null;
    }

    // Check if offline
    isOffline(): boolean {
        return !this.status.isOnline;
    }

    // Check if installed
    isInstalled(): boolean {
        return this.status.isInstalled;
    }

    // Check if can install
    canInstall(): boolean {
        return this.status.canInstall;
    }

    // Check if update available
    hasUpdateAvailable(): boolean {
        return this.status.updateAvailable;
    }
}

// Export singleton instance
export const pwaService = new PWAService(); 