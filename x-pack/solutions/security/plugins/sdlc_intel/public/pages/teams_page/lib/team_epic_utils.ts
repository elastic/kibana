/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SdlcEpicPhaseSummary, SdlcTeamCard } from '../../../../common/api/types';
import { buildPhaseCells } from '../../pipeline_page/lib/phase_cell_model';

export type MiniPhaseGate = 'p' | 'w' | 'f' | 'n';

export const getMiniPhaseGates = (epic: SdlcEpicPhaseSummary): MiniPhaseGate[] =>
  buildPhaseCells(epic).map((cell) => {
    if (cell.gate === 'pass') {
      return 'p';
    }
    if (cell.gate === 'warn') {
      return 'w';
    }
    if (cell.gate === 'fail') {
      return 'f';
    }
    return 'n';
  });

export const readTicketRollup = (
  epic: SdlcEpicPhaseSummary
): { done: number; total: number; aiGen: number; engValidated: number } => {
  const p4 = epic.phases.p4_tickets;
  if (!p4 || typeof p4 !== 'object') {
    return { done: 0, total: 0, aiGen: 0, engValidated: 0 };
  }

  const phase = p4 as Record<string, unknown>;
  return {
    done: typeof phase.done === 'number' ? phase.done : 0,
    total: typeof phase.total === 'number' ? phase.total : 0,
    aiGen: typeof phase.ai_gen === 'number' ? phase.ai_gen : 0,
    engValidated: typeof phase.eng_validated === 'number' ? phase.eng_validated : 0,
  };
};

export const computeAverageTeamsPerEpic = (
  epicsByTeam: Readonly<Record<string, readonly SdlcEpicPhaseSummary[]>>
): number => {
  const uniqueEpics = new Map<string, SdlcEpicPhaseSummary>();

  for (const epics of Object.values(epicsByTeam)) {
    for (const epic of epics) {
      uniqueEpics.set(epic.id, epic);
    }
  }

  const epics = [...uniqueEpics.values()];
  if (epics.length === 0) {
    return 0;
  }

  const totalTeams = epics.reduce((sum, epic) => sum + epic.teams.teamCount, 0);
  return Math.round((totalTeams / epics.length) * 10) / 10;
};

export const resolveTeamName = (
  teamKey: string,
  teams: readonly SdlcTeamCard[]
): string => teams.find((team) => team.key === teamKey)?.name ?? teamKey;
