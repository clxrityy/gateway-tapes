# Gateway Tapes 🎵

A modern, open-source audio streaming platform that serves audio files from Cloudflare R2 with an interactive web interface.

## Features

### 🎵 Audio Streaming
- Stream audio files directly from Cloudflare R2
- Support for multiple audio formats (MP3, WAV, FLAC, M4A, AAC, OGG, WMA)
- High-quality audio playback with real-time progress tracking
- Automatic playlist generation from your audio collection

### 🎛️ Interactive Player
- Modern, responsive audio player interface
- Play, pause, skip, and volume controls
- Visual progress bar with seek functionality
- Keyboard shortcuts for quick control
- Media session integration (browser/OS controls)

### 🔍 File Management
- Hierarchical folder navigation with breadcrumb navigation
- Automatic file discovery and indexing from nested folders
- Real-time search functionality across all folders
- Grid and list view options
- File metadata display (size, upload date)
- Keyboard shortcuts for navigation (Alt+Backspace to go back)
- Responsive design for all screen sizes

### 🎨 User Experience
- Light and dark theme support
- Responsive design for mobile and desktop
- Keyboard shortcuts for power users
- Auto-save user preferences
- Error handling and retry mechanisms

## Quick Start

### Prerequisites
- Node.js 16+ installed
- Cloudflare R2 bucket with audio files
- R2 API credentials

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure your Cloudflare R2 credentials:**
   Your `.env` file is already configured with:
   ```env
   R2_ACCOUNT_API_TOKEN=your_token_here
   R2_ACCESS_KEY_ID=your_access_key_here
   R2_SECRET_ACCESS_KEY=your_secret_key_here
   S3_ENDPOINT_URL=your_r2_endpoint_here
   ```

3. **Start the server:**
   ```bash
   npm start
   ```
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000` and enjoy your audio collection!

## Usage

### Uploading Audio Files

Upload your audio files to your Cloudflare R2 bucket using:
- Cloudflare Dashboard
- AWS CLI (configured for R2)
- Any S3-compatible tool

Supported formats: `.mp3`, `.wav`, `.m4a`, `.flac`, `.aac`, `.ogg`, `.wma`

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Space` | Play/Pause |
| `Shift + ←` | Previous track |
| `Shift + →` | Next track |
| `↑/↓` | Volume up/down |
| `M` | Toggle mute |
| `Ctrl/Cmd + F` | Search files |
| `Escape` | Close search |
| `Alt + Backspace` | Navigate back (folders) |
| `Ctrl/Cmd + L` | List view |
| `Ctrl/Cmd + G` | Grid view |

### API Endpoints

#### Get Audio Files
```http
GET /api/files
```
Returns a list of all audio files in your R2 bucket.

#### Get Stream URL
```http
GET /api/stream/:fileKey
```
Returns a pre-signed URL for streaming a specific audio file.

#### Health Check
```http
GET /api/health
```
Returns server health status.

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3000) |
| `NODE_ENV` | Environment mode |
| `R2_ACCOUNT_API_TOKEN` | Cloudflare R2 API token |
| `R2_ACCESS_KEY_ID` | R2 access key ID |
| `R2_SECRET_ACCESS_KEY` | R2 secret access key |
| `S3_ENDPOINT_URL` | R2 endpoint URL |

### Cloudflare R2 Setup

1. Create an R2 bucket in your Cloudflare dashboard
2. Generate R2 API tokens with read permissions
3. Configure CORS if needed for browser access
4. Upload your audio files to the bucket

## Development

### Project Structure
```
gateway-tapes/
├── public/                 # Frontend assets
│   ├── css/
│   │   └── styles.css     # Main stylesheet
│   ├── js/
│   │   ├── app.js         # Main application
│   │   ├── audioPlayer.js # Audio player logic
│   │   └── fileManager.js # File management
│   └── index.html         # Main HTML page
├── server.js              # Express server
├── package.json           # Dependencies
├── .env                   # Environment variables
└── README.md             # This file
```

### Tech Stack
- **Backend**: Node.js, Express
- **Frontend**: Vanilla JavaScript, CSS3, HTML5
- **Storage**: Cloudflare R2 (S3-compatible)
- **Audio**: HTML5 Audio API
- **Security**: Helmet, CORS

### Adding Features

The codebase is modular and extensible:
- Add new audio formats by updating the file filter
- Extend the player with visualizations
- Add user authentication
- Implement playlists and favorites
- Add file upload functionality

## Deployment

### Local Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Docker (Optional)
Create a `Dockerfile`:
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Cloud Deployment
Deploy to any Node.js hosting platform:
- Heroku
- Vercel
- Railway
- Digital Ocean
- AWS
- Google Cloud

## Security

- Pre-signed URLs for secure file access
- CORS configured for your domain
- Helmet for security headers
- Input validation and sanitization
- No direct file system access

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

If you encounter issues:
1. Check the console for error messages
2. Verify your R2 credentials and bucket access
3. Ensure your audio files are in supported formats
4. Check network connectivity

## Roadmap

- [ ] File upload interface
- [ ] User playlists
- [ ] Audio visualizations
- [ ] Sharing functionality
- [ ] Mobile app (PWA)
- [ ] Audio transcoding
- [ ] Metadata extraction
- [ ] User authentication

---

**Gateway Tapes** - Stream your audio collection from the cloud 🎵