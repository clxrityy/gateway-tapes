const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const path = require("path");
require("dotenv").config();

const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { GetObjectCommand } = require("@aws-sdk/client-s3");

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize S3 client for Cloudflare R2
const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.S3_ENDPOINT_URL,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// Extract bucket name from endpoint URL
const bucketName = "gateway-tapes";

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        mediaSrc: [
          "'self'",
          "blob:",
          "data:",
          process.env.S3_ENDPOINT_URL,
          "https://*.r2.cloudflarestorage.com",
        ],
        connectSrc: [
          "'self'",
          process.env.S3_ENDPOINT_URL,
          "https://*.r2.cloudflarestorage.com",
        ],
        objectSrc: [
          "'self'",
          process.env.S3_ENDPOINT_URL,
          "https://*.r2.cloudflarestorage.com",
        ],
        frameSrc: [
          "'self'",
          "blob:",
          process.env.S3_ENDPOINT_URL,
          "https://*.r2.cloudflarestorage.com",
        ],
      },
    },
  })
);
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// API Routes

// Get list of audio files with folder structure
app.get("/api/files", async (req, res) => {
  console.log("📁 Files API called with query:", req.query);

  try {
    const prefix = req.query.prefix || "";
    const getAllFiles = req.query.all === "true";

    console.log(
      `🔍 Fetching files with prefix: "${prefix}", getAllFiles: ${getAllFiles}`
    );

    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
      Delimiter: getAllFiles ? undefined : "/", // Remove delimiter to get all files when all=true
      MaxKeys: getAllFiles ? 10000 : 1000, // Increase limit for all files
    });

    console.log("☁️ Sending request to R2...");
    const response = await r2Client.send(command);
    console.log(
      `✅ R2 response received. Contents: ${
        response.Contents?.length || 0
      }, CommonPrefixes: ${response.CommonPrefixes?.length || 0}`
    );

    let folders = [];
    let files = [];

    if (getAllFiles) {
      // When getting all files, don't process folders separately
      // Filter for supported file types across all directories
      const audioExtensions = [
        ".mp3",
        ".wav",
        ".m4a",
        ".flac",
        ".aac",
        ".ogg",
        ".wma",
        ".opus",
      ];
      const documentExtensions = [".pdf", ".txt"];
      const supportedExtensions = [...audioExtensions, ...documentExtensions];

      files = (response.Contents || [])
        .filter((obj) => {
          const ext = path.extname(obj.Key).toLowerCase();
          return supportedExtensions.includes(ext);
        })
        .map((obj) => {
          const ext = path.extname(obj.Key).toLowerCase();
          let fileType = "unknown";
          if (audioExtensions.includes(ext)) {
            fileType = "audio";
          } else if (documentExtensions.includes(ext)) {
            fileType = "document";
          }

          return {
            type: "file",
            key: obj.Key,
            name: path.basename(obj.Key),
            fullPath: obj.Key,
            size: obj.Size,
            lastModified: obj.LastModified,
            extension: ext,
            folder: path.dirname(obj.Key),
            fileType: fileType,
          };
        });
    } else {
      // Normal directory browsing mode
      // Get folders (CommonPrefixes)
      folders = (response.CommonPrefixes || []).map((prefix) => ({
        type: "folder",
        key: prefix.Prefix,
        name: prefix.Prefix.slice(0, -1).split("/").pop(),
        fullPath: prefix.Prefix,
      }));

      // Filter for supported file types in current directory only
      const audioExtensions = [
        ".mp3",
        ".wav",
        ".m4a",
        ".flac",
        ".aac",
        ".ogg",
        ".wma",
        ".opus",
      ];
      const documentExtensions = [".pdf", ".txt"];
      const supportedExtensions = [...audioExtensions, ...documentExtensions];

      files = (response.Contents || [])
        .filter((obj) => {
          const ext = path.extname(obj.Key).toLowerCase();
          return supportedExtensions.includes(ext) && obj.Key !== prefix; // Exclude the prefix itself
        })
        .map((obj) => {
          const ext = path.extname(obj.Key).toLowerCase();
          let fileType = "unknown";
          if (audioExtensions.includes(ext)) {
            fileType = "audio";
          } else if (documentExtensions.includes(ext)) {
            fileType = "document";
          }

          return {
            type: "file",
            key: obj.Key,
            name: path.basename(obj.Key),
            fullPath: obj.Key,
            size: obj.Size,
            lastModified: obj.LastModified,
            extension: ext,
            folder: path.dirname(obj.Key),
            fileType: fileType,
          };
        });
    }

    // Combine and sort: folders first, then files
    const items = [
      ...folders.toSorted((a, b) => a.name.localeCompare(b.name)),
      ...files.toSorted((a, b) => a.name.localeCompare(b.name)),
    ];

    // Create breadcrumb path
    const breadcrumbs = prefix
      ? prefix
          .split("/")
          .filter(Boolean)
          .map((segment, index, array) => ({
            name: segment,
            path: array.slice(0, index + 1).join("/") + "/",
          }))
      : [];

    console.log(
      `📊 Processed ${folders.length} folders and ${files.length} files`
    );

    res.json({
      success: true,
      items,
      folders: folders.length,
      files: files.length,
      total: items.length,
      currentPath: prefix,
      breadcrumbs,
      canGoUp: prefix !== "",
    });
  } catch (error) {
    console.error("❌ Error listing files:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      error: "Failed to retrieve file list",
      details: error.message,
    });
  }
});

// Get signed URL for streaming audio
app.get("/api/stream/:fileKey(*)", async (req, res) => {
  try {
    const fileKey = req.params.fileKey;
    console.log(`Generating stream URL for: ${fileKey}`);

    // Generate signed URL for streaming (valid for 1 hour)
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
    });

    const signedUrl = await getSignedUrl(r2Client, command, {
      expiresIn: 3600,
    });
    console.log(`Generated signed URL: ${signedUrl.substring(0, 100)}...`);

    res.json({
      success: true,
      streamUrl: signedUrl,
      fileName: path.basename(fileKey),
    });
  } catch (error) {
    console.error("Error generating stream URL for key:", fileKey, error);
    res.status(500).json({
      success: false,
      error: "Failed to generate stream URL",
      details: error.message,
    });
  }
});

// Get signed URL for viewing documents (PDF/TXT)
app.get("/api/view/:fileKey(*)", async (req, res) => {
  try {
    const fileKey = req.params.fileKey;
    const fileExtension = path.extname(fileKey).toLowerCase();

    // Generate signed URL for viewing (valid for 1 hour)
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
    });

    const signedUrl = await getSignedUrl(r2Client, command, {
      expiresIn: 3600,
    });

    res.json({
      success: true,
      viewUrl: signedUrl,
      fileName: path.basename(fileKey),
      fileType: fileExtension === ".pdf" ? "pdf" : "text",
      extension: fileExtension,
    });
  } catch (error) {
    console.error("Error generating view URL:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate view URL",
      details: error.message,
    });
  }
});

// Get document content directly (for TXT files)
app.get("/api/content/:fileKey(*)", async (req, res) => {
  try {
    const fileKey = req.params.fileKey;
    const fileExtension = path.extname(fileKey).toLowerCase();

    // Only serve text files directly
    if (fileExtension !== ".txt") {
      return res.status(400).json({
        success: false,
        error: "This endpoint only supports text files",
      });
    }

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
    });

    const response = await r2Client.send(command);
    const content = await response.Body.transformToString();

    res.json({
      success: true,
      content,
      fileName: path.basename(fileKey),
      size: response.ContentLength,
      lastModified: response.LastModified,
    });
  } catch (error) {
    console.error("Error fetching file content:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch file content",
      details: error.message,
    });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// Serve the main application
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🎵 Gateway Tapes server running on http://localhost:${PORT}`);
  console.log(`🚀 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`☁️  Connected to Cloudflare R2 bucket: ${bucketName}`);
  console.log(
    `🔧 R2 Endpoint: ${process.env.S3_ENDPOINT_URL ? "✅ Set" : "❌ Missing"}`
  );
  console.log(
    `🔑 Access Key: ${process.env.R2_ACCESS_KEY_ID ? "✅ Set" : "❌ Missing"}`
  );
  console.log(
    `🔐 Secret Key: ${
      process.env.R2_SECRET_ACCESS_KEY ? "✅ Set" : "❌ Missing"
    }`
  );
});

module.exports = app;
