/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CANONICAL_PRODUCT_ROADMAPS,
  TEAM_DIMENSION_SEED,
  UNMAPPED_ROADMAP_GROUP_TITLE,
  epicBelongsToOrgTeam,
  groupEpicsBySubteam,
  resolveSubteamDefinitionsForOrg,
  slugifySubteamKey,
} from '@kbn/sdlc-data-layer';
import type { SdlcEpicPhaseSummary, SdlcRoadmapGroup } from '../../../../common/api/types';
import {
  groupRoadmapsByOrgTeamSubteam,
  type ExecutiveOrgTeamGroup,
} from '../../executive_page/lib/executive_filters';

export interface PipelineScope {
  readonly orgTeamKey: string;
  readonly subteamKey: string;
  readonly productRoadmapId: string;
}

export const DEFAULT_PIPELINE_SCOPE: PipelineScope = {
  orgTeamKey: '',
  subteamKey: '',
  productRoadmapId: '',
};

const toEpicOrgTeamInput = (epic: SdlcEpicPhaseSummary) => ({
  epicKey: epic.epicKey,
  projectNumber: epic.projectNumber,
  ownOrgTeam: epic.teams.ownOrgTeam,
  contributingOrgTeams: epic.teams.contributingOrgTeams ?? [],
  ownEngineeringTeam: epic.teams.ownEngineeringTeam,
  contributingEngineeringTeams: epic.teams.contributingEngineeringTeams ?? [],
  gatesPassedPct: epic.gatesPassedPct,
  phases: epic.phases,
});

const epicMatchesProductRoadmap = (epic: SdlcEpicPhaseSummary, productRoadmapId: string): boolean => {
  if (!productRoadmapId) {
    return true;
  }

  return epic.roadmap.id === productRoadmapId;
};

const epicMatchesOrgTeam = (epic: SdlcEpicPhaseSummary, orgTeamKey: string): boolean => {
  if (!orgTeamKey) {
    return true;
  }

  return epicBelongsToOrgTeam(toEpicOrgTeamInput(epic), orgTeamKey);
};

const filterEpicsBySubteamScope = (
  epics: readonly SdlcEpicPhaseSummary[],
  orgTeamKey: string,
  subteamKey: string
): SdlcEpicPhaseSummary[] => {
  const teamRecord = TEAM_DIMENSION_SEED.find((record) => record.org_team.key === orgTeamKey);
  if (!teamRecord) {
    return [];
  }

  const subteamEpics = groupEpicsBySubteam(epics, teamRecord, orgTeamKey);

  if (subteamKey === 'unassigned') {
    const assignedIds = new Set(
      Object.values(subteamEpics)
        .flat()
        .map((epic) => epic.id)
    );
    return epics.filter((epic) => !assignedIds.has(epic.id));
  }

  return subteamEpics[subteamKey] ?? [];
};

export const filterEpicsByPipelineScope = (
  epics: readonly SdlcEpicPhaseSummary[],
  scope: PipelineScope
): SdlcEpicPhaseSummary[] => {
  let filtered = epics.filter(
    (epic) =>
      epicMatchesProductRoadmap(epic, scope.productRoadmapId) &&
      epicMatchesOrgTeam(epic, scope.orgTeamKey)
  );

  if (scope.orgTeamKey && scope.subteamKey) {
    filtered = filterEpicsBySubteamScope(filtered, scope.orgTeamKey, scope.subteamKey);
  }

  return filtered;
};

const buildRoadmapGroup = ({
  id,
  title,
  product,
  epics,
}: {
  id: string;
  title: string;
  product: string;
  epics: readonly SdlcEpicPhaseSummary[];
}): SdlcRoadmapGroup => ({
  id,
  title,
  product,
  epicCount: epics.length,
  coveragePct:
    epics.length > 0
      ? Math.round(epics.reduce((sum, epic) => sum + epic.coveragePct, 0) / epics.length)
      : 0,
  epics: [...epics].sort((left, right) => left.title.localeCompare(right.title)),
});

const flattenOrgTeamGroups = (orgTeamGroups: readonly ExecutiveOrgTeamGroup[]): SdlcRoadmapGroup[] =>
  orgTeamGroups.flatMap((orgTeam) =>
    orgTeam.subteams.map((subteam) =>
      buildRoadmapGroup({
        id: `${orgTeam.orgTeamKey}:${subteam.subteamKey}`,
        title: `${orgTeam.orgTeamName} · ${subteam.subteamName}`,
        product: subteam.roadmaps[0]?.product ?? 'Security',
        epics: subteam.roadmaps.flatMap((roadmap) => roadmap.epics),
      })
    )
  );

/** Team-first pipeline sections: org team → subteam → epics (product roadmaps are nested inside). */
export const buildPipelineDisplayGroups = (
  roadmaps: readonly SdlcRoadmapGroup[],
  scope: PipelineScope
): SdlcRoadmapGroup[] => {
  const scopedEpics = filterEpicsByPipelineScope(
    roadmaps.flatMap((roadmap) => roadmap.epics),
    scope
  );

  if (scopedEpics.length === 0) {
    return [];
  }

  const scopedRoadmaps = groupEpicsIntoDisplayRoadmaps(scopedEpics);

  if (scope.orgTeamKey && scope.subteamKey) {
    const orgTeam = TEAM_DIMENSION_SEED.find((record) => record.org_team.key === scope.orgTeamKey);
    const subteamName =
      resolveSubteamDefinitionsForOrg(scope.orgTeamKey, orgTeam?.subteams ?? []).find(
        (definition) => slugifySubteamKey(definition.name) === scope.subteamKey
      )?.name ?? scope.subteamKey;

    return [
      buildRoadmapGroup({
        id: `${scope.orgTeamKey}:${scope.subteamKey}`,
        title: `${orgTeam?.org_team.name ?? scope.orgTeamKey} · ${subteamName}`,
        product: scopedRoadmaps[0]?.product ?? 'Security',
        epics: scopedEpics,
      }),
    ];
  }

  if (scope.orgTeamKey) {
    const orgTeam = TEAM_DIMENSION_SEED.find((record) => record.org_team.key === scope.orgTeamKey);
    const orgGroups = groupRoadmapsByOrgTeamSubteam(scopedRoadmaps).filter(
      (group) => group.orgTeamKey === scope.orgTeamKey
    );
    return flattenOrgTeamGroups(orgGroups).length > 0
      ? flattenOrgTeamGroups(orgGroups)
      : [
          buildRoadmapGroup({
            id: scope.orgTeamKey,
            title: orgTeam?.org_team.name ?? scope.orgTeamKey,
            product: scopedRoadmaps[0]?.product ?? 'Security',
            epics: scopedEpics,
          }),
        ];
  }

  if (scope.productRoadmapId) {
    const canonical = CANONICAL_PRODUCT_ROADMAPS.find((entry) => entry.id === scope.productRoadmapId);
    return [
      buildRoadmapGroup({
        id: scope.productRoadmapId,
        title: canonical?.title ?? scope.productRoadmapId,
        product: canonical?.product ?? 'Unknown',
        epics: scopedEpics,
      }),
    ];
  }

  const orgGroups = groupRoadmapsByOrgTeamSubteam(scopedRoadmaps);
  if (orgGroups.length > 0) {
    return flattenOrgTeamGroups(orgGroups);
  }

  return scopedRoadmaps;
};

const groupEpicsIntoDisplayRoadmaps = (
  epics: readonly SdlcEpicPhaseSummary[]
): SdlcRoadmapGroup[] => {
  const groups = new Map<string, SdlcRoadmapGroup>();

  for (const epic of epics) {
    const roadmapId = epic.roadmap.id;
    const roadmapTitle =
      roadmapId === 'unmapped' ? UNMAPPED_ROADMAP_GROUP_TITLE : epic.roadmap.title ?? roadmapId;
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
      title: roadmapTitle,
      product: epic.roadmap.product ?? 'Unknown',
      coveragePct: 0,
      epicCount: 1,
      epics: [epic],
    });
  }

  return [...groups.values()].map((group) => ({
    ...group,
    coveragePct:
      group.epics.length > 0
        ? Math.round(
            group.epics.reduce((sum, epic) => sum + epic.coveragePct, 0) / group.epics.length
          )
        : 0,
    epics: [...group.epics].sort((left, right) => left.title.localeCompare(right.title)),
  }));
};

export const buildOrgTeamScopeOptions = (): ReadonlyArray<{ value: string; text: string }> => [
  {
    value: '',
    text: 'All Security org teams',
  },
  ...TEAM_DIMENSION_SEED.map((record) => ({
    value: record.org_team.key,
    text: record.org_team.name,
  })),
];

export const buildSubteamScopeOptions = (
  orgTeamKey: string
): ReadonlyArray<{ value: string; text: string }> => {
  if (!orgTeamKey) {
    return [];
  }

  const teamRecord = TEAM_DIMENSION_SEED.find((record) => record.org_team.key === orgTeamKey);
  const subteams = resolveSubteamDefinitionsForOrg(orgTeamKey, teamRecord?.subteams ?? []);

  return [
    {
      value: '',
      text: 'All subteams',
    },
    ...subteams.map((subteam) => ({
      value: slugifySubteamKey(subteam.name),
      text: subteam.name,
    })),
    {
      value: 'unassigned',
      text: 'Unassigned',
    },
  ];
};

export const buildProductRoadmapScopeOptions = (): ReadonlyArray<{ value: string; text: string }> => [
  {
    value: '',
    text: 'All product roadmaps',
  },
  ...CANONICAL_PRODUCT_ROADMAPS.map((roadmap) => ({
    value: roadmap.id,
    text: roadmap.title,
  })),
  {
    value: 'unmapped',
    text: UNMAPPED_ROADMAP_GROUP_TITLE,
  },
];
