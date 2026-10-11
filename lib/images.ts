import { uid, type ImageAsset } from "./document";

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const IMAGE_MIMES = ["image/png", "image/jpeg", "image/webp"];
export function detectedMime(bytes: Uint8Array): string | undefined {
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  )
    return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "image/jpeg";
  if (
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    return "image/webp";
}
export async function validateImage(
  blob: Blob,
): Promise<{ width: number; height: number; mime: string }> {
  if (blob.size > MAX_IMAGE_BYTES || !blob.size)
    throw new Error("Chaque image doit faire entre 1 octet et 8 Mo.");
  const mime = detectedMime(
    new Uint8Array(await blob.slice(0, 12).arrayBuffer()),
  );
  if (!mime || (blob.type && blob.type !== mime))
    throw new Error("Importez une vraie image PNG, JPEG ou WebP.");
  const bitmap = await createImageBitmap(blob).catch(() => {
    throw new Error("Cette image est endommagée ou illisible.");
  });
  const { width, height } = bitmap;
  bitmap.close();
  if (width > 10000 || height > 10000 || width * height > 40000000)
    throw new Error(
      "Cette image est trop grande : maximum 10 000 pixels par côté et 40 mégapixels.",
    );
  return { width, height, mime };
}
export async function importImage(file: File): Promise<ImageAsset> {
  const info = await validateImage(file);
  return { id: uid(), name: file.name.slice(0, 200), blob: file, ...info };
}
export const imageDpi = (pixels: number, mm: number) => pixels / (mm / 25.4);
