/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SdlcEpicPhaseSummary } from '../../../../common/api/types';
import { PHASE_DEFINITIONS, type PhaseGate } from './phase_definitions';

export interface PhaseTicketDetails {
  readonly total: number;
  readonly aiGen: number;
  readonly engValidated: number;
  readonly done: number;
}

export interface PhasePullRequestDetails {
  readonly total: number;
  readonly merged: number;
  readonly open: number;
}

export interface PhaseCellModel {
  readonly key: string;
  readonly gate: PhaseGate;
  readonly summary: string;
  readonly linkLabel?: string;
  readonly linkUrl?: string;
  readonly expandable: boolean;
  readonly ticketDetails?: PhaseTicketDetails;
  readonly pullRequestDetails?: PhasePullRequestDetails;
}

const readGate = (phase: unknown): PhaseGate => {
  if (!phase || typeof phase !== 'object' || !('gate' in phase)) {
    return 'ns';
  }

  const gate = (phase as { gate?: string }).gate;
  if (gate === 'pass' || gate === 'warn' || gate === 'fail' || gate === 'ns') {
    return gate;
  }

  return 'ns';
};

const readNumber = (phase: unknown, key: string): number => {
  if (!phase || typeof phase !== 'object') {
    return 0;
  }

  const value = (phase as Record<string, unknown>)[key];
  return typeof value === 'number' ? value : 0;
};

export const buildPhaseCells = (epic: SdlcEpicPhaseSummary): PhaseCellModel[] =>
  PHASE_DEFINITIONS.map((definition) => {
    const phase = epic.phases[definition.key];
    const gate = readGate(phase);

    if (definition.key === 'p1_prd' && epic.links.prdUrl) {
      return {
        key: definition.key,
        gate: gate === 'ns' ? 'warn' : gate,
        summary: 'Linked',
        linkLabel: 'PRD',
        linkUrl: epic.links.prdUrl,
        expandable: false,
      };
    }

    if (definition.key === 'p2_arch' && epic.links.archUrl) {
      return {
        key: definition.key,
        gate: gate === 'ns' ? 'warn' : gate,
        summary: gate === 'ns' ? 'Linked' : 'Approved',
        linkLabel: 'Arch',
        linkUrl: epic.links.archUrl,
        expandable: false,
      };
    }

    if (definition.key === 'p4_tickets') {
      const total = readNumber(phase, 'total');
      const done = readNumber(phase, 'done');
      const aiGen = readNumber(phase, 'ai_gen');
      const engValidated = readNumber(phase, 'eng_validated');

      return {
        key: definition.key,
        gate,
        summary: total > 0 ? `${done}/${total} done` : 'No tickets',
        expandable: total > 0,
        ticketDetails:
          total > 0
            ? {
                total,
                aiGen,
                engValidated,
                done,
              }
            : undefined,
      };
    }

    if (definition.key === 'p5_prs') {
      const total = readNumber(phase, 'total');
      const merged = readNumber(phase, 'merged');
      const open = readNumber(phase, 'open');

      return {
        key: definition.key,
        gate,
        summary: total > 0 ? `${merged}/${total} merged` : 'No PRs',
        expandable: total > 0,
        pullRequestDetails:
          total > 0
            ? {
                total,
                merged,
                open,
              }
            : undefined,
      };
    }

    return {
      key: definition.key,
      gate,
      summary: '',
      expandable: false,
    };
  });

export const getCurrentPhaseLabel = (cells: readonly PhaseCellModel[]): string => {
  let lastIndex = 0;

  cells.forEach((cell, index) => {
    if (cell.gate !== 'ns') {
      lastIndex = index;
    }
  });

  return `P${lastIndex + 1}`;
};
