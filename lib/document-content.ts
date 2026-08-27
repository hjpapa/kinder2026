export type DocumentInline = { text: string; bold: boolean };

export type DocumentBlock =
  | { type: "paragraph"; text: string }
  | { type: "subheading"; level: 3 | 4; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "checklist"; items: Array<{ text: string; checked: boolean }> }
  | { type: "table"; headers: string[]; rows: string[][] };

const SUBHEADING = /^(#{3,4})\s+(.+)$/;
const CHECKLIST_ITEM = /^\s*[-*]\s+\[([ xX])\]\s+(.+)$/;
const BULLET_ITEM = /^(\s*)[-*]\s+(.+)$/;
const TABLE_DIVIDER_CELL = /^:?-{3,}:?$/;
const BOLD_TEXT = /\*\*([^*]+)\*\*/g;

function splitTableRow(line: string) {
  const value = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells: string[] = [];
  let current = "";
  let escaped = false;

  for (const character of value) {
    if (escaped) {
      current += character === "|" ? "|" : `\\${character}`;
      escaped = false;
      continue;
    }
    if (character === "\\") {
      escaped = true;
      continue;
    }
    if (character === "|") {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += character;
  }
  if (escaped) current += "\\";
  cells.push(current.trim());
  return cells;
}

function isTableDivider(line: string, expectedCells: number) {
  const cells = splitTableRow(line);
  return cells.length === expectedCells && cells.every((cell) => TABLE_DIVIDER_CELL.test(cell));
}

function isPotentialTableRow(line: string, expectedCells: number) {
  if (!line.includes("|")) return false;
  return splitTableRow(line).length === expectedCells;
}

export function parseDocumentContent(content: string): DocumentBlock[] {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const blocks: DocumentBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const heading = line.match(SUBHEADING);
    if (heading) {
      blocks.push({ type: "subheading", level: heading[1].length as 3 | 4, text: heading[2].trim() });
      index += 1;
      continue;
    }

    const headers = line.includes("|") ? splitTableRow(line) : [];
    if (headers.length > 1 && index + 1 < lines.length && isTableDivider(lines[index + 1], headers.length)) {
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && isPotentialTableRow(lines[index], headers.length)) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      blocks.push({ type: "table", headers, rows });
      continue;
    }

    const checklist = line.match(CHECKLIST_ITEM);
    if (checklist) {
      const items: Array<{ text: string; checked: boolean }> = [];
      while (index < lines.length) {
        const item = lines[index].match(CHECKLIST_ITEM);
        if (!item) break;
        items.push({ text: item[2].trim(), checked: item[1].toLowerCase() === "x" });
        index += 1;
      }
      blocks.push({ type: "checklist", items });
      continue;
    }

    const bullet = line.match(BULLET_ITEM);
    if (bullet) {
      const items: string[] = [];
      while (index < lines.length) {
        const item = lines[index].match(BULLET_ITEM);
        if (!item || CHECKLIST_ITEM.test(lines[index])) break;
        if (item[1].length && items.length) items[items.length - 1] = `${items[items.length - 1]}\n${item[2].trim()}`;
        else items.push(item[2].trim());
        index += 1;
      }
      blocks.push({ type: "bullets", items });
      continue;
    }

    const paragraphLines = [line.trim()];
    index += 1;
    while (index < lines.length && lines[index].trim()) {
      const next = lines[index];
      const nextHeaders = next.includes("|") ? splitTableRow(next) : [];
      const startsTable = nextHeaders.length > 1 && index + 1 < lines.length && isTableDivider(lines[index + 1], nextHeaders.length);
      if (SUBHEADING.test(next) || CHECKLIST_ITEM.test(next) || BULLET_ITEM.test(next) || startsTable) break;
      paragraphLines.push(next.trim());
      index += 1;
    }
    blocks.push({ type: "paragraph", text: paragraphLines.join("\n") });
  }

  return blocks;
}

export function parseInlineText(value: string): DocumentInline[] {
  const parts: DocumentInline[] = [];
  let cursor = 0;
  BOLD_TEXT.lastIndex = 0;
  for (const match of value.matchAll(BOLD_TEXT)) {
    const start = match.index ?? 0;
    if (start > cursor) parts.push({ text: value.slice(cursor, start), bold: false });
    parts.push({ text: match[1], bold: true });
    cursor = start + match[0].length;
  }
  if (cursor < value.length) parts.push({ text: value.slice(cursor), bold: false });
  return parts.length ? parts : [{ text: value, bold: false }];
}

export function documentContentToPlainText(content: string) {
  return parseDocumentContent(content).flatMap((block) => {
    if (block.type === "table") return [block.headers.join(" · "), ...block.rows.map((row) => row.join(" · "))];
    if (block.type === "bullets") return block.items;
    if (block.type === "checklist") return block.items.map((item) => item.text);
    return [block.text];
  }).join("\n").replace(/\*\*/g, "");
}
