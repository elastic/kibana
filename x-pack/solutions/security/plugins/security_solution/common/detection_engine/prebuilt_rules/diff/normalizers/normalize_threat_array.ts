/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ThreatArray,
  ThreatSubtechnique,
  ThreatTechnique,
} from '../../../../api/detection_engine/model/rule_schema';

export const normalizeThreatArray = (threatArray: ThreatArray | undefined): ThreatArray =>
  (threatArray ?? []).map((threat) => {
    if (threat.technique && threat.technique.length) {
      return {
        ...threat,
        tactic: { ...threat.tactic, reference: normalizeThreatReference(threat.tactic.reference) },
        technique: trimTechniqueArray(threat.technique),
      };
    }
    // If `technique` is an empty array, remove the field from the `threat` object
    return {
      ...threat,
      tactic: { ...threat.tactic, reference: normalizeThreatReference(threat.tactic.reference) },
      technique: undefined,
    };
  });

const trimTechniqueArray = (techniqueArray: ThreatTechnique[]): ThreatTechnique[] => {
  return techniqueArray.map((technique) => ({
    ...technique,
    reference: normalizeThreatReference(technique.reference),
    subtechnique:
      technique.subtechnique && technique.subtechnique.length
        ? trimSubtechniqueArray(technique.subtechnique)
        : undefined, // If `subtechnique` is an empty array, remove the field from the `technique` object
  }));
};

const trimSubtechniqueArray = (subtechniqueArray: ThreatSubtechnique[]): ThreatSubtechnique[] => {
  return subtechniqueArray.map((subtechnique) => ({
    ...subtechnique,
    reference: normalizeThreatReference(subtechnique.reference),
  }));
};

const normalizeThreatReference = (reference: string): string => {
  try {
    const parsed = new URL(reference);

    if (!parsed.pathname.endsWith('/')) {
      // Adds a trailing backslash in urls if it doesn't exist to account for
      // any inconsistencies between our script generated data and prebuilt rules packages
      parsed.pathname = `${parsed.pathname}/`;
    }

    return parsed.toString();
  } catch {
    return reference;
  }
};
