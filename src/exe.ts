import fs from "node:fs";
import bufferpack from "bufferpack";
import { Buffer } from "node:buffer";

function read(f: number, size: number, offset: number) {
  if (typeof size == "undefined") size = 1;
  if (typeof offset == "undefined") offset = -1;

  const buffer = Buffer.alloc(size);
  fs.readSync(f, buffer, 0, size, offset);
  return buffer;
}

export function convertExeToConsoleOrWindowMode(
  srcPath: string,
  destPath: string,
  mode: "to_console" | "to_windows"
) {
  if (srcPath === destPath) {
    throw new Error("Source and destination paths must be different.");
  }

  const source = fs.openSync(srcPath, "r");
  const dest = fs.openSync(destPath, "w+");
  fs.writeSync(dest, read(source, fs.statSync(srcPath).size, 0));

  const PeHeaderOffset = bufferpack.unpack("<H", read(dest, 2, 0x3c)).pop();
  const PeSignature = bufferpack.unpack("<I", read(dest, 4, PeHeaderOffset)).pop();
  if (PeSignature != 0x4550) {
    fs.closeSync(source);
    fs.closeSync(dest);
    fs.unlinkSync(destPath);
    throw new Error("Error in Find PE header");
  }

  if (mode == "to_console") {
    // console mode
    fs.writeSync(dest, bufferpack.pack("<H", [0x03]), 0, 1, PeHeaderOffset + 0x5c);
  } else if (mode == "to_windows") {
    // window mode
    fs.writeSync(dest, bufferpack.pack("<H", [0x02]), 0, 1, PeHeaderOffset + 0x5c);
  }

  fs.closeSync(source);
  fs.closeSync(dest);
}
