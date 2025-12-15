import fs from "fs/promises";
import path from "path";
import os from "os";
import crypto from "crypto";
import fetch from "node-fetch";

export async function downloadPdfToTemp(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch PDF: ${res.status} ${res.statusText}`);
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const hash = crypto.createHash("sha256").update(url).digest("hex").slice(0, 12);
    const tmpPath = path.join(os.tmpdir(), `pdf-${hash}.pdf`);
    await fs.writeFile(tmpPath, buffer);
    return tmpPath;
}

export function pdfNamespaceFromUrl(url) {
    return `pdf-${crypto.createHash("sha256").update(url).digest("hex").slice(0, 12)}`;
}
