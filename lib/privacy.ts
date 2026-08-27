export type AnonymizeResult = {
  text: string;
  replacements: Array<{ original: string; replacement: string }>;
  maskedTypes: string[];
};

const masks = [
  { label: "전화번호", pattern: /\b(?:01[016789][- ]?\d{3,4}[- ]?\d{4}|0\d{1,2}[- ]?\d{3,4}[- ]?\d{4})\b/g },
  { label: "이메일", pattern: /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/gi },
  { label: "주민등록번호 형태", pattern: /\b\d{6}[- ]?[1-4]\d{6}\b/g },
  { label: "상세 주소 후보", pattern: /(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)[^\n,]{0,30}(?:로|길|동)\s?\d{1,4}(?:-\d{1,4})?/g },
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseNames(value: string) {
  return [...new Set(value.split(/[,\n]/).map((name) => name.trim()).filter(Boolean))].slice(0, 20);
}

export function anonymizeText(source: string, names: string[]): AnonymizeResult {
  let text = source;
  const replacements = names.map((name, index) => ({ original: name, replacement: `유아 ${String.fromCharCode(65 + index)}` }));
  for (const item of replacements) {
    text = text.replace(new RegExp(escapeRegExp(item.original), "g"), item.replacement);
  }
  const maskedTypes: string[] = [];
  for (const mask of masks) {
    if (mask.pattern.test(text)) maskedTypes.push(mask.label);
    mask.pattern.lastIndex = 0;
    text = text.replace(mask.pattern, `[${mask.label} 마스킹]`);
    mask.pattern.lastIndex = 0;
  }
  return { text, replacements, maskedTypes };
}

export function containsSensitivePattern(text: string) {
  return masks.some((mask) => {
    const found = mask.pattern.test(text);
    mask.pattern.lastIndex = 0;
    return found;
  });
}

export function needsConcreteEvidence(text: string) {
  const compact = text.replace(/\s/g, "");
  return /아이들이?(매우)?(좋아했|즐거워했|재미있어했)|반응이좋았/.test(compact) && text.length < 120;
}
