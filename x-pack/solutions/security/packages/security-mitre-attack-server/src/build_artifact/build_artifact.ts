/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mitreEntitiesSchema } from '@kbn/security-mitre-attack-common';
import type { MitreEntity, MitreFramework } from '@kbn/security-mitre-attack-common';
import { fetchStixBundle } from './fetch_stix_bundle';
import type { StixBundle } from './types';
import { mapSubtechniques } from './mappers/map_subtechniques';
import { mapTactics } from './mappers/map_tactics';
import { mapTechniques } from './mappers/map_techniques';

interface FrameworkDefinition {
  framework: MitreFramework;
  sourceName: 'mitre-attack' | 'mitre-atlas';
  bundleUrl: (tag: string) => string;
  toFrameworkVersion: (tag: string) => string;
  versions: readonly string[];
}

// Append a tag here to include an additional MITRE ATT&CK version in the artifact.
// Each tag must correspond to the version used for prebuilt rules in
// https://github.com/elastic/detection-rules.
// Tags are published at https://github.com/mitre/cti/tags.
export const MITRE_CONTENT_VERSIONS: readonly string[] = ['ATT&CK-v19.2'];

// Tags are published at https://github.com/mitre-atlas/atlas-data/releases.
export const ATLAS_CONTENT_VERSIONS: readonly string[] = ['v2026.08'];

const FRAMEWORKS: FrameworkDefinition[] = [
  {
    framework: 'enterprise',
    sourceName: 'mitre-attack',
    bundleUrl: (tag) =>
      `https://raw.githubusercontent.com/mitre/cti/${tag}/enterprise-attack/enterprise-attack.json`,
    toFrameworkVersion: (tag) => tag.replace(/^ATT&CK-v/, ''),
    versions: MITRE_CONTENT_VERSIONS,
  },
  {
    framework: 'atlas',
    sourceName: 'mitre-atlas',
    bundleUrl: (tag) =>
      `https://github.com/mitre-atlas/atlas-data/releases/download/${tag}/stix-atlas.json`,
    toFrameworkVersion: (tag) => tag.replace(/^v/, ''),
    versions: ATLAS_CONTENT_VERSIONS,
  },
];

/**
 * Builds the artifact content: fetches each pinned MITRE version per framework, maps its
 * STIX bundle into MITRE entities, and validates the combined result. Entry point
 * for scripts/build_artifact.js, which writes the output to disk.
 */
export const buildMitreArtifact = async (): Promise<MitreEntity[]> => {
  const allEntities: MitreEntity[] = [];

  for (const def of FRAMEWORKS) {
    for (const tag of def.versions) {
      const bundle = await fetchStixBundle(def.bundleUrl(tag));
      const entities = mapBundleToMitreEntities(
        bundle,
        def.framework,
        def.toFrameworkVersion(tag),
        def.sourceName
      );
      allEntities.push(...entities);
    }
  }

  return mitreEntitiesSchema.parse(allEntities);
};

/** Maps one STIX bundle into the full entity set for a single framework version. */
export const mapBundleToMitreEntities = (
  bundle: StixBundle,
  framework: MitreFramework,
  frameworkVersion: string,
  sourceName: 'mitre-attack' | 'mitre-atlas' = 'mitre-attack'
): MitreEntity[] => [
  ...mapTactics(bundle, framework, frameworkVersion, sourceName),
  ...mapTechniques(bundle, framework, frameworkVersion, sourceName),
  ...mapSubtechniques(bundle, framework, frameworkVersion, sourceName),
];
