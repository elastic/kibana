/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mitreEntitiesSchema } from '@kbn/security-mitre-attack-common';
import type { MitreEntity, MitreFramework } from '@kbn/security-mitre-attack-common';
import { fetchStixBundle } from './fetch_stix_bundle';
import type { StixBundle, StixFrameworkSource, StixSourceName } from './types';
import { ATLAS_STIX_SOURCE, ENTERPRISE_STIX_SOURCE, ICS_STIX_SOURCE } from './stix_sources';
import { mapSubtechniques } from './mappers/map_subtechniques';
import { mapTactics } from './mappers/map_tactics';
import { mapTechniques } from './mappers/map_techniques';

export type { StixFrameworkSource, StixSourceName } from './types';

/** Describes how one MITRE framework is fetched and projected into the artifact. */
export interface FrameworkDefinition {
  /** Framework stamped on every entity produced from this definition. */
  framework: MitreFramework;
  /** `kill_chain_name` identifying this framework's techniques inside its STIX bundle. */
  killChainName: StixSourceName;
  /** Accepted `external_references[].source_name` values for an object's canonical MITRE entry. */
  sourceNames: readonly StixSourceName[];
  /** Resolves a release tag to the URL of the STIX bundle for that release. */
  bundleUrl: (tag: string) => string;
  /** Resolves a release tag to the `framework_version` stored on each entity. */
  toFrameworkVersion: (tag: string) => string;
  /** Release tags included in the artifact; every tag is fetched on each build. */
  versions: readonly string[];
}

// Append a tag here to include an additional MITRE ATT&CK version in the artifact.
// Each tag must correspond to the version used for prebuilt rules in
// https://github.com/elastic/detection-rules.
// Tags are published at https://github.com/mitre/cti/tags.
export const MITRE_CONTENT_VERSIONS: readonly string[] = ['ATT&CK-v19.2'];

// Append a tag here to include an additional MITRE ATT&CK for ICS version in the artifact.
// ICS releases share the Enterprise tags (the same `ATT&CK-v*` release carries both bundles),
// and each tag must match the version used by prebuilt rules in
// https://github.com/elastic/detection-rules.
export const ICS_CONTENT_VERSIONS: readonly string[] = ['ATT&CK-v19.2'];

// Append a tag here to include an additional MITRE ATLAS version in the artifact.
// Tags are published at https://github.com/mitre-atlas/atlas-data/releases and must
// match the ATLAS version used by prebuilt rules in https://github.com/elastic/detection-rules
// (see detection_rules/etc/atlas-v*.json.gz).
export const ATLAS_CONTENT_VERSIONS: readonly string[] = ['v2026.08', 'v2026.09'];

/** Strips the 'ATT&CK-v' prefix, e.g. 'ATT&CK-v19.1' -> '19.1'. Shared by Enterprise and ICS. */
export const toAttackFrameworkVersion = (tag: string): string => tag.replace(/^ATT&CK-v/, '');

/**
 * Normalizes an ATLAS release tag into the `framework_version` stored on each entity,
 * e.g. 'v2026.08' -> '2026.8', 'v2026.10' -> '2026.10', 'v5.1.0' -> '5.1.0'.
 *
 * The leading zeros matter: the `framework_version` saved object mapping uses the ES
 * `version` field type, which only orders strings that parse as semver. '2026.08' does
 * not (semver forbids leading zeros), so ES falls back to lexical order and sorts it
 * ABOVE '2026.10', meaning latest-version resolution would pick the older release on the
 * first ATLAS bump. Stripping the leading 'v' and any leading zeros from each numeric
 * segment keeps every ATLAS version semver-comparable.
 */
export const normalizeAtlasVersion = (tag: string): string =>
  tag
    .replace(/^v/, '')
    .split('.')
    .map((segment) => (/^\d+$/.test(segment) ? String(Number(segment)) : segment))
    .join('.');

/** Frameworks (and the pinned versions of each) that make up the bundled artifact. */
export const MITRE_FRAMEWORK_DEFINITIONS: readonly FrameworkDefinition[] = [
  {
    framework: 'enterprise',
    killChainName: ENTERPRISE_STIX_SOURCE.killChainName,
    sourceNames: ENTERPRISE_STIX_SOURCE.sourceNames,
    bundleUrl: (tag) =>
      `https://raw.githubusercontent.com/mitre/cti/${tag}/enterprise-attack/enterprise-attack.json`,
    toFrameworkVersion: toAttackFrameworkVersion,
    versions: MITRE_CONTENT_VERSIONS,
  },
  {
    framework: 'atlas',
    killChainName: ATLAS_STIX_SOURCE.killChainName,
    sourceNames: ATLAS_STIX_SOURCE.sourceNames,
    bundleUrl: (tag) =>
      `https://github.com/mitre-atlas/atlas-data/releases/download/${tag}/stix-atlas.json`,
    toFrameworkVersion: normalizeAtlasVersion,
    versions: ATLAS_CONTENT_VERSIONS,
  },
  {
    framework: 'ics',
    killChainName: ICS_STIX_SOURCE.killChainName,
    sourceNames: ICS_STIX_SOURCE.sourceNames,
    bundleUrl: (tag) =>
      `https://raw.githubusercontent.com/mitre/cti/${tag}/ics-attack/ics-attack.json`,
    toFrameworkVersion: toAttackFrameworkVersion,
    versions: ICS_CONTENT_VERSIONS,
  },
];

/**
 * Builds the artifact content: fetches every pinned version of every framework, maps each
 * STIX bundle into MITRE entities, and validates the combined result. Entry point for
 * scripts/build_artifact.js, which writes the output to disk.
 */
export const buildMitreArtifact = async (
  definitions: readonly FrameworkDefinition[] = MITRE_FRAMEWORK_DEFINITIONS
): Promise<MitreEntity[]> => {
  const allEntities: MitreEntity[] = [];

  for (const definition of definitions) {
    for (const tag of definition.versions) {
      const bundle = await fetchStixBundle(definition.bundleUrl(tag));
      const entities = mapBundleToMitreEntities(
        bundle,
        definition.framework,
        definition.toFrameworkVersion(tag),
        { killChainName: definition.killChainName, sourceNames: definition.sourceNames }
      );
      allEntities.push(...entities);
    }
  }

  return mitreEntitiesSchema.parse(allEntities);
};

/**
 * Maps one STIX bundle into the full entity set for a single framework version. Only
 * objects referenced through `source` are considered, so cross-framework references
 * (e.g. the 'mitre-attack' link some ATLAS techniques carry) are ignored.
 */
export const mapBundleToMitreEntities = (
  bundle: StixBundle,
  framework: MitreFramework,
  frameworkVersion: string,
  source: StixFrameworkSource
): MitreEntity[] => [
  ...mapTactics(bundle, framework, frameworkVersion, source),
  ...mapTechniques(bundle, framework, frameworkVersion, source),
  ...mapSubtechniques(bundle, framework, frameworkVersion, source),
];
