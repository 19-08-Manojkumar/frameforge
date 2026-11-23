/** Read bounded raster headers. Provider/browser decoding still validates image content. */
export function imageInfo(
  bytes: Uint8Array,
): { width: number; height: number; type: string; extension: string } | null {
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.subarray(start, end));
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (
    bytes.length >= 24 &&
    ascii(1, 4) === "PNG" &&
    bytes[0] === 137 &&
    ascii(12, 16) === "IHDR"
  )
    return {
      width: view.getUint32(16),
      height: view.getUint32(20),
      type: "image/png",
      extension: "png",
    };
  if (bytes.length >= 30 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
    const kind = ascii(12, 16);
    if (kind === "VP8X")
      return {
        width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16),
        height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16),
        type: "image/webp",
        extension: "webp",
      };
    if (
      kind === "VP8 " &&
      bytes[23] === 157 &&
      bytes[24] === 1 &&
      bytes[25] === 42
    )
      return {
        width: view.getUint16(26, true) & 16383,
        height: view.getUint16(28, true) & 16383,
        type: "image/webp",
        extension: "webp",
      };
    if (kind === "VP8L" && bytes[20] === 47)
      return {
        width: 1 + (((bytes[22] & 63) << 8) | bytes[21]),
        height:
          1 + (((bytes[24] & 15) << 10) | (bytes[23] << 2) | (bytes[22] >> 6)),
        type: "image/webp",
        extension: "webp",
      };
  }
  if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216) {
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset++] !== 255) return null;
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      if (offset + 2 > bytes.length) return null;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) return null;
      if (
        [
          192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207,
        ].includes(marker) &&
        length >= 7
      )
        return {
          width: view.getUint16(offset + 5),
          height: view.getUint16(offset + 3),
          type: "image/jpeg",
          extension: "jpg",
        };
      offset += length;
    }
  }
  return null;
}
