/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MitreFramework, MitreSubtechnique } from '@kbn/security-mitre-attack-common';
import type { StixBundle } from '../types';
import {
  buildRevokedByTargetRefs,
  buildTacticByShortname,
  isSubtechniqueOfRelationship,
  resolveTacticIds,
  resolveSupersededBy,
  getMitreReference,
} from './helpers';

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

  const entityById = new Map(objects.map((entity) => [entity.id, entity]));
  const tacticByShortname = buildTacticByShortname(objects);
  const revokedByTargetRefs = buildRevokedByTargetRefs(objects);

  // Maps each subtechnique STIX ID to its parent technique STIX ID.
  const subtechniqueParentRef = new Map(
    objects
      .filter(isSubtechniqueOfRelationship)
      .map((relationship) => [relationship.source_ref, relationship.target_ref])
  );

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
