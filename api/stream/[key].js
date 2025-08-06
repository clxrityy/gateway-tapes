const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

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

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  try {
    const { key } = req.query;

    if (!key) {
      return res.status(400).json({
        success: false,
        error: "File key is required",
      });
    }

    console.log("🔗 Generating stream URL for:", key);

    // Generate a signed URL for streaming (valid for 1 hour)
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const streamUrl = await getSignedUrl(r2Client, command, {
      expiresIn: 3600, // 1 hour
    });

    console.log("✅ Stream URL generated successfully");

    res.status(200).json({
      success: true,
      streamUrl: streamUrl,
    });
  } catch (error) {
    console.error("❌ Error generating stream URL:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to generate stream URL",
    });
  }
}
