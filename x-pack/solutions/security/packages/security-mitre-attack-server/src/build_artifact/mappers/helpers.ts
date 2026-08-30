/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StixEntity } from '../types';

/** A relationship entity with both endpoints present. */
type StixRelationship = StixEntity & { source_ref: string; target_ref: string };

const isRelationship = (
  stixEntity: StixEntity,
  relationshipType: string
): stixEntity is StixRelationship =>
  stixEntity.type === 'relationship' &&
  stixEntity.relationship_type === relationshipType &&
  stixEntity.source_ref != null &&
  stixEntity.target_ref != null;

/** True for 'revoked-by' relationships, which point a revoked entity at its replacement. */
export const isRevokedByRelationship = (stixEntity: StixEntity): stixEntity is StixRelationship =>
  isRelationship(stixEntity, 'revoked-by');

/** True for 'subtechnique-of' relationships, which point a subtechnique at its parent technique. */
export const isSubtechniqueOfRelationship = (
  stixEntity: StixEntity
): stixEntity is StixRelationship => isRelationship(stixEntity, 'subtechnique-of');

/** True when MITRE has retired the entity, either by revoking or deprecating it. */
export const isRetired = (stixEntity: StixEntity): boolean =>
  stixEntity.revoked === true || stixEntity.x_mitre_deprecated === true;

/** Indexes 'revoked-by' relationships as source STIX ID to the STIX IDs replacing it. */
export const buildRevokedByTargetRefs = (objects: StixEntity[]): Map<string, string[]> => {
  const revokedByTargetRefs = new Map<string, string[]>();

  for (const relationship of objects.filter(isRevokedByRelationship)) {
    const existing = revokedByTargetRefs.get(relationship.source_ref) ?? [];
    existing.push(relationship.target_ref);
    revokedByTargetRefs.set(relationship.source_ref, existing);
  }

  return revokedByTargetRefs;
};

/** Indexes tactics by x_mitre_shortname, the key kill_chain_phases reference them by. */
export const buildTacticByShortname = (objects: StixEntity[]): Map<string, StixEntity> =>
  new Map(
    objects
      .filter((entity) => entity.type === 'x-mitre-tactic' && entity.x_mitre_shortname != null)
      .map((entity) => [String(entity.x_mitre_shortname), entity])
  );

/**
 * Returns the tactic ID(s) a technique or subtechnique belongs to. MITRE links these through
 * kill_chain_phases, which name tactics by shortname, so each phase is looked up to get its
 * ATT&CK ID:
 *
 *   T1003 (technique) kill_chain_phases: ['credential-access'] -> tactic_ids: ['TA0006']
 *
 * Phases from other frameworks are ignored. A phase matching no tactic throws, unless the
 * entity is revoked or deprecated, where a retired tactic reference is expected and skipped.
 */
export const resolveTacticIds = (
  stixEntity: StixEntity,
  tacticByShortname: Map<string, StixEntity>
): string[] => {
  const phases =
    stixEntity.kill_chain_phases?.filter((phase) => phase.kill_chain_name === 'mitre-attack') ?? [];
  if (phases.length === 0) return [];

  const ids = phases.flatMap((phase) => {
    const tacticEntity = tacticByShortname.get(phase.phase_name);
    if (tacticEntity == null) {
      if (isRetired(stixEntity)) {
        return [];
      }
      throw new Error(
        `Cannot resolve kill_chain phase '${phase.phase_name}' to any tactic in the bundle` +
          ` (referenced by STIX entity '${stixEntity.id}')`
      );
    }
    const mitreReference = getMitreReference(tacticEntity);
    return mitreReference != null ? [mitreReference.id] : [];
  });

  return ids.slice().sort();
};

/**
 * Returns the ATT&CK IDs of the entities that replace a revoked entity, taken from
 * its 'revoked-by' relationships. Undefined when there are none.
 */
export const resolveSupersededBy = (
  stixId: string,
  entityById: Map<string, StixEntity>,
  revokedByTargetRefs: Map<string, string[]>
): string[] | undefined => {
  const targetRefs = revokedByTargetRefs.get(stixId);
  if (!targetRefs || targetRefs.length === 0) return undefined;

  const ids = targetRefs.flatMap((targetStixId) => {
    const targetEntity = entityById.get(targetStixId);
    if (targetEntity == null) return [];
    const mitreReference = getMitreReference(targetEntity);
    return mitreReference != null ? [mitreReference.id] : [];
  });

  return ids.length === 0 ? undefined : ids.slice().sort();
};

/** Ensures the URL path ends with a trailing slash, matching prebuilt rule references. */
const normalizeThreatReference = (reference: string): string => {
  try {
    const parsed = new URL(reference);
    if (!parsed.pathname.endsWith('/')) {
      parsed.pathname = `${parsed.pathname}/`;
    }
    return parsed.toString();
  } catch {
    return reference;
  }
};

/**
 * Returns the ATT&CK ID and normalized URL from an entity's 'mitre-attack' external
 * reference, or null when it has none (such entities are skipped during the build).
 */
export const getMitreReference = (
  stixEntity: StixEntity
): { id: string; reference: string } | null => {
  const mitreRef = stixEntity.external_references?.find(
    (externalRef) => externalRef.source_name === 'mitre-attack'
  );
  if (mitreRef == null || !mitreRef.external_id || !mitreRef.url) {
    return null;
  }
  return {
    id: mitreRef.external_id,
    reference: normalizeThreatReference(mitreRef.url),
  };
};
