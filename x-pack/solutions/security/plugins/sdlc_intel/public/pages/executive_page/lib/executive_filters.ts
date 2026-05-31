/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SdlcEpicPhaseSummary,
  SdlcPortfolioSummary,
  SdlcRoadmapGroup,
  SdlcRoadmapsResponse,
} from '../../../../common/api/types';
import { getCoverageLevel } from './coverage_utils';

export type CoverageFilter = '' | 'risk' | 'amber' | 'good';

export interface ExecutiveFilters {
  readonly search: string;
  readonly product: string;
  readonly owner: string;
  readonly coverage: CoverageFilter;
}

export interface ExecutiveDerivedMetrics {
  readonly prdLinkedCount: number;
  readonly prdLinkagePct: number;
  readonly activeTicketCount: number;
  readonly openTicketCount: number;
}

const epicMatchesSearch = (epic: SdlcEpicPhaseSummary, search: string): boolean => {
  const query = search.trim().toLowerCase();
  if (!query) {
    return true;
  }

  if (
    epic.title.toLowerCase().includes(query) ||
    epic.displayId.toLowerCase().includes(query) ||
    epic.epicKey.toLowerCase().includes(query)
  ) {
    return true;
  }

  return epic.ticketsByRepo.some((repoGroup) =>
    (repoGroup.items ?? []).some(
      (ticket) =>
        ticket.title.toLowerCase().includes(query) ||
        ticket.issueRef.toLowerCase().includes(query)
    )
  );
};

const epicMatchesCoverage = (epic: SdlcEpicPhaseSummary, coverage: CoverageFilter): boolean => {
  if (!coverage) {
    return true;
  }

  const level = getCoverageLevel(epic.coveragePct);
  return level === coverage;
};

const filterEpic = (epic: SdlcEpicPhaseSummary, filters: ExecutiveFilters): boolean => {
  if (filters.owner && epic.owner !== filters.owner) {
    return false;
  }

  if (!epicMatchesCoverage(epic, filters.coverage)) {
    return false;
  }

  return epicMatchesSearch(epic, filters.search);
};

export const filterRoadmaps = (
  roadmaps: readonly SdlcRoadmapGroup[],
  filters: ExecutiveFilters
): SdlcRoadmapGroup[] =>
  roadmaps
    .map((roadmap) => ({
      ...roadmap,
      epics: roadmap.epics.filter((epic) => filterEpic(epic, filters)),
    }))
    .filter((roadmap) => roadmap.epics.length > 0);

export const groupRoadmapsByProduct = (
  roadmaps: readonly SdlcRoadmapGroup[]
): Array<{ product: string; roadmaps: SdlcRoadmapGroup[] }> => {
  const groups = new Map<string, SdlcRoadmapGroup[]>();

  for (const roadmap of roadmaps) {
    const product = roadmap.product || 'Unknown';
    const existing = groups.get(product) ?? [];
    existing.push(roadmap);
    groups.set(product, existing);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([product, productRoadmaps]) => ({
      product,
      roadmaps: productRoadmaps,
    }));
};

export const collectOwners = (roadmaps: readonly SdlcRoadmapGroup[]): string[] => {
  const owners = new Set<string>();

  for (const roadmap of roadmaps) {
    for (const epic of roadmap.epics) {
      if (epic.owner) {
        owners.add(epic.owner);
      }
    }
  }

  return [...owners].sort((left, right) => left.localeCompare(right));
};

export const collectProducts = (roadmaps: readonly SdlcRoadmapGroup[]): string[] => {
  const products = new Set<string>();

  for (const roadmap of roadmaps) {
    if (roadmap.product) {
      products.add(roadmap.product);
    }
  }

  return [...products].sort((left, right) => left.localeCompare(right));
};

export const computeDerivedMetrics = (
  roadmaps: readonly SdlcRoadmapGroup[]
): ExecutiveDerivedMetrics => {
  const epics = roadmaps.flatMap((roadmap) => roadmap.epics);
  const prdLinkedCount = epics.filter((epic) => Boolean(epic.links.prdUrl)).length;
  let activeTicketCount = 0;
  let openTicketCount = 0;

  for (const epic of epics) {
    for (const repoGroup of epic.ticketsByRepo) {
      for (const ticket of repoGroup.items ?? []) {
        if (ticket.status === 'in-progress') {
          activeTicketCount += 1;
        }
        if (ticket.status !== 'closed') {
          openTicketCount += 1;
        }
      }
    }
  }

  return {
    prdLinkedCount,
    prdLinkagePct: epics.length > 0 ? Math.round((prdLinkedCount / epics.length) * 100) : 0,
    activeTicketCount,
    openTicketCount,
  };
};

export const getFilteredSummary = (
  response: SdlcRoadmapsResponse,
  filters: ExecutiveFilters
): {
  roadmaps: SdlcRoadmapGroup[];
  summary: SdlcPortfolioSummary;
  derived: ExecutiveDerivedMetrics;
} => {
  const roadmaps = filterRoadmaps(response.roadmaps, filters);
  const epics = roadmaps.flatMap((roadmap) => roadmap.epics);

  return {
    roadmaps,
    summary: {
      ...response.summary,
      epicCount: epics.length,
      atRiskEpicCount: epics.filter((epic) => epic.coveragePct < 30).length,
      portfolioCoveragePct:
        epics.length > 0
          ? Math.round(epics.reduce((sum, epic) => sum + epic.coveragePct, 0) / epics.length)
          : 0,
      epicStatusCounts: epics.reduce(
        (counts, epic) => {
          if (epic.status === 'closed') {
            counts.closed += 1;
          } else if (epic.status === 'in-progress') {
            counts.inProgress += 1;
          } else {
            counts.open += 1;
          }
          return counts;
        },
        { closed: 0, inProgress: 0, open: 0 }
      ),
      ticketsWithoutPrCount: epics.reduce((count, epic) => {
        for (const repoGroup of epic.ticketsByRepo) {
          for (const ticket of repoGroup.items ?? []) {
            if (ticket.status !== 'closed' && ticket.prRefs.length === 0) {
              count += 1;
            }
          }
        }
        return count;
      }, 0),
    },
    derived: computeDerivedMetrics(roadmaps),
  };
};
