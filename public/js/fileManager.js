class FileManager {
  constructor(audioPlayer) {
    this.audioPlayer = audioPlayer;
    this.allItems = [];
    this.currentItems = [];
    this.filteredItems = [];
    this.currentPath = "";
    this.currentView = "grid";
    this.searchQuery = "";
    this.breadcrumbs = [];

    this.initializeElements();
    this.bindEvents();
    this.loadFiles(); // Start at root
  }

  initializeElements() {
    // State elements
    this.loadingState = document.getElementById("loadingState");
    this.errorState = document.getElementById("errorState");
    this.emptyState = document.getElementById("emptyState");
    this.fileList = document.getElementById("fileList");

    // Search elements
    this.searchContainer = document.getElementById("searchContainer");
    this.searchToggle = document.getElementById("searchToggle");
    this.searchInput = document.getElementById("searchInput");
    this.clearSearch = document.getElementById("clearSearch");

    // View elements
    this.fileGrid = document.getElementById("fileGrid");
    this.fileCount = document.getElementById("fileCount");
    this.listViewBtn = document.getElementById("listView");
    this.gridViewBtn = document.getElementById("gridView");

    // Breadcrumb elements
    this.breadcrumbNav = document.getElementById("breadcrumbNav");
    this.backButton = document.getElementById("backButton");
    this.breadcrumbHome = document.getElementById("breadcrumbHome");
    this.breadcrumbTrail = document.getElementById("breadcrumbTrail");

    // Error elements
    this.errorMessage = document.getElementById("errorMessage");
    this.retryButton = document.getElementById("retryButton");
  }

  bindEvents() {
    // Search events
    this.searchToggle.addEventListener("click", () => this.toggleSearch());
    this.searchInput.addEventListener("input", (e) =>
      this.handleSearch(e.target.value)
    );
    this.clearSearch.addEventListener("click", () => this.clearSearchQuery());

    // View events
    this.listViewBtn.addEventListener("click", () => this.setView("list"));
    this.gridViewBtn.addEventListener("click", () => this.setView("grid"));

    // Breadcrumb events
    this.backButton.addEventListener("click", () => this.navigateBack());
    this.breadcrumbHome.addEventListener("click", () =>
      this.navigateToPath("1/")
    );

    // Retry event
    this.retryButton.addEventListener("click", () => this.loadFiles());

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => this.handleKeyboard(e));
  }

  async loadFiles(path = "") {
    try {
      console.log("🔄 Starting loadFiles for path:", path || "root");
      this.showLoading();
      this.currentPath = path;

      console.log(`Loading files from path: ${path || "root"}`);
      const url = `/api/files${
        path ? `?prefix=${encodeURIComponent(path)}` : ""
      }`;
      console.log("📡 Fetching from URL:", url);

      const response = await fetch(url);
      console.log("📨 Response status:", response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ HTTP Error Response:", errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("📋 Response data:", data);

      if (!data.success) {
        throw new Error(data.error || "Failed to load files");
      }

      this.currentItems = data.items || [];
      this.breadcrumbs = data.breadcrumbs || [];
      console.log("📁 Loaded items:", this.currentItems.length);

      // If this is the root level, also load all items for global search
      if (path === "1/") {
        console.log("🔍 Loading all items for search...");
        await this.loadAllItems();
      }

      this.filteredItems = [...this.currentItems];

      console.log(
        `Loaded ${this.currentItems.length} items (${data.folders} folders, ${data.files} files)`
      );

      this.updateBreadcrumbs();

      if (this.currentItems.length === 0) {
        this.showEmpty();
      } else {
        this.renderItems();
        this.showFileList();
      }
    } catch (error) {
      console.error("Error loading files:", error);
      this.showError(error.message);
    }
  }

  async loadAllItems() {
    try {
      console.log("Loading all items for global search...");
      const response = await fetch("/api/files?all=true");
      const data = await response.json();

      if (data.success) {
        this.allItems = data.items || [];
        console.log(`Loaded ${this.allItems.length} total items for search`);
      }
    } catch (error) {
      console.error("Error loading all items:", error);
      // Fallback to current items only
      this.allItems = [...this.currentItems];
    }
  }

  renderItems() {
    this.updateFileCount();
    this.fileGrid.innerHTML = "";

    if (this.filteredItems.length === 0) {
      this.showNoResults();
      return;
    }

    this.filteredItems.forEach((item, index) => {
      const itemCard = this.createItemCard(item, index);
      this.fileGrid.appendChild(itemCard);
    });
  }

  createItemCard(item, index) {
    const card = document.createElement("div");
    card.className = `file-card ${item.type}`;
    card.setAttribute("data-item-key", item.key);
    card.setAttribute("data-item-type", item.type);

    if (item.type === "folder") {
      return this.createFolderCard(card, item);
    } else {
      return this.createFileCard(card, item, index);
    }
  }

  createFolderCard(card, folder) {
    card.innerHTML = `
      <div class="file-header">
        <div class="file-icon">${Icons.get("folder", "file-icon", 24)}</div>
        <div class="file-info">
          <div class="file-name" title="${folder.name}">${folder.name}</div>
          <div class="file-meta">
            <span>Folder</span>
          </div>
        </div>
        <button class="play-button-overlay" title="Open folder" style="opacity: 1;">${Icons.get(
          "folderOpen",
          "action-icon",
          20
        )}</button>
      </div>
    `;

    card.addEventListener("click", () => this.navigateToFolder(folder));

    return card;
  }

  createFileCard(card, file, index) {
    const audioFiles = this.filteredItems.filter(
      (item) => item.type === "file" && item.fileType === "audio"
    );
    const fileIndex = audioFiles.findIndex((f) => f.key === file.key);

    const fileIcon = this.getFileIcon(file.extension);
    const formattedSize = this.formatFileSize(file.size);
    const formattedDate = this.formatDate(file.lastModified);

    // Determine button text based on file type
    const buttonTitle = file.fileType === "audio" ? "Play" : "View";
    const buttonIcon =
      file.fileType === "audio"
        ? Icons.get("play", "action-icon", 20)
        : Icons.get("eye", "action-icon", 20);

    card.innerHTML = `
      <div class="file-header">
        <div class="file-icon">${fileIcon}</div>
        <div class="file-info">
          <div class="file-name" title="${file.name}">${file.name}</div>
          <div class="file-meta">
            <span>${formattedSize}</span>
            <span>${formattedDate}</span>
          </div>
        </div>
        <button class="play-button-overlay" title="${buttonTitle}">${buttonIcon}</button>
      </div>
    `;

    // Add click handlers
    card.addEventListener("click", (e) => {
      if (!e.target.classList.contains("play-button-overlay")) {
        this.handleFileClick(file, fileIndex, audioFiles);
      }
    });

    const actionButton = card.querySelector(".play-button-overlay");
    actionButton.addEventListener("click", (e) => {
      e.stopPropagation();
      this.handleFileAction(file, fileIndex, audioFiles);
    });

    return card;
  }

  async navigateToFolder(folder) {
    console.log("Navigating to folder:", folder.name);
    await this.loadFiles(folder.fullPath);
  }

  async navigateToPath(path) {
    console.log("Navigating to path:", path || "root");
    await this.loadFiles(path);
  }

  async navigateBack() {
    if (this.currentPath === "1/") return;

    // Calculate parent path
    const pathSegments = this.currentPath.split("/").filter(Boolean);
    pathSegments.pop(); // Remove last segment
    const parentPath =
      pathSegments.length > 0 ? pathSegments.join("/") + "/" : "1/";

    await this.navigateToPath(parentPath);
  }

  updateBreadcrumbs() {
    const canGoBack = this.currentPath !== "1/";
    this.backButton.disabled = !canGoBack;

    if (this.currentPath === "1/") {
      this.breadcrumbNav.classList.add("hidden");
      return;
    }

    this.breadcrumbNav.classList.remove("hidden");
    this.breadcrumbTrail.innerHTML = "";

    this.breadcrumbs.forEach((crumb, index) => {
      if (index > 0) {
        const separator = document.createElement("span");
        separator.className = "breadcrumb-separator";
        separator.textContent = "/";
        this.breadcrumbTrail.appendChild(separator);
      }

      const item = document.createElement("div");
      item.className = "breadcrumb-item";

      if (index === this.breadcrumbs.length - 1) {
        // Current folder
        item.innerHTML = `<span class="breadcrumb-current">${crumb.name}</span>`;
      } else {
        // Clickable parent folder
        item.innerHTML = `<span class="breadcrumb-link" data-path="${crumb.path}">${crumb.name}</span>`;
        const link = item.querySelector(".breadcrumb-link");
        link.addEventListener("click", () => this.navigateToPath(crumb.path));
      }

      this.breadcrumbTrail.appendChild(item);
    });
  }

  async playFile(file, index, audioFiles) {
    console.log("Playing file:", file.name);
    await this.audioPlayer.loadTrack(file, audioFiles, index);

    try {
      await this.audioPlayer.audio.play();
    } catch (error) {
      console.error("Autoplay failed:", error);
      // Autoplay failed, user needs to interact first
    }
  }

  async toggleFilePlayback(file, index, audioFiles) {
    if (
      this.audioPlayer.currentTrack &&
      this.audioPlayer.currentTrack.key === file.key
    ) {
      // Same file, toggle play/pause
      await this.audioPlayer.togglePlayPause();
    } else {
      // Different file, load and play
      await this.playFile(file, index, audioFiles);
    }
  }

  handleFileClick(file, fileIndex, audioFiles) {
    // Handle clicks on file cards (not on the play button)
    console.log("File clicked:", file.name, "Type:", file.fileType);

    if (file.fileType === "audio") {
      // For audio files, play the file when clicked
      this.playFile(file, fileIndex, audioFiles);
    } else {
      // For documents and other files, open them for viewing
      this.viewFile(file);
    }
  }

  handleFileAction(file, fileIndex, audioFiles) {
    // Handle clicks on the action button overlay
    if (file.fileType === "audio") {
      this.toggleFilePlayback(file, fileIndex, audioFiles);
    } else {
      this.viewFile(file);
    }
  }

  async viewFile(file) {
    try {
      console.log("Viewing file:", file.name);

      // Get view URL from server
      const response = await fetch(
        `/api/view?key=${encodeURIComponent(file.key)}`
      );
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to get view URL");
      }

      // Open the file in a new tab
      window.open(data.viewUrl, "_blank");
    } catch (error) {
      console.error("Error viewing file:", error);
      this.showErrorNotification(`Failed to open file: ${error.message}`);
    }
  }

  showErrorNotification(message) {
    // Create and show error notification (similar to audioPlayer)
    const notification = document.createElement("div");
    notification.className = "error-notification";
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff4444;
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      font-size: 14px;
      max-width: 300px;
    `;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 5000);
  }

  handleSearch(query) {
    this.searchQuery = query.toLowerCase().trim();
    this.filterItems();
    this.renderItems();
  }

  clearSearchQuery() {
    this.searchInput.value = "";
    this.searchQuery = "";
    this.filterItems();
    this.renderItems();
  }

  filterItems() {
    if (!this.searchQuery) {
      // No search query, show current directory items
      this.filteredItems = [...this.currentItems];
      return;
    }

    // Search query exists, search through ALL items across entire collection
    const searchItems =
      this.allItems.length > 0 ? this.allItems : this.currentItems;

    this.filteredItems = searchItems.filter((item) => {
      return item.name.toLowerCase().includes(this.searchQuery);
    });
  }

  toggleSearch() {
    const isHidden = this.searchContainer.classList.contains("hidden");

    if (isHidden) {
      this.searchContainer.classList.remove("hidden");
      this.searchInput.focus();
    } else {
      this.searchContainer.classList.add("hidden");
      this.clearSearchQuery();
    }
  }

  setView(view) {
    this.currentView = view;

    // Update button states
    this.listViewBtn.classList.toggle("active", view === "list");
    this.gridViewBtn.classList.toggle("active", view === "grid");

    // Update grid class
    this.fileGrid.classList.toggle("list-view", view === "list");

    // Save preference
    localStorage.setItem("fileViewPreference", view);
  }

  loadViewPreference() {
    const savedView = localStorage.getItem("fileViewPreference");
    if (savedView && ["list", "grid"].includes(savedView)) {
      this.setView(savedView);
    }
  }

  formatPlural(count, singular, plural) {
    return `${count} ${count === 1 ? singular : plural}`;
  }

  getItemCountText(folders, files) {
    if (folders === 0 && files === 0) {
      return "No items";
    }

    if (folders === 0) {
      return this.formatPlural(files, "file", "files");
    }

    if (files === 0) {
      return this.formatPlural(folders, "folder", "folders");
    }

    return `${this.formatPlural(
      folders,
      "folder",
      "folders"
    )}, ${this.formatPlural(files, "file", "files")}`;
  }

  updateFileCount() {
    const total = this.currentItems.length;
    const filtered = this.filteredItems.length;
    const folders = this.filteredItems.filter(
      (item) => item.type === "folder"
    ).length;
    const files = this.filteredItems.filter(
      (item) => item.type === "file"
    ).length;

    if (this.searchQuery && filtered !== total) {
      this.fileCount.textContent = `${filtered} of ${total} items`;
      return;
    }

    this.fileCount.textContent = this.getItemCountText(folders, files);
  }

  // State management methods
  showLoading() {
    this.hideAllStates();
    this.loadingState.classList.remove("hidden");
  }

  showError(message) {
    this.hideAllStates();
    this.errorMessage.textContent = message;
    this.errorState.classList.remove("hidden");
  }

  showEmpty() {
    this.hideAllStates();
    this.emptyState.classList.remove("hidden");
  }

  showFileList() {
    this.hideAllStates();
    this.fileList.classList.remove("hidden");
  }

  showNoResults() {
    this.fileGrid.innerHTML = `
      <div class="no-results">
        <div class="empty-icon">${Icons.get("search", "empty-icon", 48)}</div>
        <h3>No files found</h3>
        <p>Try adjusting your search terms.</p>
      </div>
    `;
  }

  hideAllStates() {
    this.loadingState.classList.add("hidden");
    this.errorState.classList.add("hidden");
    this.emptyState.classList.add("hidden");
    this.fileList.classList.add("hidden");
  }

  // Utility methods
  getFileIcon(extension) {
    return Icons.getFileIcon(extension, "file-icon", 24);
  }

  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays <= 7) {
      return `${diffDays} days ago`;
    } else if (diffDays <= 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  }

  handleKeyboard(event) {
    // Only handle shortcuts when not typing in input fields
    if (event.target.tagName === "INPUT") return;

    switch (event.code) {
      case "KeyF":
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.toggleSearch();
        }
        break;
      case "Escape":
        if (!this.searchContainer.classList.contains("hidden")) {
          this.toggleSearch();
        }
        break;
      case "Backspace":
        if (event.altKey) {
          event.preventDefault();
          this.navigateBack();
        }
        break;
      case "KeyL":
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.setView("list");
        }
        break;
      case "KeyG":
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.setView("grid");
        }
        break;
    }
  }

  // Public methods for external use
  refreshFiles() {
    this.loadFiles(this.currentPath);
  }

  getCurrentFiles() {
    return this.filteredItems.filter((item) => item.type === "file");
  }

  getCurrentPlaylist() {
    return this.filteredItems.filter((item) => item.type === "file");
  }

  getCurrentPath() {
    return this.currentPath;
  }

  getAllItems() {
    return this.filteredItems;
  }
}

// Export for use in other modules
window.FileManager = FileManager;
