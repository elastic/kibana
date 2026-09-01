/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MitreFramework, MitreTechnique } from '@kbn/security-mitre-attack-common';
import type { StixBundle } from '../types';
import {
  buildRevokedByTargetRefs,
  buildTacticByShortname,
  resolveTacticIds,
  resolveSupersededBy,
  getMitreReference,
} from './helpers';

/** Maps non-subtechnique attack-pattern entities into techniques, sorted by ATT&CK ID. */
export const mapTechniques = (
  bundle: StixBundle,
  framework: MitreFramework,
  frameworkVersion: string
): MitreTechnique[] => {
  const { objects } = bundle;

  const entityById = new Map(objects.map((entity) => [entity.id, entity]));
  const tacticByShortname = buildTacticByShortname(objects);
  const revokedByTargetRefs = buildRevokedByTargetRefs(objects);

  const techniqueEntities = objects.filter(
    (entity) => entity.type === 'attack-pattern' && !entity.x_mitre_is_subtechnique
  );

  return techniqueEntities
    .flatMap((stixEntity) => {
      const mitreReference = getMitreReference(stixEntity);
      if (mitreReference == null) return [];
      return [
        {
          type: 'technique' as const,
          framework,
          framework_version: frameworkVersion,
          id: mitreReference.id,
          name: stixEntity.name ?? '',
          reference: mitreReference.reference,
          description: stixEntity.description ?? '',
          revoked: stixEntity.revoked === true,
          deprecated: stixEntity.x_mitre_deprecated === true,
          superseded_by_id: resolveSupersededBy(stixEntity.id, entityById, revokedByTargetRefs),
          tactic_ids: resolveTacticIds(stixEntity, tacticByShortname),
        },
      ];
    })
    .sort((a, b) => a.id.localeCompare(b.id));
};
