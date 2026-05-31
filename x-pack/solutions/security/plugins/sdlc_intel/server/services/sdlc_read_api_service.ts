/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SDLC_INDEX_NAMES,
  getTeamDimensionRecords,
  type TeamDimensionRecord,
} from '@kbn/sdlc-data-layer';
import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  SdlcEpicsResponse,
  SdlcEpicPhaseSummary,
  SdlcRoadmapsResponse,
  SdlcSyncStatusResponse,
  SdlcTeamsResponse,
} from '../../common/api/types';
import {
  buildPortfolioSummary,
  buildTeamCards,
  buildSubteamsResponse,
  buildTeamMatrixRows,
  groupEpicsByRoadmap,
  groupEpicsByTeam,
  mapEpicPhaseDocument,
  mapTeamDimensionDocument,
  type EpicPhaseSource,
  type TeamDimensionSource,
} from '../lib/sdlc_api_transforms';

const EPIC_PHASES_QUERY_SIZE = 1000;
const TEAM_DIMENSION_QUERY_SIZE = 100;

const isIndexMissingError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const meta = (error as { meta?: { body?: { error?: { type?: string } } } }).meta;
  return meta?.body?.error?.type === 'index_not_found_exception';
};

export const fetchEpicPhaseSummaries = async ({
  esClient,
  roadmapId,
  product,
  search,
}: {
  esClient: ElasticsearchClient;
  roadmapId?: string;
  product?: string;
  search?: string;
}): Promise<SdlcEpicPhaseSummary[]> => {
  const must: Array<Record<string, unknown>> = [];

  if (roadmapId) {
    must.push({ term: { 'roadmap.id': roadmapId } });
  }
  if (product) {
    must.push({ term: { 'roadmap.product': product } });
  }
  if (search) {
    must.push({
      multi_match: {
        query: search,
        fields: [
          'epic.key',
          'epic.title',
          'epic.summary',
          'epic.owner',
          'release.initiative',
        ],
      },
    });
  }

  try {
    const response = await esClient.search<EpicPhaseSource>({
      index: SDLC_INDEX_NAMES.SDLC_EPIC_PHASES,
      size: EPIC_PHASES_QUERY_SIZE,
      query: must.length > 0 ? { bool: { must } } : { match_all: {} },
      sort: [{ 'epic.title.keyword': { order: 'asc', unmapped_type: 'keyword' } }, { '@timestamp': 'desc' }],
    });

    const epics: SdlcEpicPhaseSummary[] = [];
    for (const hit of response.hits.hits) {
      const mapped = mapEpicPhaseDocument(hit._id ?? hit._source?.epic?.key ?? '', hit._source);
      if (mapped) {
        epics.push(mapped);
      }
    }

    return epics;
  } catch (error) {
    if (isIndexMissingError(error)) {
      return [];
    }
    throw error;
  }
};

export const fetchTeamDimensionRecords = async ({
  esClient,
}: {
  esClient: ElasticsearchClient;
}): Promise<readonly TeamDimensionRecord[]> => {
  try {
    const response = await esClient.search<TeamDimensionSource>({
      index: SDLC_INDEX_NAMES.SDLC_TEAM_DIMENSION,
      size: TEAM_DIMENSION_QUERY_SIZE,
      query: { match_all: {} },
      sort: [{ 'org_team.key': { order: 'asc', unmapped_type: 'keyword' } }],
    });

    const records = response.hits.hits
      .map((hit) => mapTeamDimensionDocument(hit._source))
      .filter((record): record is TeamDimensionRecord => record !== undefined);

    if (records.length > 0) {
      return records;
    }
  } catch (error) {
    if (!isIndexMissingError(error)) {
      throw error;
    }
  }

  return getTeamDimensionRecords();
};

export const fetchSyncStatus = async (
  esClient: ElasticsearchClient
): Promise<SdlcSyncStatusResponse> => {
  try {
    const [syncStateResponse, epicCountResponse, relationshipCountResponse] = await Promise.all([
      esClient.search<{ last_run_at?: string; last_run_status?: string }>({
        index: SDLC_INDEX_NAMES.GITHUB_SYNC_STATE,
        size: 1,
        sort: [{ last_run_at: { order: 'desc', unmapped_type: 'date' } }],
        _source: ['last_run_at', 'last_run_status'],
      }),
      esClient.count({ index: SDLC_INDEX_NAMES.SDLC_EPIC_PHASES }),
      esClient.count({ index: SDLC_INDEX_NAMES.GITHUB_INTEL_RELATIONSHIPS }),
    ]);

    const completedProjectsResponse = await esClient.count({
      index: SDLC_INDEX_NAMES.GITHUB_SYNC_STATE,
      query: {
        bool: {
          must: [
            { term: { entity_type: 'project' } },
            { term: { last_run_status: 'completed' } },
          ],
        },
      },
    });

    const latestSync = syncStateResponse.hits.hits[0]?._source;
    const lastSyncAt = latestSync?.last_run_at;
    const staleThresholdMs = 6 * 60 * 60 * 1000;
    const healthy =
      Boolean(lastSyncAt) &&
      latestSync?.last_run_status !== 'failed' &&
      Date.now() - new Date(lastSyncAt as string).getTime() < staleThresholdMs;

    return {
      healthy,
      lastSyncAt,
      completedProjects: completedProjectsResponse.count,
      epicPhaseCount: epicCountResponse.count,
      relationshipCount: relationshipCountResponse.count,
    };
  } catch (error) {
    if (isIndexMissingError(error)) {
      return {
        healthy: false,
        completedProjects: 0,
        epicPhaseCount: 0,
        relationshipCount: 0,
      };
    }
    throw error;
  }
};

export const getRoadmapsResponse = async ({
  esClient,
  roadmapId,
  product,
  search,
}: {
  esClient: ElasticsearchClient;
  roadmapId?: string;
  product?: string;
  search?: string;
}): Promise<SdlcRoadmapsResponse> => {
  const [sync, epics] = await Promise.all([
    fetchSyncStatus(esClient),
    fetchEpicPhaseSummaries({ esClient, roadmapId, product, search }),
  ]);

  return {
    sync,
    summary: buildPortfolioSummary(epics),
    roadmaps: groupEpicsByRoadmap(epics),
  };
};

export const getEpicsResponse = async ({
  esClient,
  roadmapId,
  product,
  search,
}: {
  esClient: ElasticsearchClient;
  roadmapId?: string;
  product?: string;
  search?: string;
}): Promise<SdlcEpicsResponse> => {
  const epics = await fetchEpicPhaseSummaries({ esClient, roadmapId, product, search });
  return {
    total: epics.length,
    epics,
  };
};

export const getTeamsResponse = async (
  esClient: ElasticsearchClient
): Promise<SdlcTeamsResponse> => {
  const [epics, teamRecords] = await Promise.all([
    fetchEpicPhaseSummaries({ esClient }),
    fetchTeamDimensionRecords({ esClient }),
  ]);
  const roadmapIds = [...new Set(epics.map((epic) => epic.roadmap.id))].sort();
  const teamCards = buildTeamCards({ epics, teamRecords });
  const epicsByTeam = groupEpicsByTeam(epics, teamRecords);
  const { subteamsByOrgTeam, epicsBySubteam } = buildSubteamsResponse({ epics, teamRecords });

  const totalTickets = teamCards.reduce((sum, team) => sum + team.ticketsTotal, 0);
  const totalDone = teamCards.reduce((sum, team) => sum + team.ticketsDone, 0);
  const totalAiWeighted = teamCards.reduce(
    (sum, team) => sum + Math.round((team.aiPct / 100) * team.ticketsTotal),
    0
  );

  return {
    summary: {
      teamsContributing: teamCards.filter((team) => team.epicCount > 0).length,
      teamsTotal: teamCards.length,
      crossTeamEpics: epics.filter((epic) => epic.teams.crossTeam).length,
      ticketsToProdPct: totalTickets > 0 ? Math.round((totalDone / totalTickets) * 100) : 0,
      aiAdoptionPct: totalTickets > 0 ? Math.round((totalAiWeighted / totalTickets) * 100) : 0,
    },
    teams: teamCards,
    matrix: {
      roadmaps: roadmapIds.map((id) => {
        const epic = epics.find((entry) => entry.roadmap.id === id);
        return {
          id,
          label: epic?.roadmap.title ?? id,
        };
      }),
      rows: buildTeamMatrixRows({ epics, teamRecords, roadmapIds }),
    },
    epicsByTeam,
    subteamsByOrgTeam,
    epicsBySubteam,
  };
};
