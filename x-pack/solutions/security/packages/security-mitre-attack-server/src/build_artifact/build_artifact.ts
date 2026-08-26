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

// Append a tag here to include an additional MITRE ATT&CK version in the artifact.
// Each tag must correspond to the version used for prebuilt rules in
// https://github.com/elastic/detection-rules.
// Tags are published at https://github.com/mitre/cti/tags.
export const MITRE_CONTENT_VERSIONS: readonly string[] = ['ATT&CK-v19.1'];

/** Strips the 'ATT&CK-v' prefix, e.g. 'ATT&CK-v19.1' -> '19.1'. */
const toFrameworkVersion = (tag: string): string => tag.replace(/^ATT&CK-v/, '');

/**
 * Builds the artifact content: fetches each pinned MITRE ATT&CK version, maps its
 * STIX bundle into MITRE entities, and validates the combined result. Entry point
 * for scripts/build_artifact.js, which writes the output to disk.
 */
export const buildMitreArtifact = async (
  versions: readonly string[] = MITRE_CONTENT_VERSIONS
): Promise<MitreEntity[]> => {
  const allEntities: MitreEntity[] = [];

  for (const tag of versions) {
    const bundle = await fetchStixBundle(tag);
    const entities = mapBundleToMitreEntities(bundle, 'enterprise', toFrameworkVersion(tag));
    allEntities.push(...entities);
  }

  return mitreEntitiesSchema.parse(allEntities);
};

/** Maps one STIX bundle into the full entity set for a single framework version. */
export const mapBundleToMitreEntities = (
  bundle: StixBundle,
  framework: MitreFramework,
  frameworkVersion: string
): MitreEntity[] => [
  ...mapTactics(bundle, framework, frameworkVersion),
  ...mapTechniques(bundle, framework, frameworkVersion),
  ...mapSubtechniques(bundle, framework, frameworkVersion),
];
