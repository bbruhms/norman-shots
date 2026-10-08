// Norman Shots: pulls pending screenshots from GitHub into the analysis cards.
// Reads shots/index.json, finds each card frame by name, and fills its
// "#img.NN" slots. Slots that already hold the same file are skipped.

const BASE = "https://raw.githubusercontent.com/bbruhms/norman-shots/main/";

async function run() {
  const res = await fetch(BASE + "shots/index.json?t=" + Date.now());
  if (!res.ok) throw new Error("Could not read index.json (" + res.status + ")");
  const index = await res.json();

  await figma.loadAllPagesAsync();

  let placed = 0;
  let skipped = 0;
  const missingCards = [];
  const failed = [];

  for (const card of index.cards || []) {
    const frame = figma.root.findOne(
      (n) => n.type === "FRAME" && n.name === card.name
    );
    if (!frame) {
      missingCards.push(card.name);
      continue;
    }
    for (const [slot, path] of Object.entries(card.images || {})) {
      const node = frame.findOne((n) => n.name === "#img." + slot);
      if (!node || !("fills" in node)) {
        failed.push(card.name + " #" + slot + " (no slot)");
        continue;
      }
      if (node.getPluginData("src") === path) {
        skipped++;
        continue;
      }
      try {
        const img = await figma.createImageAsync(BASE + path + "?t=" + Date.now());
        node.fills = [{ type: "IMAGE", imageHash: img.hash, scaleMode: "FILL" }];
        node.setPluginData("src", path);
        placed++;
      } catch (e) {
        failed.push(card.name + " #" + slot);
      }
    }
  }

  let msg = placed + " image(s) placed";
  if (skipped) msg += ", " + skipped + " already up to date";
  if (missingCards.length) msg += ". Cards not found: " + missingCards.join(", ");
  if (failed.length) msg += ". Failed: " + failed.join(", ");
  return msg;
}

run()
  .then((msg) => figma.closePlugin(msg))
  .catch((e) => figma.closePlugin("Norman Shots error: " + e.message));
