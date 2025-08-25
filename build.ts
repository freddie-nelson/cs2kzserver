import { execSync } from "node:child_process";
import JSZip from "jszip";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";

execSync("deno run build:server");

const zip = JSZip();

zip.file("cs2servermanager.exe", readFileSync("cs2servermanager.exe"));
zip.file(".env", readFileSync(".env"));

const copyFolderToZip = (folderPath: string, zipFolder: JSZip) => {
  for (const file of readdirSync(folderPath)) {
    const filePath = `${folderPath}/${file}`;

    if (statSync(filePath).isDirectory()) {
      const zipSubFolder = zipFolder.folder(file);
      copyFolderToZip(filePath, zipSubFolder!);
    } else {
      zipFolder.file(file, readFileSync(filePath));
    }
  }
};

copyFolderToZip("configs", zip.folder("configs")!);
copyFolderToZip("client/dist", zip.folder("client")!.folder("dist")!);

await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }).then((content) => {
  writeFileSync("cs2servermanager.zip", content);
  console.log("Build complete: cs2servermanager.zip");
});
