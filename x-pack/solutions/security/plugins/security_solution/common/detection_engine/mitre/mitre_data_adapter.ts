/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kebabCase } from 'lodash';
import type {
  MitreEntitySummaryBuckets,
  MitreTacticSummary,
  MitreTechniqueSummary,
  MitreSubtechniqueSummary,
} from '@kbn/security-mitre-attack-common';
import type { MitreTactic, MitreTechnique, MitreSubTechnique } from './types';
import { MITRE_ATTACK_VERSION } from './mitre_version';
import { tacticOrder } from './mitre_tactics_order';

/** Strips a leading 'v' from legacy version strings like 'v19.1' → '19.1'. */
const normalizeVersion = (version: string): string =>
  version.startsWith('v') ? version.slice(1) : version;

/**
 * Normalized MITRE ATT&CK framework version for the bundled legacy dataset (e.g. '19.1').
 * Both query paths in `useMitreConfiguration` expose this same value so callers see an
 * identical shape regardless of which source is active.
 */
export const LEGACY_FRAMEWORK_VERSION = normalizeVersion(MITRE_ATTACK_VERSION);

/** Builds a map of kebab-case tactic name → tactic id from the legacy tactics array. */
const buildTacticNameToIdMap = (tactics: MitreTactic[]): Map<string, string> => {
  const map = new Map<string, string>();
  for (const tactic of tactics) {
    map.set(kebabCase(tactic.name), tactic.id);
  }
  return map;
};

/**
 * Converts the legacy security_solution MITRE arrays into the managed `MitreEntitySummaryBuckets`
 * shape expected by the mitre_attack plugin API and the @kbn/security-mitre-attack-common types.
 */
export const transformLegacyMitreData = ({
  tactics,
  techniques,
  subtechniques,
}: {
  tactics: MitreTactic[];
  techniques: MitreTechnique[];
  subtechniques: MitreSubTechnique[];
}): MitreEntitySummaryBuckets => {
  const frameworkVersion = normalizeVersion(MITRE_ATTACK_VERSION);
  const tacticNameToId = buildTacticNameToIdMap(tactics);

  const resolvedTactics: MitreTacticSummary[] = tactics.map((tactic) => {
    return {
      framework: 'enterprise',
      framework_version: frameworkVersion,
      id: tactic.id,
      name: tactic.name,
      reference: tactic.reference,
      revoked: false,
      deprecated: false,
      type: 'tactic',
      position: tacticOrder.indexOf(tactic.id),
    };
  });

  const resolvedTechniques: MitreTechniqueSummary[] = techniques.map((technique) => {
    const tacticIds = technique.tactics
      .map((tacticName) => tacticNameToId.get(tacticName))
      .filter((id): id is string => id !== undefined);
    return {
      framework: 'enterprise',
      framework_version: frameworkVersion,
      id: technique.id,
      name: technique.name,
      reference: technique.reference,
      revoked: false,
      deprecated: false,
      type: 'technique',
      tactic_ids: tacticIds,
    };
  });

  const resolvedSubtechniques: MitreSubtechniqueSummary[] = subtechniques.map((subtechnique) => {
    const tacticIds = subtechnique.tactics
      .map((tacticName) => tacticNameToId.get(tacticName))
      .filter((id): id is string => id !== undefined);
    return {
      framework: 'enterprise',
      framework_version: frameworkVersion,
      id: subtechnique.id,
      name: subtechnique.name,
      reference: subtechnique.reference,
      revoked: false,
      deprecated: false,
      type: 'subtechnique',
      tactic_ids: tacticIds,
      technique_id: subtechnique.techniqueId,
    };
  });

  return {
    tactics: resolvedTactics,
    techniques: resolvedTechniques,
    subtechniques: resolvedSubtechniques,
  };
};
