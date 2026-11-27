import fs from 'node:fs';
import path from 'node:path';
import type { BulgyodaejeonCardRecord } from './import-bulgyodaejeon';

interface ReviewQueueRow {
  id: string;
  part_id: number;
  start_page: number;
  end_page: number;
  source_title_candidate: string;
  normalized_ocr: string;
  speaker_candidate?: string;
}

interface PageRow {
  file_page: number;
  printed_page: number | null;
}

function getArg(name: string, fallback: string): string {
  const found = process.argv.find((a) => a.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : fallback;
}

function main() {
  const defaultDbDir =
    '/Users/kobujang/.gemini/antigravity/brain/e4a725b9-9cff-477a-99be-112e113120d8/scratch/bulgyodaejeon_zip/Bulgyodaejeon_DB_v1';
  const dbDir = path.resolve(getArg('db-dir', defaultDbDir));
  const partFilter = Number(getArg('part', '0'));
  const limit = Number(getArg('limit', '20'));
  const outFile = getArg('out', '');

  const cardsPath = path.resolve(process.cwd(), 'assets/content/bulgyodaejeon-cards.json');
  const existingCards = JSON.parse(
    fs.readFileSync(cardsPath, 'utf-8')
  ) as BulgyodaejeonCardRecord[];
  const existingIds = new Set(existingCards.map((c) => c.id));

  const queue = JSON.parse(
    fs.readFileSync(path.join(dbDir, 'citations_review_queue.json'), 'utf-8')
  ) as ReviewQueueRow[];
  const pages = JSON.parse(
    fs.readFileSync(path.join(dbDir, 'pages.json'), 'utf-8')
  ) as PageRow[];

  const pageMap = new Map<number, number>();
  for (const p of pages) {
    if (typeof p.printed_page === 'number') pageMap.set(p.file_page, p.printed_page);
  }

  const candidates = queue
    .filter((row) => !existingIds.has(row.id))
    .filter((row) => (partFilter > 0 ? row.part_id === partFilter : true))
    .filter((row) => {
      const txt = (row.normalized_ocr || '').trim();
      return (
        txt.length >= 35 &&
        txt.length <= 220 &&
        Boolean(row.source_title_candidate?.trim()) &&
        !txt.includes('□')
      );
    })
    .slice(0, limit)
    .map<BulgyodaejeonCardRecord>((row) => ({
      id: row.id,
      part_id: row.part_id,
      printed_start: pageMap.get(row.start_page) ?? row.start_page,
      printed_end: pageMap.get(row.end_page) ?? row.end_page,
      source_ko: row.source_title_candidate.trim(),
      source_en: '',
      speaker_ko: (row.speaker_candidate || '경전의 설명').trim(),
      speaker_en: 'Sūtra narration',
      topics: '수행,지혜',
      normalized_ocr: row.normalized_ocr.trim(),
      app_paraphrase: '',
      translation_ko: '',
      app_paraphrase_en: '',
      translation_en: '',
    }));

  const payload = JSON.stringify(candidates, null, 2);
  if (outFile) {
    fs.writeFileSync(path.resolve(outFile), payload, 'utf-8');
    console.log(`Exported ${candidates.length} candidate stubs to ${outFile}.`);
  } else {
    console.log(payload);
  }
}

main();
