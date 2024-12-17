import mime from "mime";
//@ts-ignore
import { NFTStorage, File } from "nft.storage";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const NFT_STORAGE_KEY = process.env.NFT_STORAGE_KEY as string;

/**
 * Reads an image file from `imagePath` and stores an NFT with the given name and description.
 * @param {string} imagesPath the path to an image file
 * @returns {Promise<any[]>} an array of responses from NFT storage API
 */
async function storeNFTs(imagesPath: string): Promise<any[]> {
  const fullImagesPath = path.resolve(imagesPath);
  const files = fs.readdirSync(fullImagesPath);
  const responses: any[] = [];

  for (const fileIndex of files) {
    const image = await fileFromPath(`${fullImagesPath}/${fileIndex}`);
    const nftstorage = new NFTStorage({ token: NFT_STORAGE_KEY });

    // Deriving the name of the dog (or the NFT) from the filename
    const dogName = fileIndex.split(".")[0];

    // Storing the NFT metadata and image
    const response = await nftstorage.store({
      image,
      name: dogName,
      description: `An adorable ${dogName}`,
      // Currently doesn't support attributes 😔
      // attributes: [{ trait_type: "cuteness", value: 100 }],
    });

    responses.push(response);
  }

  return responses;
}

/**
 * A helper to read a file from a location on disk and return a File object.
 * Note that this reads the entire file into memory and should not be used for
 * very large files.
 * @param {string} filePath the path to a file to store
 * @returns {Promise<File>} a File object containing the file content
 */
async function fileFromPath(filePath: string): Promise<File> {
  const content = await fs.promises.readFile(filePath);
  const type = mime.getType(filePath);
  if (!type) {
    throw new Error(`Unable to determine mime type for ${filePath}`);
  }
  return new File([content], path.basename(filePath), { type });
}

export { storeNFTs };
