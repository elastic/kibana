/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MitreFramework, MitreTechnique } from '@kbn/security-mitre-attack-common';
import type { StixBundle, StixEntity } from '../types';
import { resolveTacticIds, resolveSupersededBy, getMitreReference } from './helpers';

/** Maps non-subtechnique attack-pattern entities into techniques, sorted by ATT&CK ID. */
export const mapTechniques = (
  bundle: StixBundle,
  framework: MitreFramework,
  frameworkVersion: string
): MitreTechnique[] => {
  const { objects } = bundle;

  const entityById = new Map<string, StixEntity>();
  for (const entity of objects) {
    entityById.set(entity.id, entity);
  }

  // Tactics keyed by x_mitre_shortname for resolving kill_chain_phases.
  const tacticByShortname = new Map<string, StixEntity>();
  for (const entity of objects) {
    if (entity.type === 'x-mitre-tactic' && entity.x_mitre_shortname != null) {
      tacticByShortname.set(entity.x_mitre_shortname, entity);
    }
  }

  const revokedByTargetRefs = new Map<string, string[]>();
  for (const entity of objects) {
    if (
      entity.type === 'relationship' &&
      entity.relationship_type === 'revoked-by' &&
      entity.source_ref != null &&
      entity.target_ref != null
    ) {
      const existing = revokedByTargetRefs.get(entity.source_ref) ?? [];
      existing.push(entity.target_ref);
      revokedByTargetRefs.set(entity.source_ref, existing);
    }
  }

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
