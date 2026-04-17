const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const SVG_DIR_LOCAL = path.join(__dirname, "public", "achievement-icons");
const SVG_DIR_CLIENT = path.join(
  __dirname,
  "..",
  "client",
  "public",
  "achievement-icons",
);
const SVG_DIR = fs.existsSync(SVG_DIR_LOCAL) ? SVG_DIR_LOCAL : SVG_DIR_CLIENT;
const PNG_DIR = path.join(__dirname, "public", "achievement-icons-png");
const SIZE = 128;

async function convertIcons() {
  if (!fs.existsSync(SVG_DIR)) {
    console.log(
      "No achievement-icons source directory found, skipping icon conversion",
    );
    return;
  }

  fs.mkdirSync(PNG_DIR, { recursive: true });

  const svgFiles = fs.readdirSync(SVG_DIR).filter((f) => f.endsWith(".svg"));
  let converted = 0;
  let skipped = 0;

  for (const svgFile of svgFiles) {
    const pngFile = svgFile.replace(".svg", ".png");
    const svgPath = path.join(SVG_DIR, svgFile);
    const pngPath = path.join(PNG_DIR, pngFile);

    // Skip if PNG exists and is newer than the SVG
    if (fs.existsSync(pngPath)) {
      const svgMtime = fs.statSync(svgPath).mtimeMs;
      const pngMtime = fs.statSync(pngPath).mtimeMs;
      if (pngMtime >= svgMtime) {
        skipped++;
        continue;
      }
    }

    try {
      await sharp(svgPath)
        .resize(SIZE, SIZE, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toFile(pngPath);
      converted++;
    } catch (err) {
      console.error(`  Failed to convert ${svgFile}:`, err.message);
    }
  }

  // Clean up PNGs whose SVG source no longer exists
  const pngFiles = fs.readdirSync(PNG_DIR).filter((f) => f.endsWith(".png"));
  let removed = 0;
  for (const pngFile of pngFiles) {
    const svgFile = pngFile.replace(".png", ".svg");
    if (!fs.existsSync(path.join(SVG_DIR, svgFile))) {
      fs.unlinkSync(path.join(PNG_DIR, pngFile));
      removed++;
    }
  }

  if (converted > 0 || removed > 0) {
    console.log(
      `Icon conversion: ${converted} converted, ${skipped} up-to-date, ${removed} removed`,
    );
  } else {
    console.log(`Icon conversion: all ${skipped} icons up-to-date`);
  }
}

module.exports = { convertIcons };
