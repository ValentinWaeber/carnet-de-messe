import { readdir, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";

// The inbox is read directly from disk, never exposed through a public HTTP endpoint.
const directory = resolve(process.env.DATA_DIR || ".data", "mail");
const files = (await readdir(directory).catch(() => []))
  .filter((name) => name.endsWith(".json"))
  .sort()
  .slice(-20);
if (!files.length)
  console.log(
    "La boîte de test est vide. Inscrivez-vous sur le site, puis relancez npm run mail:dev.",
  );
for (const file of files) {
  const mail = JSON.parse(await readFile(join(directory, file), "utf8"));
  console.log(`\n${mail.createdAt} · ${mail.to}\n${mail.text}\n`);
}
