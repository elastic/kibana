/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SdlcEpicPhaseSummary, SdlcRoadmapGroup } from '../../../../common/api/types';
import { buildPhaseCells, type PhaseCellModel } from './phase_cell_model';
import type { PhaseGate } from './phase_definitions';

export type GateStatusFilter = 'all' | PhaseGate;

export interface PipelineFilters {
  readonly search: string;
  readonly gateStatus: GateStatusFilter;
}

const epicMatchesSearch = (epic: SdlcEpicPhaseSummary, search: string): boolean => {
  const query = search.trim().toLowerCase();
  if (!query) {
    return true;
  }

  return (
    epic.title.toLowerCase().includes(query) ||
    epic.displayId.toLowerCase().includes(query) ||
    epic.epicKey.toLowerCase().includes(query)
  );
};

const epicMatchesGateStatus = (cells: readonly PhaseCellModel[], gateStatus: GateStatusFilter): boolean => {
  if (gateStatus === 'all') {
    return true;
  }

  return cells.some((cell) => cell.gate === gateStatus);
};

export const filterPipelineRoadmaps = (
  roadmaps: readonly SdlcRoadmapGroup[],
  filters: PipelineFilters
): SdlcRoadmapGroup[] =>
  roadmaps
    .map((roadmap) => ({
      ...roadmap,
      epics: roadmap.epics.filter((epic) => {
        const cells = buildPhaseCells(epic);
        return epicMatchesSearch(epic, filters.search) && epicMatchesGateStatus(cells, filters.gateStatus);
      }),
    }))
    .filter((roadmap) => roadmap.epics.length > 0);

export interface RoadmapPipelineStats {
  readonly passCount: number;
  readonly warnCount: number;
  readonly failCount: number;
  readonly applicableCount: number;
  readonly deliveryCoveragePct: number | null;
}

export const computeRoadmapStats = (epics: readonly SdlcEpicPhaseSummary[]): RoadmapPipelineStats => {
  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;
  let applicableCount = 0;
  let deliverySum = 0;
  let deliveryCount = 0;

  for (const epic of epics) {
    deliverySum += epic.deliveryCoveragePct;
    deliveryCount += 1;

    for (const cell of buildPhaseCells(epic)) {
      if (cell.gate === 'ns') {
        continue;
      }

      applicableCount += 1;
      if (cell.gate === 'pass') {
        passCount += 1;
      } else if (cell.gate === 'warn') {
        warnCount += 1;
      } else {
        failCount += 1;
      }
    }
  }

  return {
    passCount,
    warnCount,
    failCount,
    applicableCount,
    deliveryCoveragePct: deliveryCount > 0 ? Math.round(deliverySum / deliveryCount) : null,
  };
};
