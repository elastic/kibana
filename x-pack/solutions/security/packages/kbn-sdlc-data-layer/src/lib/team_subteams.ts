/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TeamDimensionRecord } from '../config/team_dimension';
import {
  buildGithubProjectViewUrl,
  buildGithubTeamUrl,
  resolveSubteamDefinitionsForOrg,
  slugifySubteamKey,
  type GitHubProjectLink,
  type SubteamDefinition,
} from '../config/team_subteam_definitions';

export interface EpicSubteamMatchInput {
  readonly epicKey: string;
  readonly projectNumber?: number;
  readonly ownOrgTeam?: string;
  readonly contributingOrgTeams: readonly string[];
  readonly ownEngineeringTeam?: string;
  readonly contributingEngineeringTeams: readonly string[];
  readonly gatesPassedPct?: number;
  readonly phases?: Record<string, unknown>;
}

export interface SubteamCardMetrics {
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
  readonly githubProjects: readonly GitHubProjectLink[];
  readonly projectTeamValues: readonly string[];
}

const epicRollupMetrics = (
  epics: readonly EpicSubteamMatchInput[]
): Omit<
  SubteamCardMetrics,
  'key' | 'name' | 'orgTeamKey' | 'githubTeamUrls' | 'githubProjects' | 'projectTeamValues'
> => {
  let ticketsDone = 0;
  let ticketsTotal = 0;
  let aiGenerated = 0;
  let toProdDone = 0;
  let gatesSum = 0;

  for (const epic of epics) {
    const p4 = epic.phases?.p4_tickets;
    if (p4 && typeof p4 === 'object') {
      const phase = p4 as Record<string, unknown>;
      const done = typeof phase.done === 'number' ? phase.done : 0;
      const total = typeof phase.total === 'number' ? phase.total : 0;
      const aiGen = typeof phase.ai_gen === 'number' ? phase.ai_gen : 0;
      ticketsDone += done;
      ticketsTotal += total;
      aiGenerated += aiGen;
      toProdDone += done;
    }
    if (typeof epic.gatesPassedPct === 'number') {
      gatesSum += epic.gatesPassedPct;
    }
  }

  const epicCount = epics.length;
  return {
    epicCount,
    gatesPct: epicCount > 0 ? Math.round(gatesSum / epicCount) : 0,
    ticketsDone,
    ticketsTotal,
    toProdPct: ticketsTotal > 0 ? Math.round((toProdDone / ticketsTotal) * 100) : 0,
    aiPct: ticketsTotal > 0 ? Math.round((aiGenerated / ticketsTotal) * 100) : 0,
  };
};

export const epicBelongsToOrgTeam = (
  epic: EpicSubteamMatchInput,
  orgTeamKey: string
): boolean =>
  epic.ownOrgTeam === orgTeamKey ||
  (epic.contributingOrgTeams ?? []).includes(orgTeamKey);

export const epicBelongsToSubteam = (
  epic: EpicSubteamMatchInput,
  subteam: SubteamDefinition,
  orgTeamKey: string
): boolean => {
  if (!epicBelongsToOrgTeam(epic, orgTeamKey)) {
    return false;
  }

  const engineeringTeams = [
    epic.ownEngineeringTeam,
    ...(epic.contributingEngineeringTeams ?? []),
  ].filter((value): value is string => Boolean(value));

  for (const projectTeam of subteam.project_team_values ?? []) {
    if (engineeringTeams.some((team) => team === projectTeam)) {
      return true;
    }
  }

  if (subteam.name === 'One Workflow' && epic.epicKey.startsWith('[One Workflow]')) {
    return true;
  }

  const projectNumbers = subteam.github_projects?.map((project) => project.number) ?? [];
  if (
    epic.projectNumber !== undefined &&
    projectNumbers.includes(epic.projectNumber) &&
    engineeringTeams.includes('One Workflow')
  ) {
    return true;
  }

  if (
    epic.projectNumber !== undefined &&
    projectNumbers.includes(epic.projectNumber) &&
    (subteam.project_team_values?.length ?? 0) === 0 &&
    /workflow/i.test(epic.epicKey)
  ) {
    return true;
  }

  return false;
};

export const buildSubteamCards = <TEpic extends EpicSubteamMatchInput>({
  epics,
  teamRecord,
}: {
  epics: readonly TEpic[];
  teamRecord: TeamDimensionRecord;
}): SubteamCardMetrics[] => {
  const orgTeamKey = teamRecord.org_team.key;
  const orgEpics = epics.filter((epic) => epicBelongsToOrgTeam(epic, orgTeamKey));
  const subteamDefinitions = resolveSubteamDefinitionsForOrg(orgTeamKey, teamRecord.subteams);

  return subteamDefinitions.map((subteam) => {
    const subteamEpics = orgEpics.filter((epic) => epicBelongsToSubteam(epic, subteam, orgTeamKey));
    const metrics = epicRollupMetrics(subteamEpics);

    return {
      key: slugifySubteamKey(subteam.name),
      name: subteam.name,
      orgTeamKey,
      ...metrics,
      githubTeamUrls: (subteam.github_org_slugs ?? []).map(buildGithubTeamUrl),
      githubProjects: subteam.github_projects ?? [],
      projectTeamValues: subteam.project_team_values ?? [],
    };
  });
};

export const groupEpicsBySubteam = <TEpic extends EpicSubteamMatchInput>(
  epics: readonly TEpic[],
  teamRecord: TeamDimensionRecord
): Record<string, TEpic[]> => {
  const orgTeamKey = teamRecord.org_team.key;
  const orgEpics = epics.filter((epic) => epicBelongsToOrgTeam(epic, orgTeamKey));
  const subteamDefinitions = resolveSubteamDefinitionsForOrg(orgTeamKey, teamRecord.subteams);
  const grouped: Record<string, TEpic[]> = {};

  for (const subteam of subteamDefinitions) {
    const key = slugifySubteamKey(subteam.name);
    grouped[key] = orgEpics.filter((epic) => epicBelongsToSubteam(epic, subteam, orgTeamKey));
  }

  return grouped;
};

export const formatSubteamSelectionKey = ({
  orgTeamKey,
  subteamKey,
}: {
  orgTeamKey: string;
  subteamKey: string;
}): string => `${orgTeamKey}:${subteamKey}`;

export const parseSubteamSelectionKey = (
  selectionKey: string
): { orgTeamKey: string; subteamKey: string } | undefined => {
  const separatorIndex = selectionKey.indexOf(':');
  if (separatorIndex <= 0) {
    return undefined;
  }

  return {
    orgTeamKey: selectionKey.slice(0, separatorIndex),
    subteamKey: selectionKey.slice(separatorIndex + 1),
  };
};

export { buildGithubProjectViewUrl };
