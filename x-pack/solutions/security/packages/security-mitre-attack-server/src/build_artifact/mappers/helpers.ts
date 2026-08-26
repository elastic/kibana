/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StixEntity } from '../types';

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

  const isRevokedOrDeprecated =
    stixEntity.revoked === true || stixEntity.x_mitre_deprecated === true;

  const ids = phases.flatMap((phase) => {
    const tacticEntity = tacticByShortname.get(phase.phase_name);
    if (tacticEntity == null) {
      if (isRevokedOrDeprecated) {
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
