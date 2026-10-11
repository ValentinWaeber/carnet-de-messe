export const safeFilename = (title: string) =>
  title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 -]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 90) || "mon-carnet";
