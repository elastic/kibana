#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Build script for generating a rich MITRE ATT&CK JSON artifact.
 *
 * Usage:
 *   node x-pack/solutions/security/plugins/mitre_attack/scripts/build_mitre_artifact.js
 *   node x-pack/solutions/security/plugins/mitre_attack/scripts/build_mitre_artifact.js --file /path/to/enterprise-attack.json
 *   node x-pack/solutions/security/plugins/mitre_attack/scripts/build_mitre_artifact.js --version v19.1
 *
 * Output: x-pack/solutions/security/plugins/mitre_attack/artifacts/mitre_artifact.json
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const https = require('https');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MITRE_CONTENT_VERSION = 'ATT&CK-v19.1';
const MITRE_CONTENT_URL = `https://raw.githubusercontent.com/mitre/cti/${MITRE_CONTENT_VERSION}/enterprise-attack/enterprise-attack.json`;

const OUTPUT_PATH = path.resolve(__dirname, '..', 'artifacts', 'mitre_artifact.json');

const FRAMEWORK = 'enterprise';

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const fileArgIdx = args.indexOf('--file');
const versionArgIdx = args.indexOf('--version');

const localFilePath = fileArgIdx !== -1 ? args[fileArgIdx + 1] : null;
const versionOverride = versionArgIdx !== -1 ? args[versionArgIdx + 1] : null;

// ---------------------------------------------------------------------------
// Validation helpers (manual structural validation — no external deps needed)
// ---------------------------------------------------------------------------

function validateString(value, fieldName, entityId) {
  if (typeof value !== 'string') {
    throw new Error(
      `Validation error: field "${fieldName}" must be a string on entity ${entityId}, got ${typeof value}`
    );
  }
}

function validateBoolean(value, fieldName, entityId) {
  if (typeof value !== 'boolean') {
    throw new Error(
      `Validation error: field "${fieldName}" must be a boolean on entity ${entityId}, got ${typeof value}`
    );
  }
}

function validateNumber(value, fieldName, entityId) {
  if (typeof value !== 'number') {
    throw new Error(
      `Validation error: field "${fieldName}" must be a number on entity ${entityId}, got ${typeof value}`
    );
  }
}

function validateArray(value, fieldName, entityId) {
  if (!Array.isArray(value)) {
    throw new Error(
      `Validation error: field "${fieldName}" must be an array on entity ${entityId}, got ${typeof value}`
    );
  }
}

function validateEntity(entity) {
  const id = entity.id || '<unknown>';
  validateString(entity.framework, 'framework', id);
  validateString(entity.framework_version, 'framework_version', id);
  validateString(entity.id, 'id', id);
  validateString(entity.name, 'name', id);
  validateString(entity.reference, 'reference', id);
  validateString(entity.description, 'description', id);
  validateBoolean(entity.revoked, 'revoked', id);
  validateBoolean(entity.deprecated, 'deprecated', id);

  if (entity.superseded_by_id !== undefined) {
    validateArray(entity.superseded_by_id, 'superseded_by_id', id);
    entity.superseded_by_id.forEach((s, i) => validateString(s, `superseded_by_id[${i}]`, id));
  }

  if (entity.type === 'tactic') {
    validateNumber(entity.position, 'position', id);
  } else if (entity.type === 'technique') {
    validateArray(entity.tactic_ids, 'tactic_ids', id);
    entity.tactic_ids.forEach((t, i) => validateString(t, `tactic_ids[${i}]`, id));
  } else if (entity.type === 'subtechnique') {
    validateArray(entity.tactic_ids, 'tactic_ids', id);
    entity.tactic_ids.forEach((t, i) => validateString(t, `tactic_ids[${i}]`, id));
    validateString(entity.technique_id, 'technique_id', id);
  } else {
    throw new Error(`Validation error: unknown entity type "${entity.type}" on entity ${id}`);
  }
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    console.log(`Fetching: ${url}`);
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
          return;
        }
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
          } catch (e) {
            reject(new Error(`Failed to parse JSON from ${url}: ${e.message}`));
          }
        });
        res.on('error', reject);
      })
      .on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// Reference helpers
// ---------------------------------------------------------------------------

function normalizeThreatReference(reference) {
  try {
    const parsed = new URL(reference);
    if (!parsed.pathname.endsWith('/')) {
      parsed.pathname = `${parsed.pathname}/`;
    }
    return parsed.toString();
  } catch {
    return reference;
  }
}

function getMitreReference(externalReferences) {
  const ref = (externalReferences || []).find((r) => r.source_name === 'mitre-attack');
  if (!ref) return null;
  return {
    id: ref.external_id,
    reference: normalizeThreatReference(ref.url),
  };
}

// ---------------------------------------------------------------------------
// Main parsing logic
// ---------------------------------------------------------------------------

function buildArtifact(stixBundle, versionOverride) {
  const objects = stixBundle.objects;

  // Find framework version from x-mitre-collection object
  const collection = objects.find((o) => o.type === 'x-mitre-collection');
  let frameworkVersion =
    collection && collection.x_mitre_version ? collection.x_mitre_version : null;

  if (!frameworkVersion) {
    // Fallback: try to find version from marking definitions
    const marking = objects.find(
      (o) => o.type === 'marking-definition' && o.definition && o.definition.statement
    );
    frameworkVersion = marking ? null : null; // no version in marking defs typically
  }

  if (!frameworkVersion && versionOverride) {
    frameworkVersion = versionOverride.replace(/^v/, '');
    console.log(`Using --version override: ${frameworkVersion}`);
  }

  if (!frameworkVersion) {
    // Last resort: extract from the MITRE_CONTENT_VERSION constant
    frameworkVersion = MITRE_CONTENT_VERSION.replace(/^ATT&CK-v/, '');
    console.log(`Falling back to script constant version: ${frameworkVersion}`);
  }

  console.log(`Framework version: ${frameworkVersion}`);

  // Index objects by STIX id for relationship resolution
  const objectById = new Map();
  for (const obj of objects) {
    if (obj.id) objectById.set(obj.id, obj);
  }

  // Build revoked-by map: stixId -> array of MITRE external_ids that supersede it
  const revokedByMap = new Map(); // stixId -> Set of MITRE external_ids
  for (const obj of objects) {
    if (obj.type === 'relationship' && obj.relationship_type === 'revoked-by') {
      const sourceId = obj.source_ref;
      const targetObj = objectById.get(obj.target_ref);
      if (targetObj) {
        const targetRef = getMitreReference(targetObj.external_references);
        if (targetRef && targetRef.id) {
          if (!revokedByMap.has(sourceId)) revokedByMap.set(sourceId, new Set());
          revokedByMap.get(sourceId).add(targetRef.id);
        }
      }
    }
  }

  // Build tactic shortname -> MITRE id map, and STIX id -> position from matrix
  const tacticByShortname = new Map(); // shortname -> { mitreId, stixId }
  const tacticPositionByStixId = new Map(); // stixId -> position (0-indexed)

  const matrix = objects.find((o) => o.type === 'x-mitre-matrix');
  if (!matrix) throw new Error('No x-mitre-matrix found in STIX bundle');

  const tacticRefs = matrix.tactic_refs || [];
  tacticRefs.forEach((stixId, idx) => {
    tacticPositionByStixId.set(stixId, idx);
  });

  // Extract tactics first so we can resolve tactic_ids for techniques
  const tacticStixObjects = objects.filter((o) => o.type === 'x-mitre-tactic');
  for (const tac of tacticStixObjects) {
    const ref = getMitreReference(tac.external_references);
    if (!ref || !ref.id) continue;
    if (tac.x_mitre_shortname) {
      tacticByShortname.set(tac.x_mitre_shortname, { mitreId: ref.id, stixId: tac.id });
    }
  }

  const entities = [];
  let countTactics = 0;
  let countTechniques = 0;
  let countSubtechniques = 0;
  let countRevoked = 0;
  let countDeprecated = 0;

  // --- Tactics ---
  for (const tac of tacticStixObjects) {
    const ref = getMitreReference(tac.external_references);
    if (!ref || !ref.id) continue;

    const position = tacticPositionByStixId.get(tac.id);
    if (position === undefined) {
      console.warn(
        `Warning: tactic ${ref.id} (${tac.id}) not found in matrix tactic_refs, assigning position -1`
      );
    }

    const revoked = tac.revoked === true;
    const deprecated = tac.x_mitre_deprecated === true;
    if (revoked) countRevoked++;
    if (deprecated) countDeprecated++;

    const supersededByIds = revokedByMap.has(tac.id)
      ? Array.from(revokedByMap.get(tac.id))
      : undefined;

    const entity = {
      type: 'tactic',
      framework: FRAMEWORK,
      framework_version: frameworkVersion,
      id: ref.id,
      name: tac.name,
      reference: ref.reference,
      description: tac.description || '',
      revoked,
      deprecated,
      position: position !== undefined ? position : -1,
    };

    if (supersededByIds) entity.superseded_by_id = supersededByIds;

    validateEntity(entity);
    entities.push(entity);
    countTactics++;
  }

  // --- Techniques and Subtechniques ---
  const attackPatterns = objects.filter((o) => o.type === 'attack-pattern');

  for (const ap of attackPatterns) {
    const ref = getMitreReference(ap.external_references);
    if (!ref || !ref.id) continue;

    const isSubtechnique = ap.x_mitre_is_subtechnique === true;
    const revoked = ap.revoked === true;
    const deprecated = ap.x_mitre_deprecated === true;

    // Resolve tactic_ids from kill_chain_phases
    const tacticIds = [];
    for (const phase of ap.kill_chain_phases || []) {
      if (phase.kill_chain_name !== 'mitre-attack') continue;
      const tacticInfo = tacticByShortname.get(phase.phase_name);
      if (!tacticInfo) {
        throw new Error(
          `Cannot resolve tactic for phase_name "${phase.phase_name}" on ${ref.id} (${ap.id}). ` +
            `Known shortnames: ${Array.from(tacticByShortname.keys()).join(', ')}`
        );
      }
      tacticIds.push(tacticInfo.mitreId);
    }

    if (revoked) countRevoked++;
    if (deprecated) countDeprecated++;

    const supersededByIds = revokedByMap.has(ap.id)
      ? Array.from(revokedByMap.get(ap.id))
      : undefined;

    if (isSubtechnique) {
      const techniqueId = ref.id.split('.')[0];

      const entity = {
        type: 'subtechnique',
        framework: FRAMEWORK,
        framework_version: frameworkVersion,
        id: ref.id,
        name: ap.name,
        reference: ref.reference,
        description: ap.description || '',
        revoked,
        deprecated,
        tactic_ids: tacticIds,
        technique_id: techniqueId,
      };

      if (supersededByIds) entity.superseded_by_id = supersededByIds;

      validateEntity(entity);
      entities.push(entity);
      countSubtechniques++;
    } else {
      const entity = {
        type: 'technique',
        framework: FRAMEWORK,
        framework_version: frameworkVersion,
        id: ref.id,
        name: ap.name,
        reference: ref.reference,
        description: ap.description || '',
        revoked,
        deprecated,
        tactic_ids: tacticIds,
      };

      if (supersededByIds) entity.superseded_by_id = supersededByIds;

      validateEntity(entity);
      entities.push(entity);
      countTechniques++;
    }
  }

  // Compute a content hash over the entities array (sorted by id for reproducibility).
  // The hash lets the gate detect rebuilt artifacts even when framework_version is unchanged.
  const sortedForHash = [...entities].sort((a, b) => {
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });
  const contentHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(sortedForHash))
    .digest('hex');

  return {
    artifact: {
      framework: FRAMEWORK,
      framework_version: frameworkVersion,
      content_hash: contentHash,
      entities,
    },
    stats: {
      tactics: countTactics,
      techniques: countTechniques,
      subtechniques: countSubtechniques,
      revoked: countRevoked,
      deprecated: countDeprecated,
      total: entities.length,
    },
    contentHash,
  };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  let stixBundle;

  if (localFilePath) {
    console.log(`Reading local file: ${localFilePath}`);
    const raw = fs.readFileSync(localFilePath, 'utf8');
    stixBundle = JSON.parse(raw);
  } else {
    stixBundle = await fetchJson(MITRE_CONTENT_URL);
  }

  console.log(`Loaded STIX bundle with ${stixBundle.objects.length} objects`);

  const { artifact, stats, contentHash } = buildArtifact(stixBundle, versionOverride);

  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(artifact, null, 2), 'utf8');

  console.log('\n=== Build Summary ===');
  console.log(`Framework version : ${artifact.framework_version}`);
  console.log(`Content hash      : ${contentHash}`);
  console.log(`Tactics           : ${stats.tactics}`);
  console.log(`Techniques        : ${stats.techniques}`);
  console.log(`Subtechniques     : ${stats.subtechniques}`);
  console.log(`Total entities    : ${stats.total}`);
  console.log(`Revoked           : ${stats.revoked}`);
  console.log(`Deprecated        : ${stats.deprecated}`);
  console.log(`\nArtifact written to: ${OUTPUT_PATH}`);
  console.log(`File size: ${(fs.statSync(OUTPUT_PATH).size / 1024 / 1024).toFixed(2)} MB`);
}

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
