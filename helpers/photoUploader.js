const aws = require("aws-sdk");
const Jimp = require("jimp");

// Configure AWS SDK with your DigitalOcean Spaces credentials
aws.config.update({
  accessKeyId: process.env.ACCESSKEY_ID,
  secretAccessKey: process.env.SECRET_ACCESSKEY,
  region: process.env.REGION, // Example: "nyc3"
});

const s3 = new aws.S3();
let folderName = "mhk";

// Function to upload files directly to S3
async function uploadToS3(files, id) {
  try {
    const uploadedFiles = [];

    // Use Promise.all to handle multiple asynchronous operations concurrently
    await Promise.all(
      files.map(async (file) => {
        const fileName = Date.now() + "-" + file.originalname;

        // Read the image with jimp
        const image = await Jimp.read(file.buffer);
        // Resize the image to the specified dimensions for desktop view (1280x720)
        const desktop = image.clone().resize(Jimp.AUTO, 720).cover(1280, 720);
        const desktopBuffer = await desktop.getBufferAsync(Jimp.AUTO);

        // Create the filename for the desktop thumbnail image
        const desktopKey = folderName + "/" + id + "/desktop/" + fileName;

        // Upload the desktop thumbnail image to S3
        const desktopParams = {
          Bucket: process.env.BUCKET_NAME,
          Key: desktopKey,
          Body: desktopBuffer,
          ContentType: file.mimetype,
        };
        await s3.upload(desktopParams).promise();

        // Get pre-signed URL for the desktop thumbnail image
        const desktopUrl = await s3.getSignedUrlPromise("getObject", {
          Bucket: process.env.BUCKET_NAME,
          Key: desktopKey,
          Expires: null, // URL expires in 1 hour
        });

        // Resize the image to the specified dimensions for mobile view (640x360)
        const mobile = image.clone().resize(Jimp.AUTO, 360).cover(640, 360);
        const mobileBuffer = await mobile.getBufferAsync(Jimp.AUTO);

        // Create the filename for the mobile thumbnail image
        const mobileKey = folderName + "/" + id + "/mobile/" + fileName;

        // Upload the mobile thumbnail image to S3
        const mobileParams = {
          Bucket: process.env.BUCKET_NAME,
          Key: mobileKey,
          Body: mobileBuffer,
          ContentType: file.mimetype,
        };
        await s3.upload(mobileParams).promise();

        // Get pre-signed URL for the mobile thumbnail image
        const mobileUrl = await s3.getSignedUrlPromise("getObject", {
          Bucket: process.env.BUCKET_NAME,
          Key: mobileKey,
          Expires: null, // URL expires in 1 hour
        });

        // Create the filename for the original image
        const originalKey = folderName + "/" + id + "/original/" + fileName;
        const originalBuffer = file.buffer;
        const originalParams = {
          Bucket: process.env.BUCKET_NAME,
          Key: originalKey,
          Body: originalBuffer,
          ContentType: file.mimetype,
        };
        await s3.upload(originalParams).promise();

        // Get pre-signed URL for the original image
        const originalUrl = await s3.getSignedUrlPromise("getObject", {
          Bucket: process.env.BUCKET_NAME,
          Key: originalKey,
          Expires: null, // URL expires in 1 hour
        });

        uploadedFiles.push({
          filename: fileName,
          desktopUrl: desktopUrl,
          mobileUrl: mobileUrl,
          originalUrl: originalUrl,
        });
      })
    );

    return uploadedFiles;
  } catch (error) {
    console.error("Error uploading files to S3:", error);
    throw error;
  }
}

async function deleteFromS3(filename, id) {
  try {
    const keysToDelete = [
      { Key: folderName + "/" + id + "/desktop/" + filename },
      { Key: folderName + "/" + id + "/mobile/" + filename },
      { Key: folderName + "/" + id + "/original/" + filename },
    ];

    await s3
      .deleteObjects({
        Bucket: process.env.BUCKET_NAME,
        Delete: { Objects: keysToDelete },
      })
      .promise();
    console.log("Deleted from S3:", filename); // Check if this log appears
  } catch (error) {
    console.error("Error deleting files from S3:", error);
    throw error;
  }
}
async function deleteRecordFromS3(id) {
  try {
    const folderName = "mhk";
    const prefix = folderName + "/" + id;

    const data = await s3
      .listObjectsV2({
        Bucket: process.env.BUCKET_NAME,
        Prefix: prefix,
      })
      .promise();

    const objectsToDelete = data.Contents.map((content) => {
      return { Key: content.Key };
    });

    if (objectsToDelete.length > 0) {
      await s3
        .deleteObjects({
          Bucket: process.env.BUCKET_NAME,
          Delete: { Objects: objectsToDelete },
        })
        .promise();
    }

    console.log("Deleted folder and its contents:", prefix);
  } catch (error) {
    console.error("Error deleting folder and its contents from S3:", error);
    throw error;
  }
}

// Export the upload middleware and uploadToS3 function
module.exports = {
  uploadToS3,
  deleteFromS3,
  deleteRecordFromS3,
};
