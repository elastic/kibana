/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface SdlcSyncStatusResponse {
  readonly healthy: boolean;
  readonly lastSyncAt?: string;
  readonly completedProjects: number;
  readonly epicPhaseCount: number;
  readonly relationshipCount: number;
}

export interface SdlcTicketByRepoItem {
  readonly issueRef: string;
  readonly number?: number;
  readonly title: string;
  readonly status: string;
  readonly prRefs: readonly string[];
}

export interface SdlcTicketByRepoGroup {
  readonly repo: string;
  readonly items: readonly SdlcTicketByRepoItem[];
}

export interface SdlcEpicPhaseSummary {
  readonly id: string;
  readonly epicKey: string;
  readonly displayId: string;
  readonly title: string;
  readonly summary?: string;
  readonly owner?: string;
  readonly status: string;
  readonly coveragePct: number;
  readonly deliveryCoveragePct: number;
  readonly gatesPassedPct: number;
  readonly roadmap: {
    readonly id: string;
    readonly title?: string;
    readonly product?: string;
  };
  readonly teams: {
    readonly ownOrgTeam?: string;
    readonly ownEngineeringTeam?: string;
    readonly contributingOrgTeams: readonly string[];
    readonly contributingEngineeringTeams: readonly string[];
    readonly crossTeam: boolean;
    readonly teamCount: number;
  };
  readonly links: {
    readonly projectUrl?: string;
    readonly prdUrl?: string;
    readonly archUrl?: string;
  };
  readonly phases: Record<string, unknown>;
  readonly ticketsByRepo: readonly SdlcTicketByRepoGroup[];
  readonly projectNumber?: number;
  readonly release?: {
    readonly milestone?: string;
    readonly deckFeature?: string;
    readonly deckBucket?: string;
    readonly roadmapStage?: string;
  };
  readonly productTags?: readonly string[];
}

export interface SdlcRoadmapGroup {
  readonly id: string;
  readonly title: string;
  readonly product: string;
  readonly coveragePct: number;
  readonly epicCount: number;
  readonly epics: readonly SdlcEpicPhaseSummary[];
}

export interface SdlcPortfolioSummary {
  readonly portfolioCoveragePct: number;
  readonly epicStatusCounts: {
    readonly closed: number;
    readonly inProgress: number;
    readonly open: number;
  };
  readonly epicCount: number;
  readonly atRiskEpicCount: number;
  readonly ticketsWithoutPrCount: number;
}

export interface SdlcRoadmapsResponse {
  readonly sync: SdlcSyncStatusResponse;
  readonly summary: SdlcPortfolioSummary;
  readonly roadmaps: readonly SdlcRoadmapGroup[];
}

export interface SdlcEpicsResponse {
  readonly total: number;
  readonly epics: readonly SdlcEpicPhaseSummary[];
}

export interface SdlcGitHubProjectLink {
  readonly number: number;
  readonly title?: string;
  readonly url: string;
  readonly viewNumber?: number;
}

export interface SdlcSubteamCard {
  readonly key: string;
  readonly name: string;
  readonly orgTeamKey: string;
  readonly epicCount: number;
  readonly gatesPct: number;
  readonly ticketsDone: number;
  readonly ticketsTotal: number;
  readonly toProdPct: number;
  readonly aiPct: number;
  readonly githubTeamUrls: readonly string[];
  readonly githubProjects: readonly SdlcGitHubProjectLink[];
  readonly projectTeamValues: readonly string[];
}

export interface SdlcTeamCard {
  readonly key: string;
  readonly name: string;
  readonly membersCount: number;
  readonly subteams: readonly string[];
  readonly epicCount: number;
  readonly gatesPct: number;
  readonly ticketsDone: number;
  readonly ticketsTotal: number;
  readonly toProdPct: number;
  readonly aiPct: number;
}

export interface SdlcTeamMatrixCell {
  readonly pct: number;
  readonly phaseGates: readonly string[];
}

export interface SdlcTeamMatrixRow {
  readonly teamKey: string;
  readonly teamName: string;
  readonly cells: Readonly<Record<string, SdlcTeamMatrixCell>>;
}

export interface SdlcTeamsResponse {
  readonly summary: {
    readonly teamsContributing: number;
    readonly teamsTotal: number;
    readonly crossTeamEpics: number;
    readonly ticketsToProdPct: number;
    readonly aiAdoptionPct: number;
  };
  readonly teams: readonly SdlcTeamCard[];
  readonly matrix: {
    readonly roadmaps: ReadonlyArray<{ id: string; label: string }>;
    readonly rows: readonly SdlcTeamMatrixRow[];
  };
  readonly epicsByTeam: Readonly<Record<string, readonly SdlcEpicPhaseSummary[]>>;
  readonly subteamsByOrgTeam: Readonly<Record<string, readonly SdlcSubteamCard[]>>;
  readonly epicsBySubteam: Readonly<Record<string, readonly SdlcEpicPhaseSummary[]>>;
}
