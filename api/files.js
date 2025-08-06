const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");

// Initialize S3 client for Cloudflare R2
const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.S3_ENDPOINT_URL,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const bucketName = "gateway-tapes";

// Helper function to get file type and extension
function getFileTypeAndExtension(key) {
  const parts = key.split(".");
  const extension = parts.length > 1 ? parts.pop().toLowerCase() : "";
  
  const audioExtensions = ["mp3", "wav", "flac", "m4a", "aac", "ogg", "wma"];
  const documentExtensions = ["pdf", "doc", "docx", "txt", "rtf"];
  const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "svg"];
  const videoExtensions = ["mp4", "avi", "mov", "wmv", "flv", "webm"];
  
  let fileType = "other";
  if (audioExtensions.includes(extension)) fileType = "audio";
  else if (documentExtensions.includes(extension)) fileType = "document";
  else if (imageExtensions.includes(extension)) fileType = "image";
  else if (videoExtensions.includes(extension)) fileType = "video";
  
  return { fileType, extension };
}

// Helper function to organize items into folders and files
function organizeItems(objects, prefix = "", getAllFiles = false) {
  const folders = new Map();
  const files = [];
  
  // Remove the prefix from object keys and organize
  for (const obj of objects) {
    const relativePath = prefix ? obj.Key.replace(prefix, "") : obj.Key;
    
    // Skip if empty path
    if (!relativePath || relativePath === "/") continue;
    
    const segments = relativePath.split("/").filter(Boolean);
    
    if (segments.length === 0) continue;
    
    if (segments.length === 1) {
      // Direct file in current directory
      const { fileType, extension } = getFileTypeAndExtension(segments[0]);
      
      files.push({
        type: "file",
        name: segments[0],
        key: obj.Key,
        fullPath: obj.Key,
        size: obj.Size || 0,
        lastModified: obj.LastModified || new Date().toISOString(),
        fileType,
        extension,
      });
    } else if (!getAllFiles) {
      // Subdirectory (only show immediate subdirs when not getting all files)
      const folderName = segments[0];
      const folderPath = prefix + folderName + "/";
      
      if (!folders.has(folderName)) {
        folders.set(folderName, {
          type: "folder",
          name: folderName,
          key: folderPath,
          fullPath: folderPath,
          size: 0,
          lastModified: new Date().toISOString(),
        });
      }
    } else {
      // Getting all files - include files from subdirectories
      const { fileType, extension } = getFileTypeAndExtension(segments[segments.length - 1]);
      
      files.push({
        type: "file",
        name: segments[segments.length - 1],
        key: obj.Key,
        fullPath: obj.Key,
        size: obj.Size || 0,
        lastModified: obj.LastModified || new Date().toISOString(),
        fileType,
        extension,
      });
    }
  }
  
  return {
    folders: Array.from(folders.values()),
    files: files,
  };
}

// Helper function to generate breadcrumbs
function generateBreadcrumbs(prefix) {
  if (!prefix) return [];
  
  const segments = prefix.split("/").filter(Boolean);
  const breadcrumbs = [];
  let currentPath = "";
  
  for (const segment of segments) {
    currentPath += segment + "/";
    breadcrumbs.push({
      name: segment,
      path: currentPath,
    });
  }
  
  return breadcrumbs;
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    console.log("📁 Files API called");
    console.log("Query params:", req.query);

    const { prefix = "", all = "false" } = req.query;
    const getAllFiles = all === "true";
    
    console.log(`🔍 Fetching files with prefix: "${prefix}", getAllFiles: ${getAllFiles}`);

    // Prepare S3 command
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
      Delimiter: getAllFiles ? undefined : "/", // Remove delimiter when getting all files
      MaxKeys: getAllFiles ? 10000 : 1000, // Increase limit for all files
    });

    console.log("⚡ Executing S3 command...");
    const response = await r2Client.send(command);
    console.log("✅ R2 response received");

    const objects = response.Contents || [];
    console.log(`📦 Found ${objects.length} objects`);

    const { folders, files } = organizeItems(objects, prefix, getAllFiles);
    const items = [...folders, ...files];

    console.log(`📊 Processed ${folders.length} folders and ${files.length} files`);

    const result = {
      success: true,
      items: items,
      folders: folders.length,
      files: files.length,
      total: items.length,
      breadcrumbs: generateBreadcrumbs(prefix),
    };

    console.log("📤 Sending response");
    res.status(200).json(result);

  } catch (error) {
    console.error("❌ Error in files API:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message || "Failed to fetch files" 
    });
  }
}
