/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Public Attacks API client helpers.
 */

import type { estypes } from '@elastic/elasticsearch';
import {
  DETECTION_ENGINE_ATTACKS_SEARCH_URL,
  DETECTION_ENGINE_ATTACKS_STATUS_URL,
  DETECTION_ENGINE_ATTACKS_TAGS_URL,
  DETECTION_ENGINE_ATTACKS_ASSIGNEES_URL,
} from '../../../../../common/constants';
import type {
  SearchAttacksRequestBody,
  SearchAttacksResponse,
  SetAttacksStatusRequestBody,
  SetAttacksTagsRequestBody,
  SetAttacksAssigneesRequestBody,
} from '../../../../../common/api/detection_engine/attacks';
import { KibanaServices } from '../../../lib/kibana';

const ATTACKS_API_VERSION = '2023-10-31';

/**
 * Parameters for searching attacks
 */
export interface SearchAttacksParams {
  /** The Elasticsearch query DSL object */
  query: SearchAttacksRequestBody;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}

/**
 * Searches attack discovery alerts by providing a query DSL.
 *
 * @param params - The search parameters
 * @param params.query - The Elasticsearch query DSL object
 * @param params.signal - Optional AbortSignal for cancelling the request
 * @returns Promise resolving to the search response containing attacks
 */
export const searchAttacks = async <TResponse = SearchAttacksResponse>({
  query,
  signal,
}: SearchAttacksParams): Promise<TResponse> => {
  return KibanaServices.get().http.post<TResponse>(DETECTION_ENGINE_ATTACKS_SEARCH_URL, {
    version: ATTACKS_API_VERSION,
    body: JSON.stringify(query),
    signal,
  });
};

/**
 * Parameters for setting workflow status on attacks
 */
export interface SetAttacksStatusParams {
  /** The request body containing status and attack IDs */
  body: SetAttacksStatusRequestBody;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}

/**
 * Sets the workflow status (e.g., open, closed, acknowledged) for attacks.
 * When `update_related_alerts` is true, related detection alerts are updated server-side.
 *
 * @param params - The update parameters
 * @param params.body - The request body containing the status and attack IDs to update
 * @param params.signal - Optional AbortSignal for cancelling the request
 * @returns Promise resolving to the update by query response with the number of updated attacks
 */
export const setAttacksStatus = async ({
  body,
  signal,
}: SetAttacksStatusParams): Promise<estypes.UpdateByQueryResponse> => {
  return KibanaServices.get().http.post<estypes.UpdateByQueryResponse>(
    DETECTION_ENGINE_ATTACKS_STATUS_URL,
    {
      version: ATTACKS_API_VERSION,
      body: JSON.stringify(body),
      signal,
    }
  );
};

/**
 * Parameters for setting tags on attacks
 */
export interface SetAttacksTagsParams {
  /** The request body containing tags and attack IDs */
  body: SetAttacksTagsRequestBody;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}

/**
 * Sets tags for attacks by adding or removing tags from the specified attacks.
 * When `update_related_alerts` is true, related detection alerts are updated server-side.
 *
 * @param params - The update parameters
 * @param params.body - The request body containing tags to add/remove and attack IDs to update
 * @param params.signal - Optional AbortSignal for cancelling the request
 * @returns Promise resolving to the update by query response with the number of updated attacks
 */
export const setAttacksTags = async ({
  body,
  signal,
}: SetAttacksTagsParams): Promise<estypes.UpdateByQueryResponse> => {
  return KibanaServices.get().http.post<estypes.UpdateByQueryResponse>(
    DETECTION_ENGINE_ATTACKS_TAGS_URL,
    {
      version: ATTACKS_API_VERSION,
      body: JSON.stringify(body),
      signal,
    }
  );
};

/**
 * Parameters for setting assignees on attacks
 */
export interface SetAttacksAssigneesParams {
  /** The request body containing assignees and attack IDs */
  body: SetAttacksAssigneesRequestBody;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}

/**
 * Sets assignees for attacks by adding or removing assignees from the specified attacks.
 * When `update_related_alerts` is true, related detection alerts are updated server-side.
 *
 * @param params - The update parameters
 * @param params.body - The request body containing assignees to add/remove and attack IDs to update
 * @param params.signal - Optional AbortSignal for cancelling the request
 * @returns Promise resolving to the update by query response with the number of updated attacks
 */
export const setAttacksAssignees = async ({
  body,
  signal,
}: SetAttacksAssigneesParams): Promise<estypes.UpdateByQueryResponse> => {
  return KibanaServices.get().http.post<estypes.UpdateByQueryResponse>(
    DETECTION_ENGINE_ATTACKS_ASSIGNEES_URL,
    {
      version: ATTACKS_API_VERSION,
      body: JSON.stringify(body),
      signal,
    }
  );
};
