class AudioPlayer {
  constructor() {
    this.audio = document.getElementById("audioElement");
    this.isPlaying = false;
    this.currentTrack = null;
    this.playlist = [];
    this.currentIndex = -1;
    this.volume = 0.5;
    this.isMuted = false;

    this.initializeElements();
    this.bindEvents();
    this.loadSettings();
  }

  initializeElements() {
    // Player elements
    this.playerContainer = document.getElementById("audioPlayer");
    this.playPauseBtn = document.getElementById("playPause");
    this.previousBtn = document.getElementById("previousTrack");
    this.nextBtn = document.getElementById("nextTrack");
    this.muteBtn = document.getElementById("muteButton");

    // Progress elements
    this.progressSlider = document.getElementById("progressSlider");
    this.progressFill = document.getElementById("progressFill");
    this.currentTimeDisplay = document.getElementById("currentTime");
    this.totalTimeDisplay = document.getElementById("totalTime");

    // Volume elements
    this.volumeSlider = document.getElementById("volumeSlider");

    // Track info elements
    this.trackTitle = document.getElementById("trackTitle");
    this.trackMeta = document.getElementById("trackMeta");

    // Set initial volume
    this.audio.volume = this.volume;
    this.volumeSlider.value = this.volume * 100;

    // Initialize control icons
    this.initializeControlIcons();
  }

  initializeControlIcons() {
    // Initialize static player control icons
    const previousIcon = document.getElementById("previousIcon");
    const nextIcon = document.getElementById("nextIcon");
    const muteIcon = document.getElementById("muteIcon");

    if (previousIcon)
      previousIcon.innerHTML = Icons.get("previous", "icon", 20);
    if (nextIcon) nextIcon.innerHTML = Icons.get("next", "icon", 20);
    if (muteIcon) muteIcon.innerHTML = Icons.get("volumeUp", "icon", 20);

    // Initialize play/pause icon
    this.updatePlaybackState();
  }

  bindEvents() {
    // Audio events
    this.audio.addEventListener("loadstart", () => this.onLoadStart());
    this.audio.addEventListener("loadedmetadata", () =>
      this.onMetadataLoaded()
    );
    this.audio.addEventListener("timeupdate", () => this.onTimeUpdate());
    this.audio.addEventListener("ended", () => this.onTrackEnded());
    this.audio.addEventListener("error", (e) => this.onError(e));
    this.audio.addEventListener("canplay", () => this.onCanPlay());
    this.audio.addEventListener("waiting", () => this.onWaiting());
    this.audio.addEventListener("playing", () => this.onPlaying());
    this.audio.addEventListener("pause", () => this.onPause());

    // Control events
    this.playPauseBtn.addEventListener("click", () => this.togglePlayPause());
    this.previousBtn.addEventListener("click", () => this.previousTrack());
    this.nextBtn.addEventListener("click", () => this.nextTrack());
    this.muteBtn.addEventListener("click", () => this.toggleMute());

    // Progress events
    this.progressSlider.addEventListener("input", () =>
      this.onProgressChange()
    );
    this.progressSlider.addEventListener("change", () =>
      this.onProgressChange()
    );

    // Volume events
    this.volumeSlider.addEventListener("input", () => this.onVolumeChange());

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => this.handleKeyboard(e));
  }

  loadSettings() {
    // Load saved volume
    const savedVolume = localStorage.getItem("audioPlayerVolume");
    if (savedVolume) {
      this.volume = parseFloat(savedVolume);
      this.audio.volume = this.volume;
      this.volumeSlider.value = this.volume * 100;
    }

    // Load mute state
    const savedMuted = localStorage.getItem("audioPlayerMuted");
    if (savedMuted === "true") {
      this.toggleMute();
    }
  }

  saveSettings() {
    localStorage.setItem("audioPlayerVolume", this.volume.toString());
    localStorage.setItem("audioPlayerMuted", this.isMuted.toString());
  }

  async loadTrack(file, playlist = null, playlistIndex = -1) {
    try {
      console.log("Loading track:", file.name, "with key:", file.key);

      // Get stream URL from server (Vercel dynamic route format)
      const response = await fetch(
        `/api/stream?key=${encodeURIComponent(file.key)}`
      );
      const data = await response.json();

      console.log("Stream API response:", data);

      if (!data.success) {
        throw new Error(data.error || "Failed to get stream URL");
      }

      // Set current track info
      this.currentTrack = {
        ...file,
        streamUrl: data.streamUrl,
      };

      console.log(
        "Setting audio source to:",
        data.streamUrl.substring(0, 100) + "..."
      );

      // Set playlist if provided
      if (playlist) {
        this.playlist = playlist;
        this.currentIndex = playlistIndex;
      }

      // Load audio
      this.audio.src = data.streamUrl;
      this.updateTrackInfo();
      this.showPlayer();

      // Update UI state
      this.updatePlaybackState();
    } catch (error) {
      console.error("Error loading track:", error);
      let errorMessage = "Failed to load audio track";

      if (error.message) {
        errorMessage += `: ${error.message}`;
      }

      this.showError(errorMessage);
    }
  }

  updateTrackInfo() {
    if (!this.currentTrack) return;

    this.trackTitle.textContent = this.currentTrack.name;
    this.trackMeta.textContent = this.formatFileSize(this.currentTrack.size);

    // Update document title
    document.title = `${this.currentTrack.name} - Gateway Tapes`;
  }

  showPlayer() {
    this.playerContainer.classList.remove("hidden");
  }

  hidePlayer() {
    this.playerContainer.classList.add("hidden");
    document.title = "Gateway Tapes - Audio Streaming Platform";
  }

  async togglePlayPause() {
    if (!this.currentTrack) return;

    try {
      if (this.isPlaying) {
        this.audio.pause();
      } else {
        await this.audio.play();
      }
    } catch (error) {
      console.error("Playback error:", error);
      this.showError("Playback failed");
    }
  }

  async previousTrack() {
    if (this.playlist.length === 0 || this.currentIndex <= 0) return;

    const previousFile = this.playlist[this.currentIndex - 1];
    await this.loadTrack(previousFile, this.playlist, this.currentIndex - 1);

    if (this.isPlaying) {
      await this.audio.play();
    }
  }

  async nextTrack() {
    if (
      this.playlist.length === 0 ||
      this.currentIndex >= this.playlist.length - 1
    )
      return;

    const nextFile = this.playlist[this.currentIndex + 1];
    await this.loadTrack(nextFile, this.playlist, this.currentIndex + 1);

    if (this.isPlaying) {
      await this.audio.play();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.audio.muted = this.isMuted;

    const muteIconElement = document.getElementById("muteIcon");
    if (muteIconElement) {
      const muteIcon = this.isMuted
        ? Icons.get("volumeMute", "icon", 20)
        : Icons.get("volumeUp", "icon", 20);
      muteIconElement.innerHTML = muteIcon;
    }

    this.saveSettings();
  }

  onProgressChange() {
    if (!this.audio.duration) return;

    const time = (this.progressSlider.value / 100) * this.audio.duration;
    this.audio.currentTime = time;
  }

  onVolumeChange() {
    this.volume = this.volumeSlider.value / 100;
    this.audio.volume = this.volume;
    this.saveSettings();

    // Update mute button if volume changed from 0
    if (this.volume > 0 && this.isMuted) {
      this.isMuted = false;
      this.audio.muted = false;
      const muteIconElement = document.getElementById("muteIcon");
      if (muteIconElement) {
        muteIconElement.innerHTML = Icons.get("volumeUp", "icon", 20);
      }
    }
  }

  onLoadStart() {
    console.log("Loading started");
    const playPauseIconElement = document.getElementById("playPauseIcon");
    if (playPauseIconElement) {
      playPauseIconElement.innerHTML = Icons.get("loading", "icon", 20);
    }
  }

  onMetadataLoaded() {
    console.log("Metadata loaded");
    this.totalTimeDisplay.textContent = this.formatTime(this.audio.duration);
  }

  onTimeUpdate() {
    if (!this.audio.duration) return;

    const progress = (this.audio.currentTime / this.audio.duration) * 100;
    this.progressFill.style.width = `${progress}%`;
    this.progressSlider.value = progress;
    this.currentTimeDisplay.textContent = this.formatTime(
      this.audio.currentTime
    );
  }

  onTrackEnded() {
    console.log("Track ended");
    // Auto-play next track if available
    if (this.currentIndex < this.playlist.length - 1) {
      this.nextTrack();
    } else {
      this.isPlaying = false;
      this.updatePlaybackState();
    }
  }

  onError(error) {
    console.error("Audio error:", error);

    // Get more specific error information
    const audio = this.audio;
    let errorMessage = "Audio playback error";

    if (audio.error) {
      switch (audio.error.code) {
        case audio.error.MEDIA_ERR_ABORTED:
          errorMessage = "Audio playback was aborted";
          break;
        case audio.error.MEDIA_ERR_NETWORK:
          errorMessage = "Network error occurred while loading audio";
          break;
        case audio.error.MEDIA_ERR_DECODE:
          errorMessage = "Audio format not supported or corrupted";
          break;
        case audio.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = "Audio format not supported by browser";
          break;
        default:
          errorMessage = `Audio error (code: ${audio.error.code})`;
      }
    }

    this.showError(errorMessage);
    this.isPlaying = false;
    this.updatePlaybackState();
  }

  onCanPlay() {
    console.log("Can play");
    this.updatePlaybackState();
  }

  onWaiting() {
    console.log("Waiting for data");
    const playPauseIconElement = document.getElementById("playPauseIcon");
    if (playPauseIconElement) {
      playPauseIconElement.innerHTML = Icons.get("loading", "icon", 20);
    }
  }

  onPlaying() {
    console.log("Playing");
    this.isPlaying = true;
    this.updatePlaybackState();
    this.updateMediaSession();
  }

  onPause() {
    console.log("Paused");
    this.isPlaying = false;
    this.updatePlaybackState();
  }

  updatePlaybackState() {
    const playPauseIconElement = document.getElementById("playPauseIcon");
    if (playPauseIconElement) {
      const playIcon = this.isPlaying
        ? Icons.get("pause", "icon", 20)
        : Icons.get("play", "icon", 20);
      playPauseIconElement.innerHTML = playIcon;
    }

    // Update previous/next button states
    this.previousBtn.disabled = this.currentIndex <= 0;
    this.nextBtn.disabled = this.currentIndex >= this.playlist.length - 1;

    // Update file cards
    this.updateFileCardStates();
  }

  updateFileCardStates() {
    // Remove playing state from all cards
    document.querySelectorAll(".file-card").forEach((card) => {
      card.classList.remove("playing");
      const playButton = card.querySelector(".play-button-overlay");
      if (playButton) {
        playButton.innerHTML = Icons.get("play", "action-icon", 20);
      }
    });

    // Add playing state to current track
    if (this.currentTrack) {
      const currentCard = document.querySelector(
        `[data-file-key="${this.currentTrack.key}"]`
      );
      if (currentCard) {
        currentCard.classList.add("playing");
        const playButton = currentCard.querySelector(".play-button-overlay");
        if (playButton) {
          playButton.innerHTML = this.isPlaying
            ? Icons.get("pause", "action-icon", 20)
            : Icons.get("play", "action-icon", 20);
        }
      }
    }
  }

  updateMediaSession() {
    if ("mediaSession" in navigator && this.currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: this.currentTrack.name,
        artist: "Gateway Tapes",
        album: "Audio Collection",
      });

      navigator.mediaSession.setActionHandler("play", () =>
        this.togglePlayPause()
      );
      navigator.mediaSession.setActionHandler("pause", () =>
        this.togglePlayPause()
      );
      navigator.mediaSession.setActionHandler("previoustrack", () =>
        this.previousTrack()
      );
      navigator.mediaSession.setActionHandler("nexttrack", () =>
        this.nextTrack()
      );
    }
  }

  handleKeyboard(event) {
    // Only handle shortcuts when not typing in input fields
    if (event.target.tagName === "INPUT") return;

    switch (event.code) {
      case "Space":
        event.preventDefault();
        this.togglePlayPause();
        break;
      case "ArrowLeft":
        if (event.shiftKey) {
          event.preventDefault();
          this.previousTrack();
        }
        break;
      case "ArrowRight":
        if (event.shiftKey) {
          event.preventDefault();
          this.nextTrack();
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        this.volumeSlider.value = Math.min(
          100,
          parseInt(this.volumeSlider.value) + 5
        );
        this.onVolumeChange();
        break;
      case "ArrowDown":
        event.preventDefault();
        this.volumeSlider.value = Math.max(
          0,
          parseInt(this.volumeSlider.value) - 5
        );
        this.onVolumeChange();
        break;
      case "KeyM":
        event.preventDefault();
        this.toggleMute();
        break;
    }
  }

  formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }

  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  showError(message) {
    // Create and show error notification
    const notification = document.createElement("div");
    notification.className = "error-notification";
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: var(--error-color);
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 0.5rem;
      box-shadow: var(--shadow-lg);
      z-index: 1000;
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = "slideOut 0.3s ease";
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }
}

// Export for use in other modules
window.AudioPlayer = AudioPlayer;
