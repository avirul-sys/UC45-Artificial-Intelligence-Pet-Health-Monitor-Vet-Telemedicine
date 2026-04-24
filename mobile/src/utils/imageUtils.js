import ImageResizer from 'react-native-image-resizer';

export const MAX_IMAGE_SIZE_MB = 5;
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

export async function compressImage(imageAsset) {
  if (imageAsset.fileSize && imageAsset.fileSize > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`Image too large. Please use a photo under ${MAX_IMAGE_SIZE_MB} MB.`);
  }

  const response = await ImageResizer.createResizedImage(
    imageAsset.uri,
    1024,
    1024,
    'JPEG',
    80,
    0,
    undefined,
    false,
    { mode: 'contain' }
  );

  return {
    uri: response.uri,
    type: 'image/jpeg',
    name: response.name || 'symptom.jpg',
    fileSize: response.size,
  };
}
