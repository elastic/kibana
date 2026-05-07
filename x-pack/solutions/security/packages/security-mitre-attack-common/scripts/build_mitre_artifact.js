/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('@kbn/setup-node-env');

const fs = require('fs');
const path = require('path');
// eslint-disable-next-line import/no-extraneous-dependencies
const { sortBy } = require('lodash');

/**
 * Pinned MITRE content version. Bump alongside the prebuilt-rules package
 * upgrade — same cadence as the previous `extract_tactics_techniques_mitre.js`
 * flow.
 */
const MITRE_CONTENT_VERSION = 'ATT&CK-v18.1';

/**
 * Source list. POC ships only ATT&CK Enterprise. ATLAS / Mobile / ICS plug
 * in by appending more entries — the rest of the script is framework-agnostic.
 *
 * ATLAS lives in a separate repo (mitre-atlas/atlas-data) but uses the same
 * STIX 2.1 format, so it can be added without changing the parsing logic. See
 * https://github.com/mitre-atlas/atlas-navigator-data/tree/main/dist for the
 * pre-generated bundles.
 */
const SOURCES = [
  {
    framework: 'enterprise',
    version: MITRE_CONTENT_VERSION,
    url: `https://raw.githubusercontent.com/mitre/cti/${MITRE_CONTENT_VERSION}/enterprise-attack/enterprise-attack.json`,
    sourceName: 'mitre-attack',
  },
  // Future additions:
  // {
  //   framework: 'atlas',
  //   version: 'ATLAS-v5.5.0',
  //   url: 'https://raw.githubusercontent.com/mitre-atlas/atlas-navigator-data/main/dist/stix-atlas.json',
  //   sourceName: 'mitre-atlas',
  // },
  // { framework: 'mobile', version: MITRE_CONTENT_VERSION,
  //   url: `https://raw.githubusercontent.com/mitre/cti/${MITRE_CONTENT_VERSION}/mobile-attack/mobile-attack.json`,
  //   sourceName: 'mitre-attack' },
  // { framework: 'ics', version: MITRE_CONTENT_VERSION,
  //   url: `https://raw.githubusercontent.com/mitre/cti/${MITRE_CONTENT_VERSION}/ics-attack/ics-attack.json`,
  //   sourceName: 'mitre-attack' },
];

const OUTPUT_DIRECTORY = path.resolve(__dirname, '..', 'data');

const normalizeReference = (reference) => {
  try {
    const parsed = new URL(reference);
    if (!parsed.pathname.endsWith('/')) {
      parsed.pathname = `${parsed.pathname}/`;
    }
    return parsed.toString();
  } catch {
    return reference;
  }
};

const getIdReference = (references, sourceName) => {
  const ref = (references || []).find((r) => r.source_name === sourceName);
  if (!ref) return { id: '', reference: '' };
  return {
    id: ref.external_id || '',
    reference: ref.url ? normalizeReference(ref.url) : '',
  };
};

const isCurrent = (obj) => !obj.revoked && !obj.x_mitre_deprecated;

const tacticsFromKillChain = (item) =>
  (item.kill_chain_phases || []).map((phase) => phase.phase_name).filter(Boolean);

const extractTactics = (objects, source) =>
  objects
    .filter((obj) => obj.type === 'x-mitre-tactic' && isCurrent(obj))
    .map((item) => {
      const { id, reference } = getIdReference(item.external_references, source.sourceName);
      return {
        type: 'tactic',
        framework: source.framework,
        versions: [source.version],
        id,
        name: item.name,
        reference,
        description: item.description || '',
      };
    });

const extractTechniques = (objects, source) =>
  objects
    .filter(
      (obj) =>
        obj.type === 'attack-pattern' &&
        (obj.x_mitre_is_subtechnique === false || obj.x_mitre_is_subtechnique === undefined) &&
        isCurrent(obj)
    )
    .map((item) => {
      const { id, reference } = getIdReference(item.external_references, source.sourceName);
      return {
        type: 'technique',
        framework: source.framework,
        versions: [source.version],
        id,
        name: item.name,
        reference,
        description: item.description || '',
        tactics: tacticsFromKillChain(item),
      };
    });

const extractSubtechniques = (objects, source) =>
  objects
    .filter((obj) => obj.x_mitre_is_subtechnique === true && isCurrent(obj))
    .map((item) => {
      const { id, reference } = getIdReference(item.external_references, source.sourceName);
      return {
        type: 'subtechnique',
        framework: source.framework,
        versions: [source.version],
        id,
        name: item.name,
        reference,
        description: item.description || '',
        tactics: tacticsFromKillChain(item),
        techniqueId: id.split('.')[0],
      };
    });

const fetchSource = async (source) => {
  // eslint-disable-next-line no-console
  console.log(`Fetching ${source.framework} ${source.version} from ${source.url}`);
  const res = await fetch(source.url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${source.url}: ${res.status} ${res.statusText}`);
  }
  const body = await res.json();
  if (!Array.isArray(body.objects)) {
    throw new Error(`Unexpected STIX bundle shape (no \`objects\` array) at ${source.url}`);
  }
  return body.objects;
};

const buildEntities = async () => {
  const entities = [];
  for (const source of SOURCES) {
    const objects = await fetchSource(source);
    entities.push(...extractTactics(objects, source));
    entities.push(...extractTechniques(objects, source));
    entities.push(...extractSubtechniques(objects, source));
  }
  return sortBy(entities, ['framework', 'type', 'id']);
};

async function main() {
  if (!fs.existsSync(OUTPUT_DIRECTORY)) {
    fs.mkdirSync(OUTPUT_DIRECTORY, { recursive: true });
  }

  const entities = await buildEntities();

  // Stamp identifies the artifact contents. With a single source we use the
  // single version. Multi-source artifacts would use a stable hash here, but
  // for the POC the version pin is sufficient — re-running the script against
  // the same pinned URL produces an identical artifact.
  const stamp = SOURCES.map((s) => `${s.framework}:${s.version}`).join('|');
  const generatedAt = new Date().toISOString();

  const artifact = { stamp, generatedAt, entities };
  const versionFile = { stamp, generatedAt };

  // Sanity counts to surface unexpected drift in CI / local runs.
  const counts = entities.reduce((acc, e) => {
    const key = `${e.framework}:${e.type}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  // eslint-disable-next-line no-console
  console.log('Entity counts by framework:type:', counts);

  fs.writeFileSync(
    path.join(OUTPUT_DIRECTORY, 'mitre_artifact.json'),
    `${JSON.stringify(artifact, null, 2)}\n`,
    'utf-8'
  );
  fs.writeFileSync(
    path.join(OUTPUT_DIRECTORY, 'artifact_version.json'),
    `${JSON.stringify(versionFile, null, 2)}\n`,
    'utf-8'
  );

  // eslint-disable-next-line no-console
  console.log(
    `Wrote ${entities.length} entities to ${path.relative(process.cwd(), OUTPUT_DIRECTORY)}`
  );
}

if (require.main === module) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}

module.exports = {
  MITRE_CONTENT_VERSION,
  SOURCES,
  buildEntities,
  extractTactics,
  extractTechniques,
  extractSubtechniques,
};
