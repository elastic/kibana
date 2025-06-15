/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  ThreatArray,
  ThreatTactic,
  ThreatTechnique,
} from '../../../../../../../../common/api/detection_engine';
import {
  tactics as allTactics,
  techniques as allTechniques,
} from '../../../../../../../../common/detections/mitre/mitre_tactics_techniques';
import type { RuleSummaryResponse } from './types';

const tacticsById = allTactics.reduce<Record<string, ThreatTactic>>((acc, tactic) => {
  acc[tactic.id] = {
    id: tactic.id,
    name: tactic.name,
    reference: tactic.reference,
  };
  return acc;
}, {});

const techniquesById = allTechniques.reduce<Record<string, ThreatTechnique>>((acc, technique) => {
  acc[technique.id] = {
    id: technique.id,
    name: technique.name,
    reference: technique.reference,
  };
  return acc;
}, {});

export const processThreatInfo = (
  mitreAttack: RuleSummaryResponse['mitre_attack']
): ThreatArray | undefined => {
  const tactic = tacticsById[mitreAttack.tactic.id];
  if (!tactic) {
    return;
  }
  const technique = mitreAttack.tactic.techniques.reduce<ThreatTechnique[]>((acc, { id }) => {
    const foundTechnique = techniquesById[id];
    if (foundTechnique) {
      acc.push(foundTechnique);
    }
    return acc;
  }, []);

  if (technique.length === 0) {
    return;
  }

  return [{ framework: 'MITRE ATT&CK', tactic, technique }];
};
