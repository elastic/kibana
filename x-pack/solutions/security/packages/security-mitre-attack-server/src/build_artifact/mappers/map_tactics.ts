/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MitreFramework, MitreTactic } from '@kbn/security-mitre-attack-common';
import type { StixBundle, StixEntity } from '../types';
import { getMitreReference, resolveSupersededBy } from './helpers';

/**
 * Maps x-mitre-tactic entities into tactics, positioned by their index in the
 * matrix's tactic_refs (the matrix column order)
 */
export const mapTactics = (
  bundle: StixBundle,
  framework: MitreFramework,
  frameworkVersion: string
): MitreTactic[] => {
  const { objects } = bundle;

  const entityById = new Map<string, StixEntity>();
  for (const entity of objects) {
    entityById.set(entity.id, entity);
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

  const matrixEntity = objects.find((entity) => entity.type === 'x-mitre-matrix');
  const tacticRefs = matrixEntity?.tactic_refs ?? [];
  const tacticPositionByRef = new Map<string, number>();
  for (let i = 0; i < tacticRefs.length; i++) {
    tacticPositionByRef.set(tacticRefs[i], i);
  }

  return objects
    .filter((entity) => entity.type === 'x-mitre-tactic')
    .flatMap((stixEntity) => {
      const mitreReference = getMitreReference(stixEntity);
      if (mitreReference == null) return [];

      const position = tacticPositionByRef.get(stixEntity.id);
      if (position === undefined) {
        throw new Error(
          `Tactic '${mitreReference.id}' (${stixEntity.name ?? stixEntity.id}) is not present` +
            ` in x-mitre-matrix tactic_refs. The bundle may be malformed.`
        );
      }

      return [
        {
          type: 'tactic' as const,
          framework,
          framework_version: frameworkVersion,
          id: mitreReference.id,
          name: stixEntity.name ?? '',
          reference: mitreReference.reference,
          description: stixEntity.description ?? '',
          revoked: stixEntity.revoked === true,
          deprecated: stixEntity.x_mitre_deprecated === true,
          superseded_by_id: resolveSupersededBy(stixEntity.id, entityById, revokedByTargetRefs),
          position,
        },
      ];
    })
    .sort((a, b) => a.position - b.position);
};
