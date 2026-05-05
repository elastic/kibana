/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import {
  DETECTION_ENGINE_SEARCH_UNIFIED_ALERTS_URL,
  DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL,
  DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL,
  DETECTION_ENGINE_SET_UNIFIED_ALERTS_ASSIGNEES_URL,
} from '../../../../../common/constants';
import type {
  SearchUnifiedAlertsRequestBody,
  SearchUnifiedAlertsResponse,
  SetUnifiedAlertsWorkflowStatusRequestBody,
  SetUnifiedAlertsTagsRequestBody,
  SetUnifiedAlertsAssigneesRequestBody,
} from '../../../../../common/api/detection_engine/unified_alerts';
import { KibanaServices } from '../../../lib/kibana';

/**
 * Parameters for searching unified alerts
 */
export interface SearchUnifiedAlertsParams {
  /** The Elasticsearch query DSL object */
  query: SearchUnifiedAlertsRequestBody;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}

/**
 * Searches unified alerts (detection and attack alerts) by providing a query DSL.
 * This endpoint searches across both detection alerts and attack alerts.
 *
 * @param params - The search parameters
 * @param params.query - The Elasticsearch query DSL object
 * @param params.signal - Optional AbortSignal for cancelling the request
 * @returns Promise resolving to the search response containing alerts
 */
export const searchUnifiedAlerts = async ({
  query,
  signal,
}: SearchUnifiedAlertsParams): Promise<SearchUnifiedAlertsResponse> => {
  return KibanaServices.get().http.post<SearchUnifiedAlertsResponse>(
    DETECTION_ENGINE_SEARCH_UNIFIED_ALERTS_URL,
    {
      version: '1',
      body: JSON.stringify(query),
      signal,
    }
  );
};

/**
 * Parameters for setting workflow status on unified alerts
 */
export interface SetUnifiedAlertsWorkflowStatusParams {
  /** The request body containing status and alert IDs */
  body: SetUnifiedAlertsWorkflowStatusRequestBody;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}

/**
 * Sets the workflow status (e.g., open, closed, acknowledged) for unified alerts.
 * Updates both detection alerts and attack alerts that match the provided IDs.
 *
 * @param params - The update parameters
 * @param params.body - The request body containing the status and alert IDs to update
 * @param params.signal - Optional AbortSignal for cancelling the request
 * @returns Promise resolving to the update by query response with the number of updated alerts
 */
export const setUnifiedAlertsWorkflowStatus = async ({
  body,
  signal,
}: SetUnifiedAlertsWorkflowStatusParams): Promise<estypes.UpdateByQueryResponse> => {
  return KibanaServices.get().http.post<estypes.UpdateByQueryResponse>(
    DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL,
    {
      version: '1',
      body: JSON.stringify(body),
      signal,
    }
  );
};

/**
 * Parameters for setting tags on unified alerts
 */
export interface SetUnifiedAlertsTagsParams {
  /** The request body containing tags and alert IDs */
  body: SetUnifiedAlertsTagsRequestBody;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}

/**
 * Sets tags for unified alerts by adding or removing tags from the specified alerts.
 * Updates both detection alerts and attack alerts that match the provided IDs.
 *
 * @param params - The update parameters
 * @param params.body - The request body containing tags to add/remove and alert IDs to update
 * @param params.signal - Optional AbortSignal for cancelling the request
 * @returns Promise resolving to the update by query response with the number of updated alerts
 */
export const setUnifiedAlertsTags = async ({
  body,
  signal,
}: SetUnifiedAlertsTagsParams): Promise<estypes.UpdateByQueryResponse> => {
  return KibanaServices.get().http.post<estypes.UpdateByQueryResponse>(
    DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL,
    {
      version: '1',
      body: JSON.stringify(body),
      signal,
    }
  );
};

/**
 * Parameters for setting assignees on unified alerts
 */
export interface SetUnifiedAlertsAssigneesParams {
  /** The request body containing assignees and alert IDs */
  body: SetUnifiedAlertsAssigneesRequestBody;
  /** Optional AbortSignal for cancelling request */
  signal?: AbortSignal;
}

/**
 * Sets assignees for unified alerts by adding or removing assignees from the specified alerts.
 * Updates both detection alerts and attack alerts that match the provided IDs.
 *
 * @param params - The update parameters
 * @param params.body - The request body containing assignees to add/remove and alert IDs to update
 * @param params.signal - Optional AbortSignal for cancelling the request
 * @returns Promise resolving to the update by query response with the number of updated alerts
 */
export const setUnifiedAlertsAssignees = async ({
  body,
  signal,
}: SetUnifiedAlertsAssigneesParams): Promise<estypes.UpdateByQueryResponse> => {
  return KibanaServices.get().http.post<estypes.UpdateByQueryResponse>(
    DETECTION_ENGINE_SET_UNIFIED_ALERTS_ASSIGNEES_URL,
    {
      version: '1',
      body: JSON.stringify(body),
      signal,
    }
  );
};
