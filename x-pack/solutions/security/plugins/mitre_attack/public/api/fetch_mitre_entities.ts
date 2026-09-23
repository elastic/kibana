/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type {
  GetMitreEntitiesRequestParams,
  GetMitreEntitiesResponse,
} from '@kbn/security-mitre-attack-common';
import { GET_MITRE_ENTITIES_URL } from '@kbn/security-mitre-attack-common';
import { buildMitreEntitiesQueryParams } from './build_mitre_entities_query_params';

export interface FetchMitreEntitiesParams extends GetMitreEntitiesRequestParams {
  http: HttpStart;
  signal?: AbortSignal;
}

/** Fetches MITRE ATT&CK entities from the managed API. */
export const fetchMitreEntities = ({
  http,
  signal,
  ...queryParams
}: FetchMitreEntitiesParams): Promise<GetMitreEntitiesResponse> =>
  http.fetch<GetMitreEntitiesResponse>(GET_MITRE_ENTITIES_URL, {
    method: 'GET',
    version: '1',
    query: buildMitreEntitiesQueryParams(queryParams),
    signal,
  });
