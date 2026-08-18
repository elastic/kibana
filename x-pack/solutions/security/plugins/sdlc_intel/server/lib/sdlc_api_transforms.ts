/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildSubteamCards,
  formatSubteamSelectionKey,
  groupEpicsBySubteam,
  UNMAPPED_ROADMAP_GROUP_TITLE,
  type TeamDimensionRecord,
} from '@kbn/sdlc-data-layer';
import type {
  SdlcEpicPhaseSummary,
  SdlcPortfolioSummary,
  SdlcRoadmapGroup,
  SdlcSubteamCard,
  SdlcTeamCard,
  SdlcTeamMatrixCell,
  SdlcTeamMatrixRow,
  SdlcTicketByRepoGroup,
} from '../../common/api/types';

export interface TeamDimensionSource {
  readonly org_team?: {
    readonly key?: string;
    readonly name?: string;
    readonly members_count?: number;
  };
  readonly subteams?: readonly string[];
  readonly aliases?: {
    readonly project_team_values?: readonly string[];
    readonly github_labels?: readonly string[];
    readonly github_org_slugs?: readonly string[];
  };
}

export interface EpicPhaseSource {
  readonly roadmap?: {
    readonly id?: string;
    readonly title?: string;
    readonly product?: string;
  };
  readonly epic?: {
    readonly key?: string;
    readonly display_id?: string;
    readonly title?: string;
    readonly summary?: string;
    readonly owner?: string;
    readonly url?: string;
    readonly teams?: readonly string[];
  };
  readonly teams?: {
    readonly own_org_team?: string;
    readonly own_engineering_team?: string;
    readonly contributing_org_teams?: string[];
    readonly contributing_engineering_teams?: string[];
    readonly cross_team?: boolean;
    readonly team_count?: number;
  };
  readonly links?: {
    readonly project_url?: string;
    readonly prd_url?: string;
    readonly arch_url?: string;
  };
  readonly phases?: Record<string, { gate?: string } & Record<string, unknown>>;
  readonly rollup?: {
    readonly coverage_pct?: number;
    readonly delivery_coverage_pct?: number;
    readonly gates_passed_pct?: number;
    readonly status?: string;
  };
  readonly tickets_by_repo?: SdlcTicketByRepoGroup[];
  readonly project?: { readonly number?: number };
  readonly release?: {
    readonly milestone?: string;
    readonly deck_feature?: string;
    readonly deck_bucket?: string;
    readonly roadmap_stage?: string;
    readonly initiative?: string;
  };
}

export const mapTeamDimensionDocument = (
  source: TeamDimensionSource | undefined
): TeamDimensionRecord | undefined => {
  const key = source?.org_team?.key;
  const name = source?.org_team?.name;
  if (!key || !name) {
    return undefined;
  }

  return {
    org_team: {
      key,
      name,
      members_count: source.org_team?.members_count ?? 0,
    },
    subteams: source.subteams ?? [],
    aliases: {
      project_team_values: source.aliases?.project_team_values ?? [],
      github_labels: source.aliases?.github_labels ?? [],
      github_org_slugs: source.aliases?.github_org_slugs ?? [],
    },
  };
};

const gateToMiniPhase = (gate: string | undefined): string => {
  if (gate === 'pass') {
    return 'p';
  }
  if (gate === 'warn') {
    return 'w';
  }
  if (gate === 'fail') {
    return 'f';
  }
  return 'n';
};

export const mapEpicPhaseDocument = (
  id: string,
  source: EpicPhaseSource | undefined
): SdlcEpicPhaseSummary | undefined => {
  const epicKey = source?.epic?.key;
  if (!epicKey) {
    return undefined;
  }

  return {
    id,
    epicKey,
    displayId: source.epic?.display_id ?? epicKey,
    title: source.epic?.title ?? epicKey,
    summary: source.epic?.summary,
    owner: source.epic?.owner,
    status: source.rollup?.status ?? 'open',
    coveragePct: source.rollup?.coverage_pct ?? 0,
    deliveryCoveragePct: source.rollup?.delivery_coverage_pct ?? 0,
    gatesPassedPct: source.rollup?.gates_passed_pct ?? 0,
    roadmap: {
      id: source.roadmap?.id ?? 'unmapped',
      title: source.roadmap?.title,
      product: source.roadmap?.product,
    },
    teams: {
      ownOrgTeam: source.teams?.own_org_team,
      ownEngineeringTeam: source.teams?.own_engineering_team,
      contributingOrgTeams: source.teams?.contributing_org_teams ?? [],
      contributingEngineeringTeams: source.teams?.contributing_engineering_teams ?? [],
      crossTeam: source.teams?.cross_team ?? false,
      teamCount: source.teams?.team_count ?? 0,
    },
    links: {
      projectUrl: source.links?.project_url,
      prdUrl: source.links?.prd_url,
      archUrl: source.links?.arch_url,
    },
    phases: source.phases ?? {},
    ticketsByRepo: source.tickets_by_repo ?? [],
    projectNumber: source.project?.number,
    release: {
      milestone: source.release?.milestone,
      deckFeature: source.release?.deck_feature,
      deckBucket: source.release?.deck_bucket,
      roadmapStage: source.release?.roadmap_stage,
    },
    productTags: source.epic?.teams?.filter((team) => team !== 'One Workflow') ?? [],
  };
};

export const groupEpicsByRoadmap = (epics: readonly SdlcEpicPhaseSummary[]): SdlcRoadmapGroup[] => {
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

export const buildPortfolioSummary = (epics: readonly SdlcEpicPhaseSummary[]): SdlcPortfolioSummary => {
  const statusCounts = { closed: 0, inProgress: 0, open: 0 };
  let ticketsWithoutPrCount = 0;

  for (const epic of epics) {
    if (epic.status === 'closed') {
      statusCounts.closed += 1;
    } else if (epic.status === 'in-progress') {
      statusCounts.inProgress += 1;
    } else {
      statusCounts.open += 1;
    }

    for (const repoGroup of epic.ticketsByRepo) {
      for (const item of repoGroup.items) {
        if (item.status !== 'closed' && item.prRefs.length === 0) {
          ticketsWithoutPrCount += 1;
        }
      }
    }
  }

  const portfolioCoveragePct =
    epics.length > 0
      ? Math.round(epics.reduce((sum, epic) => sum + epic.coveragePct, 0) / epics.length)
      : 0;

  return {
    portfolioCoveragePct,
    epicStatusCounts: statusCounts,
    epicCount: epics.length,
    atRiskEpicCount: epics.filter((epic) => epic.coveragePct < 30).length,
    ticketsWithoutPrCount,
  };
};

const readPhaseGate = (phases: Record<string, unknown>, key: string): string | undefined => {
  const phase = phases[key];
  if (phase && typeof phase === 'object' && 'gate' in phase) {
    const gate = (phase as { gate?: string }).gate;
    return typeof gate === 'string' ? gate : undefined;
  }
  return undefined;
};

export const buildTeamMatrixRows = ({
  epics,
  teamRecords,
  roadmapIds,
}: {
  epics: readonly SdlcEpicPhaseSummary[];
  teamRecords: readonly TeamDimensionRecord[];
  roadmapIds: readonly string[];
}): SdlcTeamMatrixRow[] =>
  teamRecords.map((teamRecord) => {
    const teamKey = teamRecord.org_team.key;
    const teamEpics = epics.filter(
      (epic) =>
        epic.teams.ownOrgTeam === teamKey ||
        epic.teams.contributingOrgTeams.includes(teamKey)
    );

    const cells: Record<string, SdlcTeamMatrixCell> = {};
    for (const roadmapId of roadmapIds) {
      const roadmapEpics = teamEpics.filter((epic) => epic.roadmap.id === roadmapId);
      if (roadmapEpics.length === 0) {
        cells[roadmapId] = { pct: 0, phaseGates: [] };
        continue;
      }

      const pct = Math.round(
        roadmapEpics.reduce((sum, epic) => sum + epic.coveragePct, 0) / roadmapEpics.length
      );
      const representative = roadmapEpics[0];
      const phaseGates = [
        gateToMiniPhase(readPhaseGate(representative.phases, 'p1_prd')),
        gateToMiniPhase(readPhaseGate(representative.phases, 'p2_arch')),
        gateToMiniPhase(readPhaseGate(representative.phases, 'p3_ai_coverage')),
        gateToMiniPhase(readPhaseGate(representative.phases, 'p4_tickets')),
        gateToMiniPhase(readPhaseGate(representative.phases, 'p5_prs')),
        gateToMiniPhase(readPhaseGate(representative.phases, 'p6_defects')),
        gateToMiniPhase(readPhaseGate(representative.phases, 'p7_production')),
        gateToMiniPhase(readPhaseGate(representative.phases, 'p8_telemetry')),
      ];

      cells[roadmapId] = { pct, phaseGates };
    }

    return {
      teamKey,
      teamName: teamRecord.org_team.name,
      cells,
    };
  });

export const buildTeamCards = ({
  epics,
  teamRecords,
}: {
  epics: readonly SdlcEpicPhaseSummary[];
  teamRecords: readonly TeamDimensionRecord[];
}): SdlcTeamCard[] =>
  teamRecords.map((teamRecord) => {
    const teamKey = teamRecord.org_team.key;
    const teamEpics = epics.filter(
      (epic) =>
        epic.teams.ownOrgTeam === teamKey ||
        epic.teams.contributingOrgTeams.includes(teamKey)
    );

    let ticketsDone = 0;
    let ticketsTotal = 0;
    let aiGenerated = 0;
    let toProdDone = 0;

    for (const epic of teamEpics) {
      const p4 = epic.phases.p4_tickets;
      if (p4 && typeof p4 === 'object') {
        const done = typeof (p4 as { done?: number }).done === 'number' ? (p4 as { done: number }).done : 0;
        const total = typeof (p4 as { total?: number }).total === 'number' ? (p4 as { total: number }).total : 0;
        const aiGen =
          typeof (p4 as { ai_gen?: number }).ai_gen === 'number' ? (p4 as { ai_gen: number }).ai_gen : 0;
        ticketsDone += done;
        ticketsTotal += total;
        aiGenerated += aiGen;
        toProdDone += done;
      }
    }

    const gatesPct =
      teamEpics.length > 0
        ? Math.round(teamEpics.reduce((sum, epic) => sum + epic.gatesPassedPct, 0) / teamEpics.length)
        : 0;

    return {
      key: teamKey,
      name: teamRecord.org_team.name,
      membersCount: teamRecord.org_team.members_count,
      subteams: teamRecord.subteams,
      epicCount: teamEpics.length,
      gatesPct,
      ticketsDone,
      ticketsTotal,
      toProdPct: ticketsTotal > 0 ? Math.round((toProdDone / ticketsTotal) * 100) : 0,
      aiPct: ticketsTotal > 0 ? Math.round((aiGenerated / ticketsTotal) * 100) : 0,
    };
  });

export const groupEpicsByTeam = (
  epics: readonly SdlcEpicPhaseSummary[],
  teamRecords: readonly TeamDimensionRecord[]
): Record<string, SdlcEpicPhaseSummary[]> => {
  const grouped: Record<string, SdlcEpicPhaseSummary[]> = {};

  for (const teamRecord of teamRecords) {
    const teamKey = teamRecord.org_team.key;
    grouped[teamKey] = epics.filter(
      (epic) =>
        epic.teams.ownOrgTeam === teamKey ||
        epic.teams.contributingOrgTeams.includes(teamKey)
    );
  }

  return grouped;
};

const toSubteamEpicInput = (epic: SdlcEpicPhaseSummary) => ({
  epicKey: epic.epicKey,
  projectNumber: epic.projectNumber,
  ownOrgTeam: epic.teams.ownOrgTeam,
  contributingOrgTeams: epic.teams.contributingOrgTeams,
  ownEngineeringTeam: epic.teams.ownEngineeringTeam,
  contributingEngineeringTeams: epic.teams.contributingEngineeringTeams,
  gatesPassedPct: epic.gatesPassedPct,
  phases: epic.phases,
});

export const buildSubteamsResponse = ({
  epics,
  teamRecords,
}: {
  epics: readonly SdlcEpicPhaseSummary[];
  teamRecords: readonly TeamDimensionRecord[];
}): {
  subteamsByOrgTeam: Record<string, SdlcSubteamCard[]>;
  epicsBySubteam: Record<string, SdlcEpicPhaseSummary[]>;
} => {
  const subteamsByOrgTeam: Record<string, SdlcSubteamCard[]> = {};
  const epicsBySubteam: Record<string, SdlcEpicPhaseSummary[]> = {};

  for (const teamRecord of teamRecords) {
    const orgTeamKey = teamRecord.org_team.key;
    const subteamCards = buildSubteamCards({
      epics: epics.map(toSubteamEpicInput),
      teamRecord,
    });

    subteamsByOrgTeam[orgTeamKey] = subteamCards.map((card) => ({
      key: card.key,
      name: card.name,
      orgTeamKey: card.orgTeamKey,
      epicCount: card.epicCount,
      gatesPct: card.gatesPct,
      ticketsDone: card.ticketsDone,
      ticketsTotal: card.ticketsTotal,
      toProdPct: card.toProdPct,
      aiPct: card.aiPct,
      githubTeamUrls: card.githubTeamUrls,
      githubProjects: card.githubProjects.map((project) => ({
        number: project.number,
        title: project.title,
        url: project.url,
        viewNumber: project.view_number,
      })),
      projectTeamValues: card.projectTeamValues,
    }));

    const grouped = groupEpicsBySubteam(epics.map(toSubteamEpicInput), teamRecord);
    for (const [subteamKey, subteamEpics] of Object.entries(grouped)) {
      const selectionKey = formatSubteamSelectionKey({ orgTeamKey, subteamKey });
      epicsBySubteam[selectionKey] = epics.filter((epic) =>
        subteamEpics.some((match) => match.epicKey === epic.epicKey)
      );
    }
  }

  return { subteamsByOrgTeam, epicsBySubteam };
};
