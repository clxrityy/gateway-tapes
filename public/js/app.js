// Main application initialization and coordination
class GatewayTapesApp {
  constructor() {
    this.audioPlayer = null;
    this.fileManager = null;
    this.currentTheme = "light";
  }

  async initializeApp() {
    console.log("🎵 Initializing Gateway Tapes...");

    // Wait for DOM to be ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.setupApp());
    } else {
      this.setupApp();
    }
  }

  setupApp() {
    // Initialize theme first to determine correct icons
    this.initializeTheme();

    // Initialize icons after theme is set
    this.initializeIcons();

    // Initialize audio player
    this.audioPlayer = new AudioPlayer();

    // Initialize file manager
    this.fileManager = new FileManager(this.audioPlayer);

    // Setup global event handlers
    this.setupGlobalEvents();

    // Setup service worker for PWA capabilities (optional)
    this.setupServiceWorker();

    console.log("✅ Gateway Tapes initialized successfully");
  }

  initializeIcons() {
    // Initialize all static icons in the HTML
    const iconElements = {
      logoIcon: "music",
      searchIcon: "search",
      themeIcon: this.currentTheme === "dark" ? "sun" : "moon",
      clearSearchIcon: "close",
      loadingIcon: "loading",
      errorIcon: "warning",
      emptyIcon: "music",
      listViewIcon: "list",
      gridViewIcon: "grid",
      backIcon: "back",
      homeIcon: "home",
      previousIcon: "previous",
      playPauseIcon: "play",
      nextIcon: "next",
      muteIcon: "volumeUp",
      closePlaylistIcon: "close",
    };

    // Set icons for each element
    Object.entries(iconElements).forEach(([elementId, iconName]) => {
      const element = document.getElementById(elementId);
      if (element) {
        element.innerHTML = Icons.get(iconName, "icon", 20);
      }
    });
  }

  initializeTheme() {
    // Load saved theme preference
    const savedTheme = localStorage.getItem("gatewayTapesTheme");
    if (savedTheme && ["light", "dark"].includes(savedTheme)) {
      this.currentTheme = savedTheme;
    } else if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      // Auto-detect system preference
      this.currentTheme = "dark";
    }

    this.applyTheme();
    this.setupThemeToggle();

    // Listen for system theme changes
    if (window.matchMedia) {
      window
        .matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", (e) => {
          if (!localStorage.getItem("gatewayTapesTheme")) {
            this.currentTheme = e.matches ? "dark" : "light";
            this.applyTheme();
          }
        });
    }
  }

  applyTheme() {
    document.documentElement.setAttribute("data-theme", this.currentTheme);

    // Update theme toggle icon
    const themeIcon = document.getElementById("themeIcon");
    if (themeIcon) {
      const iconName = this.currentTheme === "dark" ? "sun" : "moon";
      themeIcon.innerHTML = Icons.get(iconName, "icon", 20);
    }

    // Save preference
    localStorage.setItem("gatewayTapesTheme", this.currentTheme);
  }

  setupThemeToggle() {
    const themeToggle = document.getElementById("themeToggle");
    if (themeToggle) {
      themeToggle.addEventListener("click", () => {
        this.currentTheme = this.currentTheme === "light" ? "dark" : "light";
        this.applyTheme();
        // Update theme icon
        const themeIcon = document.getElementById("themeIcon");
        if (themeIcon) {
          themeIcon.innerHTML = Icons.get(
            this.currentTheme === "dark" ? "sun" : "moon",
            "icon",
            20
          );
        }
      });
    }
  }

  setupGlobalEvents() {
    // Handle online/offline status
    window.addEventListener("online", () => {
      console.log("✅ Connection restored");
      this.showNotification("Connection restored", "success");
    });

    window.addEventListener("offline", () => {
      console.log("⚠️ Connection lost");
      this.showNotification(
        "Connection lost. Some features may not work.",
        "warning"
      );
    });

    // Handle visibility changes (for pausing when tab is hidden)
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        // Page is hidden, could pause non-essential activities
        console.log("Page hidden");
      } else {
        // Page is visible again
        console.log("Page visible");
      }
    });

    // Handle beforeunload for saving state
    window.addEventListener("beforeunload", () => {
      this.saveAppState();
    });

    // Global error handler
    window.addEventListener("error", (event) => {
      console.error("Global error:", event.error);
      this.showNotification("An unexpected error occurred", "error");
    });

    // Handle unhandled promise rejections
    window.addEventListener("unhandledrejection", (event) => {
      console.error("Unhandled promise rejection:", event.reason);
      this.showNotification("An unexpected error occurred", "error");
    });
  }

  setupServiceWorker() {
    // Register service worker for PWA capabilities
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", async () => {
        try {
          // Note: You would need to create a service worker file
          // const registration = await navigator.serviceWorker.register('/sw.js');
          // console.log('ServiceWorker registered successfully:', registration.scope);
        } catch (error) {
          console.log("ServiceWorker registration failed:", error);
        }
      });
    }
  }

  saveAppState() {
    // Save current state before page unload
    const state = {
      currentTrack: this.audioPlayer.currentTrack,
      currentTime: this.audioPlayer.audio.currentTime,
      volume: this.audioPlayer.volume,
      muted: this.audioPlayer.isMuted,
      theme: this.currentTheme,
      timestamp: Date.now(),
    };

    localStorage.setItem("gatewayTapesState", JSON.stringify(state));
  }

  restoreAppState() {
    // Restore state when app loads
    try {
      const savedState = localStorage.getItem("gatewayTapesState");
      if (!savedState) return;

      const state = JSON.parse(savedState);

      // Only restore if state is recent (within 24 hours)
      const age = Date.now() - state.timestamp;
      if (age > 24 * 60 * 60 * 1000) return;

      // Restore theme
      if (state.theme) {
        this.currentTheme = state.theme;
        this.applyTheme();
      }

      // Restore audio settings
      if (state.volume !== undefined) {
        this.audioPlayer.volume = state.volume;
        this.audioPlayer.audio.volume = state.volume;
        this.audioPlayer.volumeSlider.value = state.volume * 100;
      }

      if (state.muted !== undefined) {
        this.audioPlayer.isMuted = state.muted;
        this.audioPlayer.audio.muted = state.muted;
      }

      // Note: Restoring the current track and position would require
      // re-loading the file, which might not be desirable
    } catch (error) {
      console.error("Error restoring app state:", error);
    }
  }

  showNotification(message, type = "info") {
    // Create notification element
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;

    // Style the notification
    const colors = {
      success: "var(--success-color)",
      error: "var(--error-color)",
      warning: "var(--warning-color)",
      info: "var(--primary-color)",
    };

    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: ${colors[type] || colors.info};
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 0.5rem;
      box-shadow: var(--shadow-lg);
      z-index: 1000;
      max-width: 400px;
      animation: slideInRight 0.3s ease;
      font-weight: 500;
    `;

    notification.textContent = message;

    // Add close button
    const closeBtn = document.createElement("button");
    closeBtn.innerHTML = "✕";
    closeBtn.style.cssText = `
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      float: right;
      margin-left: 1rem;
      font-size: 1rem;
      opacity: 0.8;
    `;
    closeBtn.addEventListener("click", () =>
      this.removeNotification(notification)
    );

    notification.appendChild(closeBtn);
    document.body.appendChild(notification);

    // Auto-remove after delay
    setTimeout(
      () => {
        this.removeNotification(notification);
      },
      type === "error" ? 6000 : 4000
    );
  }

  removeNotification(notification) {
    if (notification?.parentNode) {
      notification.style.animation = "slideOutRight 0.3s ease";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }
  }

  // Public API methods
  refreshFiles() {
    this.fileManager.refreshFiles();
  }

  togglePlayback() {
    this.audioPlayer.togglePlayPause();
  }

  setVolume(volume) {
    this.audioPlayer.volume = Math.max(0, Math.min(1, volume));
    this.audioPlayer.audio.volume = this.audioPlayer.volume;
    this.audioPlayer.volumeSlider.value = this.audioPlayer.volume * 100;
  }

  getCurrentTrack() {
    return this.audioPlayer.currentTrack;
  }

  getPlaylist() {
    return this.fileManager.getCurrentPlaylist();
  }
}

// CSS animations for notifications
const notificationStyles = document.createElement("style");
notificationStyles.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
  
  .notification:hover {
    transform: translateX(-5px);
    transition: transform 0.2s ease;
  }
`;
document.head.appendChild(notificationStyles);

// Initialize the application
const app = new GatewayTapesApp();
app.initializeApp();
window.GatewayTapesApp = app;

// PWA install prompt handling
let deferredPrompt;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;

  // Show install button or notification
  app.showNotification(
    "Add Gateway Tapes to your home screen for the best experience!",
    "info"
  );
});

// Handle successful PWA installation
window.addEventListener("appinstalled", (evt) => {
  console.log("PWA was installed");
  app.showNotification("Gateway Tapes installed successfully!", "success");
});

console.log("🎵 Gateway Tapes loaded and ready!");
