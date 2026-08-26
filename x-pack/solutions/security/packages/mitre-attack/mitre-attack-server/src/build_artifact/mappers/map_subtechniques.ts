/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MitreFramework, MitreSubtechnique } from '@kbn/security-mitre-attack-common';
import type { StixBundle, StixEntity } from '../types';
import { resolveTacticIds, resolveSupersededBy, getMitreReference } from './helpers';

/**
 * Maps subtechnique attack-pattern entities into subtechniques, sorted by ATT&CK ID.
 * The parent technique comes from the 'subtechnique-of' relationship, cross-checked
 * against the subtechnique ID's dot prefix (T1003.001 implies T1003), which is also
 * the fallback when the relationship is missing.
 */
export const mapSubtechniques = (
  bundle: StixBundle,
  framework: MitreFramework,
  frameworkVersion: string
): MitreSubtechnique[] => {
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
  // Maps each subtechnique STIX ID to its parent technique STIX ID.
  const subtechniqueParentRef = new Map<string, string>();
  for (const entity of objects) {
    if (entity.type === 'relationship' && entity.source_ref != null && entity.target_ref != null) {
      if (entity.relationship_type === 'revoked-by') {
        const existing = revokedByTargetRefs.get(entity.source_ref) ?? [];
        existing.push(entity.target_ref);
        revokedByTargetRefs.set(entity.source_ref, existing);
      } else if (entity.relationship_type === 'subtechnique-of') {
        subtechniqueParentRef.set(entity.source_ref, entity.target_ref);
      }
    }
  }

  const subtechniqueEntities = objects.filter(
    (entity) => entity.type === 'attack-pattern' && entity.x_mitre_is_subtechnique === true
  );

  return subtechniqueEntities
    .flatMap((stixEntity) => {
      const mitreReference = getMitreReference(stixEntity);
      if (mitreReference == null) return [];

      const parentStixId = subtechniqueParentRef.get(stixEntity.id);
      const dotPrefixId = mitreReference.id.split('.')[0];

      let techniqueId: string;
      if (parentStixId != null) {
        const parentEntity = entityById.get(parentStixId);
        const parentMitreReference = parentEntity != null ? getMitreReference(parentEntity) : null;
        const relationshipId = parentMitreReference?.id ?? dotPrefixId;
        if (parentMitreReference != null && relationshipId !== dotPrefixId) {
          throw new Error(
            `Subtechnique '${mitreReference.id}': subtechnique-of relationship points to` +
              ` '${relationshipId}' but dot-prefix implies parent '${dotPrefixId}'.` +
              ` Bundle may be malformed.`
          );
        }
        techniqueId = relationshipId;
      } else {
        techniqueId = dotPrefixId;
      }

      return [
        {
          type: 'subtechnique' as const,
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
          technique_id: techniqueId,
        },
      ];
    })
    .sort((a, b) => a.id.localeCompare(b.id));
};
