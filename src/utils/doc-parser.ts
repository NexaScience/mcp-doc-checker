import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

// 許可する拡張子
const ALLOWED_EXTENSIONS = ['.docx', '.xlsx'];

// プレースホルダーの正規表現: {{field_name}}
const PLACEHOLDER_PATTERN = /\{\{([^}]+)\}\}/g;

/**
 * ファイル拡張子が許可されているかチェック
 */
export function validateFileExtension(filePath: string): void {
  const ext = path.extname(filePath).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`Unsupported file type: ${ext}. Only .docx and .xlsx are allowed.`);
  }
}

/**
 * ファイルが存在するかチェック
 */
export function validateFileExists(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
}

/**
 * ファイルからテキストを抽出する
 * .docx: mammoth でテキスト抽出
 * .xlsx: SheetJS で全セル値を結合
 */
export async function extractText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } else if (ext === '.xlsx') {
    const wb = XLSX.readFile(filePath);
    const texts: string[] = [];
    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(ws, { header: 1 });
      for (const row of data) {
        for (const cell of row) {
          if (cell !== null && cell !== undefined) {
            texts.push(String(cell));
          }
        }
      }
    }
    return texts.join(' ');
  }
  throw new Error(`Unsupported file type: ${ext}`);
}

/**
 * テキストからプレースホルダー名の一覧を重複なしで抽出する
 * 例: "{{氏名}} {{住所}} {{氏名}}" → ["氏名", "住所"]
 */
export function extractPlaceholders(text: string): string[] {
  const names = new Set<string>();
  const regex = new RegExp(PLACEHOLDER_PATTERN.source, PLACEHOLDER_PATTERN.flags);
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    names.add(match[1].trim());
  }
  return Array.from(names);
}
