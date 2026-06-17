/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('@kbn/setup-node-env');

const fs = require('fs');
// eslint-disable-next-line import/no-extraneous-dependencies
const { camelCase, sortBy } = require('lodash');
const { resolve } = require('path');

const OUTPUT_DIRECTORY = resolve('common', 'detection_engine', 'mitre');

// Slim catalog (no i18n labels) is co-published into the shared
// `@kbn/securitysolution-mitre-catalog` package so other security-domain
// consumers (e.g. the threat-intelligence skill) can import the same canonical
// data without pulling `@kbn/security-solution-plugin` into their type-check
// graph. Both files are rewritten by every `yarn extract-mitre-attacks` run so
// they cannot drift from each other.
const PACKAGE_CATALOG_JSON = resolve(
  __dirname,
  '..',
  '..',
  '..',
  'packages',
  'kbn-securitysolution-mitre-catalog',
  'src',
  'data',
  'mitre_attack_catalog.json'
);

// Every release we should update the version of MITRE ATT&CK content and regenerate the model in our code.
// This version must correspond to the one used for prebuilt rules in https://github.com/elastic/detection-rules.
// This version is basically a tag on https://github.com/mitre/cti/tags, or can be a branch name like `master`.
const MITRE_CONTENT_VERSION = 'ATT&CK-v18.1'; // last updated when preparing for 9.3 release
const MITRE_CONTENT_URL = `https://raw.githubusercontent.com/mitre/cti/${MITRE_CONTENT_VERSION}/enterprise-attack/enterprise-attack.json`;

/**
 * An ID for a technique that exists in multiple tactics. This may change in further updates and on MITRE
 * version upgrade, this ID should be double-checked to make sure it still represents these parameters.
 *
 * We have this in order to cover edge cases with our mock data that can't be achieved by simply generating
 * data from the MITRE api.
 */
const MOCK_DUPLICATE_TECHNIQUE_ID = 'T1546';

const getTacticsOptions = (tactics) =>
  tactics.map((t) =>
    `{
  id: '${t.id}',
  name: '${t.name}',
  reference: '${t.reference}',
  label: i18n.translate(
    'xpack.securitySolution.detectionEngine.mitreAttackTactics.${camelCase(t.name)}Description', {
      defaultMessage: '${t.name} (${t.id})'
  }),
  value: '${camelCase(t.name)}'
}`.replace(/(\r\n|\n|\r)/gm, ' ')
  );

const getTechniquesOptions = (techniques) =>
  techniques.map((t) =>
    `{
  label: i18n.translate(
    'xpack.securitySolution.detectionEngine.mitreAttackTechniques.${camelCase(
      t.name
    )}Description', {
      defaultMessage: '${t.name} (${t.id})'
  }),
  id: '${t.id}',
  name: '${t.name}',
  reference: '${t.reference}',
  tactics: [${t.tactics.map((tactic) => `'${tactic.trim()}'`)}],
  value: '${camelCase(t.name)}'
}`.replace(/(\r\n|\n|\r)/gm, ' ')
  );

const getSubtechniquesOptions = (subtechniques) =>
  subtechniques.map((t) =>
    `{
  label: i18n.translate(
    'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.${camelCase(t.name)}${
      t.techniqueId // Seperates subtechniques that have the same name but belong to different techniques
    }Description', {
      defaultMessage: '${t.name} (${t.id})'
  }),
  id: '${t.id}',
  name: '${t.name}',
  reference: '${t.reference}',
  tactics: [${t.tactics.map((tactic) => `'${tactic.trim()}'`)}],
  techniqueId: '${t.techniqueId}',
  value: '${camelCase(t.name)}'
}`.replace(/(\r\n|\n|\r)/gm, ' ')
  );

const normalizeThreatReference = (reference) => {
  try {
    const parsed = new URL(reference);

    if (!parsed.pathname.endsWith('/')) {
      // Adds a trailing backslash in urls if it doesn't exist to account for
      // any inconsistencies between our script generated data and prebuilt rules packages
      parsed.pathname = `${parsed.pathname}/`;
    }

    return parsed.toString();
  } catch {
    return reference;
  }
};

const getIdReference = (references) => {
  const ref = references.find((r) => r.source_name === 'mitre-attack');
  if (ref != null) {
    return {
      id: ref.external_id,
      reference: normalizeThreatReference(ref.url),
    };
  } else {
    return { id: '', reference: '' };
  }
};

const isCurrentData = (mitreObj) => !mitreObj.revoked && !mitreObj.x_mitre_deprecated;

const extractTacticsData = (mitreData) => {
  const tactics = mitreData
    .filter((obj) => obj.type === 'x-mitre-tactic')
    .reduce((acc, item) => {
      const { id, reference } = getIdReference(item.external_references);

      return [
        ...acc,
        {
          displayName: item.name,
          shortName: item.x_mitre_shortname,
          id,
          reference,
        },
      ];
    }, []);

  return sortBy(tactics, 'displayName');
};

const normalizeTacticsData = (tacticsData) => {
  return tacticsData.map((data) => {
    const { displayName, id, reference } = data;
    return { name: displayName, id, reference };
  });
};

const extractTechniques = (mitreData) => {
  const techniques = mitreData
    .filter(
      (obj) =>
        obj.type === 'attack-pattern' &&
        (obj.x_mitre_is_subtechnique === false || obj.x_mitre_is_subtechnique === undefined) &&
        isCurrentData(obj)
    )
    .reduce((acc, item) => {
      let tactics = [];
      const { id, reference } = getIdReference(item.external_references);
      if (item.kill_chain_phases != null && item.kill_chain_phases.length > 0) {
        item.kill_chain_phases.forEach((tactic) => {
          tactics = [...tactics, tactic.phase_name];
        });
      }

      return [
        ...acc,
        {
          name: item.name,
          id,
          reference,
          tactics,
        },
      ];
    }, []);

  return sortBy(techniques, 'name');
};

const extractSubtechniques = (mitreData) => {
  const subtechniques = mitreData
    .filter((obj) => obj.x_mitre_is_subtechnique === true && isCurrentData(obj))
    .reduce((acc, item) => {
      let tactics = [];
      const { id, reference } = getIdReference(item.external_references);
      if (item.kill_chain_phases != null && item.kill_chain_phases.length > 0) {
        item.kill_chain_phases.forEach((tactic) => {
          tactics = [...tactics, tactic.phase_name];
        });
      }
      const techniqueId = id.split('.')[0];

      return [
        ...acc,
        {
          name: item.name,
          id,
          reference,
          tactics,
          techniqueId,
        },
      ];
    }, []);

  return sortBy(subtechniques, 'name');
};

const buildMockThreatData = (tacticsData, techniques, subtechniques) => {
  const numberOfThreatsToGenerate = 4;
  const mockThreatData = [];
  const generatedTechniqueIds = new Set();
  for (let i = 0; i < numberOfThreatsToGenerate; i++) {
    let subtechnique;
    let count = i * 50;
    /**
     * Since we're building from the subtechnique level -> up, we make sure there are no
     * dupilicate techniques in the generated MITRE test data. This can cause flakiness in
     * the tests as we don't expect the data to duplicated in the table
     */
    while (subtechnique == null || generatedTechniqueIds.has(subtechnique.techniqueId)) {
      subtechnique = subtechniques[count++];
    }
    generatedTechniqueIds.add(subtechnique.techniqueId);
    const technique = techniques.find((technique) => technique.id === subtechnique.techniqueId);
    const tactic = tacticsData.find((tactic) => tactic.shortName === technique.tactics[0]);

    mockThreatData.push({
      tactic: normalizeTacticsData([tactic])[0],
      technique,
      subtechnique,
    });
  }
  return mockThreatData;
};

const buildDuplicateTechniqueMockThreatData = (tacticsData, techniques) => {
  const technique = techniques.find((technique) => technique.id === MOCK_DUPLICATE_TECHNIQUE_ID);
  const tacticOne = tacticsData.find((tactic) => tactic.shortName === technique.tactics[0]);
  const tacticTwo = tacticsData.find((tactic) => tactic.shortName === technique.tactics[1]);

  return [
    {
      tactic: normalizeTacticsData([tacticOne])[0],
      technique,
    },
    {
      tactic: normalizeTacticsData([tacticTwo])[0],
      technique,
    },
  ];
};

const writePackageCatalogJson = (tactics, techniques, subtechniques) => {
  // Slim shape — id / name / reference / value / (tactics) / (techniqueId).
  // Deliberately omits i18n labels so non-security_solution consumers do not
  // pull `@kbn/i18n` (or the rest of the plugin) into their dep graph.
  const slimCatalog = {
    _meta: {
      generated_from: 'MITRE STIX bundle (see MITRE_CONTENT_URL)',
      generator:
        'x-pack/solutions/security/plugins/security_solution/scripts/extract_tactics_techniques_mitre.js',
      regenerate_with: 'yarn extract-mitre-attacks',
    },
    tactics: tactics.map((t) => ({
      id: t.id,
      name: t.name,
      reference: t.reference,
      value: camelCase(t.name),
    })),
    techniques: techniques.map((t) => ({
      id: t.id,
      name: t.name,
      reference: t.reference,
      tactics: t.tactics,
      value: camelCase(t.name),
    })),
    subtechniques: subtechniques.map((s) => ({
      id: s.id,
      name: s.name,
      reference: s.reference,
      tactics: s.tactics,
      techniqueId: s.techniqueId,
      value: camelCase(s.name),
    })),
  };

  fs.writeFileSync(PACKAGE_CATALOG_JSON, `${JSON.stringify(slimCatalog, null, 2)}\n`, 'utf-8');
};

async function main() {
  fetch(MITRE_CONTENT_URL)
    .then((res) => res.json())
    .then((json) => {
      const mitreData = json.objects;
      const tacticsData = extractTacticsData(mitreData);
      const tactics = normalizeTacticsData(tacticsData);
      const techniques = extractTechniques(mitreData);
      const subtechniques = extractSubtechniques(mitreData);

      writePackageCatalogJson(tactics, techniques, subtechniques);

      const body = `/*
          * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
          * or more contributor license agreements. Licensed under the Elastic License
          * 2.0; you may not use this file except in compliance with the Elastic License
          * 2.0.
          */

          // THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY
          // Please modify the 'extract_tactics_techniques_mitre.js' script directly and
          // run 'yarn extract-mitre-attacks' from the root 'security_solution' plugin directory.
          //
          // The same script also writes the slim, label-free version of this catalog into
          // \`@kbn/securitysolution-mitre-catalog\` so other security-domain consumers can
          // share the same canonical data. Both files are always rewritten together.

          import { i18n } from '@kbn/i18n';

          import { MitreTactic, MitreTechnique, MitreSubTechnique } from './types';

          export const tactics: MitreTactic[] =
            ${JSON.stringify(getTacticsOptions(tactics), null, 2)
              .replace(/}"/g, '}')
              .replace(/"{/g, '{')};

          export const techniques: MitreTechnique[] =
            ${JSON.stringify(getTechniquesOptions(techniques), null, 2)
              .replace(/}"/g, '}')
              .replace(/"{/g, '{')};

          export const subtechniques: MitreSubTechnique[] =
            ${JSON.stringify(getSubtechniquesOptions(subtechniques), null, 2)
              .replace(/}"/g, '}')
              .replace(/"{/g, '{')};

          /**
           * An array of full Mitre Attack Threat objects that are taken directly from the \`mitre_tactics_techniques.ts\` file
           *
           * Is built alongside and sampled from the data in the file so to always be valid with the most up to date MITRE ATT&CK data
           */
          export const getMockThreatData = () => (${JSON.stringify(
            buildMockThreatData(tacticsData, techniques, subtechniques),
            null,
            2
          )
            .replace(/}"/g, '}')
            .replace(/"{/g, '{')});

          /**
           * An array of specifically chosen Mitre Attack Threat objects that is taken directly from the \`mitre_tactics_techniques.ts\` file
           *
           * These objects have identical technique fields but are assigned to different tactics
           */
          export const getDuplicateTechniqueThreatData = () => (${JSON.stringify(
            buildDuplicateTechniqueMockThreatData(tacticsData, techniques),
            null,
            2
          )
            .replace(/}"/g, '}')
            .replace(/"{/g, '{')});
      `;

      fs.writeFileSync(`${OUTPUT_DIRECTORY}/mitre_tactics_techniques.ts`, body, 'utf-8');
    });
}

if (require.main === module) {
  main();
}
