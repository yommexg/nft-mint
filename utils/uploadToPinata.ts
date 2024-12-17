import pinataSDK from "@pinata/sdk";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const pinataApiKey = process.env.PINATA_API_KEY as string;
const pinataApiSecret = process.env.PINATA_API_SECRET as string;

const pinata = pinataSDK(pinataApiKey, pinataApiSecret);

// Define the type for the response from Pinata when storing files
interface PinataFileResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

// Define the type for metadata when storing JSON
interface Metadata {
  name: string;
  description: string;
  image: string;
  [key: string]: any; // allow for additional fields
}

async function storeImages(
  imagesFilePath: string
): Promise<{ responses: PinataFileResponse[]; files: string[] }> {
  const fullImagesPath = path.resolve(imagesFilePath);
  const files = fs.readdirSync(fullImagesPath);
  let responses: PinataFileResponse[] = [];

  console.log("Uploading to Pinata!!");
  for (let fileIndex in files) {
    console.log(`Working on ${files[fileIndex]}`);
    const readableStreamForFile = fs.createReadStream(
      path.join(fullImagesPath, files[fileIndex])
    );
    try {
      const response = await pinata.pinFileToIPFS(readableStreamForFile);
      responses.push(response);
    } catch (error) {
      console.error(error);
    }
  }

  return { responses, files };
}

async function storeTokenUriMetadata(metadata: Metadata): Promise<any | null> {
  try {
    const response = await pinata.pinJSONToIPFS(metadata);
    return response;
  } catch (error) {
    console.error(error);
  }
  return null;
}

export { storeImages, storeTokenUriMetadata };
