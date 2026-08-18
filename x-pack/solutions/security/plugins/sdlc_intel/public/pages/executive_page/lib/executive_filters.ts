/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TEAM_DIMENSION_SEED,
  UNMAPPED_ROADMAP_GROUP_TITLE,
  epicBelongsToOrgTeam,
  groupEpicsBySubteam,
  resolveSubteamDefinitionsForOrg,
  slugifySubteamKey,
} from '@kbn/sdlc-data-layer';
import type {
  SdlcEpicPhaseSummary,
  SdlcPortfolioSummary,
  SdlcRoadmapGroup,
  SdlcRoadmapsResponse,
} from '../../../../common/api/types';
import { getCoverageLevel } from './coverage_utils';

/** Security org teams seeded in `sdlc-team-dimension` (SIEM, SI, SDE, XDR, PDS). */
export const SECURITY_ORG_TEAM_KEYS = TEAM_DIMENSION_SEED.map((record) => record.org_team.key);

export interface ExecutiveSubteamGroup {
  readonly subteamKey: string;
  readonly subteamName: string;
  readonly roadmaps: readonly SdlcRoadmapGroup[];
}

export interface ExecutiveOrgTeamGroup {
  readonly orgTeamKey: string;
  readonly orgTeamName: string;
  readonly subteams: readonly ExecutiveSubteamGroup[];
}

const toEpicSubteamMatchInput = (epic: SdlcEpicPhaseSummary) => ({
  epicKey: epic.epicKey,
  projectNumber: epic.projectNumber,
  ownOrgTeam: epic.teams.ownOrgTeam,
  contributingOrgTeams: epic.teams.contributingOrgTeams ?? [],
  ownEngineeringTeam: epic.teams.ownEngineeringTeam,
  contributingEngineeringTeams: epic.teams.contributingEngineeringTeams ?? [],
  gatesPassedPct: epic.gatesPassedPct,
  phases: epic.phases,
});

export const epicBelongsToSecurityOrg = (epic: SdlcEpicPhaseSummary): boolean =>
  SECURITY_ORG_TEAM_KEYS.some((orgTeamKey) =>
    epicBelongsToOrgTeam(toEpicSubteamMatchInput(epic), orgTeamKey)
  );

const groupEpicsIntoRoadmaps = (epics: readonly SdlcEpicPhaseSummary[]): SdlcRoadmapGroup[] => {
  const groups = new Map<string, SdlcRoadmapGroup>();

  for (const epic of epics) {
    const roadmapId = epic.roadmap.id;
    const existing = groups.get(roadmapId);
    if (existing) {
      groups.set(roadmapId, {
        ...existing,
        epics: [...existing.epics, epic],
        epicCount: existing.epicCount + 1,
      });
      continue;
    }

    groups.set(roadmapId, {
      id: roadmapId,
      title:
        roadmapId === 'unmapped'
          ? UNMAPPED_ROADMAP_GROUP_TITLE
          : epic.roadmap.title ?? roadmapId,
      product: epic.roadmap.product ?? 'Unknown',
      coveragePct: 0,
      epicCount: 1,
      epics: [epic],
    });
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      coveragePct:
        group.epics.length > 0
          ? Math.round(
              group.epics.reduce((sum, epic) => sum + epic.coveragePct, 0) / group.epics.length
            )
          : 0,
      epics: [...group.epics].sort((left, right) => left.title.localeCompare(right.title)),
    }))
    .sort((left, right) => left.title.localeCompare(right.title));
};

export type CoverageFilter = '' | 'risk' | 'amber' | 'good';

export type DeckBucketFilter = '' | 'released_9_3' | 'now' | 'next' | 'later';

export const DEFAULT_EXECUTIVE_PRODUCT = 'Elastic Workflows';
export const DEFAULT_EXECUTIVE_ENGINEERING_TEAM = 'One Workflow';

export interface ExecutiveFilters {
  readonly search: string;
  readonly product: string;
  readonly owner: string;
  readonly coverage: CoverageFilter;
  readonly engineeringTeam: string;
  readonly deckBucket: DeckBucketFilter;
}

const epicMatchesEngineeringTeam = (
  epic: SdlcEpicPhaseSummary,
  engineeringTeam: string
): boolean => {
  if (!engineeringTeam) {
    return true;
  }

  const teams = [
    epic.teams.ownEngineeringTeam,
    ...epic.teams.contributingEngineeringTeams,
    ...(epic.productTags ?? []),
  ].filter((team): team is string => Boolean(team));

  return teams.some((team) => team === engineeringTeam);
};

const epicMatchesDeckBucket = (epic: SdlcEpicPhaseSummary, deckBucket: DeckBucketFilter): boolean => {
  if (!deckBucket) {
    return true;
  }

  return epic.release?.deckBucket === deckBucket;
};

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
  if (!epicBelongsToSecurityOrg(epic)) {
    return false;
  }

  if (filters.owner && epic.owner !== filters.owner) {
    return false;
  }

  if (!epicMatchesEngineeringTeam(epic, filters.engineeringTeam)) {
    return false;
  }

  if (!epicMatchesDeckBucket(epic, filters.deckBucket)) {
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

export const applySecurityScopeToRoadmaps = (
  roadmaps: readonly SdlcRoadmapGroup[]
): SdlcRoadmapGroup[] =>
  roadmaps
    .map((roadmap) => ({
      ...roadmap,
      epics: roadmap.epics.filter((epic) => epicBelongsToSecurityOrg(epic)),
    }))
    .filter((roadmap) => roadmap.epics.length > 0);

export const groupRoadmapsByOrgTeamSubteam = (
  roadmaps: readonly SdlcRoadmapGroup[]
): ExecutiveOrgTeamGroup[] => {
  const allEpics = roadmaps.flatMap((roadmap) => roadmap.epics);
  const orgTeamGroups: ExecutiveOrgTeamGroup[] = [];

  for (const teamRecord of TEAM_DIMENSION_SEED) {
    const orgTeamKey = teamRecord.org_team.key;
    const orgEpics = allEpics.filter((epic) =>
      epicBelongsToOrgTeam(toEpicSubteamMatchInput(epic), orgTeamKey)
    );
    if (orgEpics.length === 0) {
      continue;
    }

    const subteamEpicsMap = groupEpicsBySubteam(orgEpics, teamRecord);
    const subteamDefinitions = resolveSubteamDefinitionsForOrg(orgTeamKey, teamRecord.subteams);
    const subteams: ExecutiveSubteamGroup[] = [];
    const assignedEpicIds = new Set<string>();

    for (const subteam of subteamDefinitions) {
      const subteamKey = slugifySubteamKey(subteam.name);
      const subteamEpics = subteamEpicsMap[subteamKey] ?? [];
      if (subteamEpics.length === 0) {
        continue;
      }

      for (const epic of subteamEpics) {
        assignedEpicIds.add(epic.id);
      }

      subteams.push({
        subteamKey,
        subteamName: subteam.name,
        roadmaps: groupEpicsIntoRoadmaps(subteamEpics),
      });
    }

    const unassignedEpics = orgEpics.filter((epic) => !assignedEpicIds.has(epic.id));
    if (unassignedEpics.length > 0) {
      subteams.push({
        subteamKey: 'unassigned',
        subteamName: 'Unassigned',
        roadmaps: groupEpicsIntoRoadmaps(unassignedEpics),
      });
    }

    orgTeamGroups.push({
      orgTeamKey,
      orgTeamName: teamRecord.org_team.name,
      subteams,
    });
  }

  return orgTeamGroups;
};

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
  const securityRoadmaps = applySecurityScopeToRoadmaps(roadmaps);
  const owners = new Set<string>();

  for (const roadmap of securityRoadmaps) {
    for (const epic of roadmap.epics) {
      if (epic.owner) {
        owners.add(epic.owner);
      }
    }
  }

  return [...owners].sort((left, right) => left.localeCompare(right));
};

export const collectEngineeringTeams = (roadmaps: readonly SdlcRoadmapGroup[]): string[] => {
  const securityRoadmaps = applySecurityScopeToRoadmaps(roadmaps);
  const teams = new Set<string>();

  for (const roadmap of securityRoadmaps) {
    for (const epic of roadmap.epics) {
      if (epic.teams.ownEngineeringTeam) {
        teams.add(epic.teams.ownEngineeringTeam);
      }
      for (const team of epic.teams.contributingEngineeringTeams) {
        teams.add(team);
      }
    }
  }

  return [...teams].sort((left, right) => left.localeCompare(right));
};

export const isWorkflowsExecutiveView = (filters: ExecutiveFilters): boolean =>
  filters.product === DEFAULT_EXECUTIVE_PRODUCT ||
  filters.engineeringTeam === DEFAULT_EXECUTIVE_ENGINEERING_TEAM;

export const collectProducts = (roadmaps: readonly SdlcRoadmapGroup[]): string[] => {
  const securityRoadmaps = applySecurityScopeToRoadmaps(roadmaps);
  const products = new Set<string>();

  for (const roadmap of securityRoadmaps) {
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
