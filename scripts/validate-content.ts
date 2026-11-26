import Ajv from 'ajv';
import fs from 'node:fs';
import path from 'node:path';
import type { ContentPack, RightsManifest } from '../src/domain/types';
import { isRightsApprovedForDistribution, normalizeNfc } from '../src/domain/readingRules';
import { OPEN_CONTENT_PACK } from '../src/data/openContentPack';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  approvedEditionIds: string[];
  blockedEditionIds: string[];
}

export function validateContentPack(
  pack: ContentPack,
  options: { productionMode?: boolean } = {}
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const approvedEditionIds: string[] = [];
  const blockedEditionIds: string[] = [];

  const schemaPath = path.resolve(__dirname, '../src/domain/rights-manifest.schema.json');
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
  const ajv = new Ajv({ allErrors: true });
  const validateSchema = ajv.compile<RightsManifest>(schema);

  if (!validateSchema(pack.manifest)) {
    for (const err of validateSchema.errors ?? []) {
      errors.push(`Schema error at ${err.instancePath || '/'}: ${err.message}`);
    }
  }

  const entryByEdition = new Map(pack.manifest.entries.map((e) => [e.editionId, e]));

  for (const entry of pack.manifest.entries) {
    const allowed = isRightsApprovedForDistribution(entry, {
      allowSyntheticInDev: !options.productionMode,
    });
    if (allowed) {
      approvedEditionIds.push(entry.editionId);
    } else {
      blockedEditionIds.push(entry.editionId);
      if (options.productionMode && entry.isSyntheticTestFixture) {
        errors.push(
          `Production build blocked: synthetic fixture edition "${entry.editionId}" cannot ship in production.`
        );
      }
    }
  }

  for (const edition of pack.editions) {
    const entry = entryByEdition.get(edition.id);
    if (!entry) {
      errors.push(`Edition "${edition.id}" is missing a rights manifest entry.`);
      continue;
    }
    if (entry.status !== 'approved') {
      errors.push(
        `Edition "${edition.id}" is included in editions list but has non-approved rights status "${entry.status}".`
      );
    }
  }

  // Check duplicate segment IDs, section references, and ordinal uniqueness within work
  const sectionIds = new Set(pack.sections.map((s) => s.id));
  const segmentIds = new Set<string>();
  const workOrdinals = new Set<string>();
  const countByWork = new Map<string, number>();

  for (const seg of pack.segments) {
    if (segmentIds.has(seg.id)) {
      errors.push(`Duplicate segment id "${seg.id}".`);
    }
    segmentIds.add(seg.id);
    if (!sectionIds.has(seg.sectionId)) {
      errors.push(`Segment "${seg.id}" references unknown sectionId "${seg.sectionId}".`);
    }
    const ordKey = `${seg.workId}::${seg.ordinal}`;
    if (workOrdinals.has(ordKey)) {
      errors.push(`Duplicate segment ordinal "${seg.ordinal}" in work "${seg.workId}".`);
    }
    workOrdinals.add(ordKey);
    countByWork.set(seg.workId, (countByWork.get(seg.workId) ?? 0) + 1);
  }

  for (const w of pack.works) {
    const actual = countByWork.get(w.id) ?? 0;
    if (actual !== w.totalSegments) {
      errors.push(`Work "${w.id}" declares totalSegments=${w.totalSegments}, found ${actual}.`);
    }
  }

  // Check NFC normalization and non-empty text on segment texts
  for (const st of pack.segmentTexts) {
    if (!st.text || st.text.trim().length === 0) {
      errors.push(`SegmentText (${st.segmentId}, ${st.editionId}) has empty text.`);
    }
    if (st.text !== normalizeNfc(st.text)) {
      warnings.push(`SegmentText (${st.segmentId}, ${st.editionId}) is not NFC normalized.`);
    }
    if (!segmentIds.has(st.segmentId)) {
      errors.push(`SegmentText references unknown segmentId "${st.segmentId}".`);
    }
  }

  for (const ann of pack.annotations) {
    if (ann.reviewStatus !== 'approved') {
      warnings.push(`Annotation "${ann.id}" has reviewStatus="${ann.reviewStatus}" and will be excluded from UI.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    approvedEditionIds,
    blockedEditionIds,
  };
}

if (require.main === module) {
  const productionMode = process.argv.includes('--production');
  const result = validateContentPack(OPEN_CONTENT_PACK, { productionMode });
  console.log('Content Validation Result:', JSON.stringify(result, null, 2));
  if (!result.valid) {
    process.exit(1);
  }
}
