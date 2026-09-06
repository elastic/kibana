/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpFetchQuery, HttpSetup } from '@kbn/core/public';
import {
  SDLC_EPICS_ROUTE,
  SDLC_INTERNAL_API_VERSION,
  SDLC_ROADMAPS_ROUTE,
  SDLC_SYNC_STATUS_ROUTE,
  SDLC_TEAMS_ROUTE,
} from '../../common/api/constants';
import type {
  SdlcEpicsResponse,
  SdlcRoadmapsResponse,
  SdlcSyncStatusResponse,
  SdlcTeamsResponse,
} from '../../common/api/types';

export interface SdlcEpicsQuery {
  readonly roadmapId?: string;
  readonly product?: string;
  readonly search?: string;
}

export interface SdlcApiClient {
  getSyncStatus: () => Promise<SdlcSyncStatusResponse>;
  getRoadmaps: (query?: SdlcEpicsQuery) => Promise<SdlcRoadmapsResponse>;
  getEpics: (query?: SdlcEpicsQuery) => Promise<SdlcEpicsResponse>;
  getTeams: () => Promise<SdlcTeamsResponse>;
}

const toQuery = (query?: SdlcEpicsQuery): HttpFetchQuery | undefined => {
  if (!query) {
    return undefined;
  }

  const nextQuery: HttpFetchQuery = {};
  if (query.roadmapId) {
    nextQuery.roadmapId = query.roadmapId;
  }
  if (query.product) {
    nextQuery.product = query.product;
  }
  if (query.search) {
    nextQuery.search = query.search;
  }

  return Object.keys(nextQuery).length > 0 ? nextQuery : undefined;
};

export const createSdlcApiClient = (http: HttpSetup): SdlcApiClient => ({
  getSyncStatus: () =>
    http.fetch<SdlcSyncStatusResponse>(SDLC_SYNC_STATUS_ROUTE, {
      method: 'GET',
      version: SDLC_INTERNAL_API_VERSION,
    }),
  getRoadmaps: (query) =>
    http.fetch<SdlcRoadmapsResponse>(SDLC_ROADMAPS_ROUTE, {
      method: 'GET',
      version: SDLC_INTERNAL_API_VERSION,
      query: toQuery(query),
    }),
  getEpics: (query) =>
    http.fetch<SdlcEpicsResponse>(SDLC_EPICS_ROUTE, {
      method: 'GET',
      version: SDLC_INTERNAL_API_VERSION,
      query: toQuery(query),
    }),
  getTeams: () =>
    http.fetch<SdlcTeamsResponse>(SDLC_TEAMS_ROUTE, {
      method: 'GET',
      version: SDLC_INTERNAL_API_VERSION,
    }),
});
