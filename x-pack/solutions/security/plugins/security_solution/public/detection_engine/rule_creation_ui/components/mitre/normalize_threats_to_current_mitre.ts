/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Threat, Threats } from '@kbn/securitysolution-io-ts-alerting-types';
import type {
  MitreSubTechnique,
  MitreTactic,
  MitreTechnique,
} from '../../../../../common/detection_engine/mitre/types';

export interface MitreDataset {
  tactics: MitreTactic[];
  techniques: MitreTechnique[];
  subtechniques: MitreSubTechnique[];
}

interface CurrentEntry {
  name: string;
  reference: string;
}

interface MitreEntry {
  id: string;
  name: string;
  reference: string;
}

const NONE = 'none';

const toCurrentEntryMap = (entries: MitreEntry[]): Map<string, CurrentEntry> => {
  const map = new Map<string, CurrentEntry>();
  for (const { id, name, reference } of entries) {
    map.set(id, { name, reference });
  }
  return map;
};

/**
 * Rewrites a stored entry's `name`/`reference` to the dataset's current values when
 * the id still resolves but the name (or reference) has drifted - i.e. a pure MITRE
 * ATT&CK® rename such as `TA0005` "Defense Evasion" -> "Stealth".
 *
 * Placeholder (`none`) entries and ids that are no longer in the dataset (removed or
 * reassigned) are left untouched; those still require an explicit user decision and
 * remain flagged in the form. The original object reference is returned when nothing
 * changed so callers can cheaply detect no-ops.
 */
const applyCurrentName = <T extends MitreEntry>(
  entry: T,
  currentById: Map<string, CurrentEntry>
): T => {
  if (entry.name === NONE) {
    return entry;
  }
  const current = currentById.get(entry.id);
  if (!current || (current.name === entry.name && current.reference === entry.reference)) {
    return entry;
  }
  return { ...entry, name: current.name, reference: current.reference };
};

/**
 * Normalizes an entire `threats` array to the currently bundled MITRE ATT&CK® dataset,
 * updating drifted tactic/technique/subtechnique names (and references) that still map
 * to a valid id. This is applied whenever the user revises the MITRE section of the rule
 * form, so saving an edited section adopts the up-to-date names ("agreeing" to what the
 * form shows) while an untouched section is never rewritten.
 */
export const normalizeThreatsToCurrentMitre = (
  threats: Threats,
  { tactics, techniques, subtechniques }: MitreDataset
): Threats => {
  // Dataset not loaded yet - never mutate the payload based on an empty dataset.
  if (tactics.length === 0 && techniques.length === 0 && subtechniques.length === 0) {
    return threats;
  }

  const tacticById = toCurrentEntryMap(tactics);
  const techniqueById = toCurrentEntryMap(techniques);
  const subtechniqueById = toCurrentEntryMap(subtechniques);

  return threats.map((threat) => {
    const tactic = applyCurrentName(threat.tactic, tacticById);

    const technique = threat.technique?.map((tech) => {
      const normalizedTechnique = applyCurrentName(tech, techniqueById);

      if (!tech.subtechnique || tech.subtechnique.length === 0) {
        return normalizedTechnique;
      }

      let subtechniqueChanged = false;
      const subtechnique = tech.subtechnique.map((sub) => {
        const normalizedSubtechnique = applyCurrentName(sub, subtechniqueById);
        if (normalizedSubtechnique !== sub) {
          subtechniqueChanged = true;
        }
        return normalizedSubtechnique;
      });

      return subtechniqueChanged ? { ...normalizedTechnique, subtechnique } : normalizedTechnique;
    });

    const techniqueChanged = Boolean(
      technique && threat.technique?.some((tech, index) => tech !== technique[index])
    );

    if (tactic === threat.tactic && !techniqueChanged) {
      return threat;
    }

    const normalizedThreat: Threat = { ...threat, tactic };
    if (technique) {
      normalizedThreat.technique = technique;
    }
    return normalizedThreat;
  });
};
