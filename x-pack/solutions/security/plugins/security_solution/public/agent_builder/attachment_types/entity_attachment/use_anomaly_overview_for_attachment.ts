/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart, IHttpFetchError } from '@kbn/core-http-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useQuery } from '@kbn/react-query';
import {
  API_VERSIONS,
  ENTITY_ANOMALY_OVERVIEW_INTERNAL_URL,
  ENTITY_ANOMALY_PRIVILEGES_INTERNAL_URL,
} from '../../../../common/entity_analytics/constants';
import type {
  EntityAnalyticsPrivileges,
  GetAnomalyOverviewResponse,
} from '../../../../common/api/entity_analytics';

const ANOMALY_PRIVILEGES_QUERY_KEY = 'AGENT_BUILDER_ANOMALY_PRIVILEGES';
const ANOMALY_OVERVIEW_QUERY_KEY = 'AGENT_BUILDER_ANOMALY_OVERVIEW';

export interface UseAnomalyOverviewForAttachmentParams {
  entityId: string;
  entityType: 'host' | 'user';
  enabled: boolean;
}

export interface UseAnomalyOverviewForAttachmentResult {
  data: GetAnomalyOverviewResponse | undefined;
  isLoading: boolean;
}

/**
 * Fetches the anomaly overview for the entity attachment card by calling the
 * anomaly privileges + anomaly overview routes directly with `http.fetch`.
 *
 * Intentionally bypasses `useAnomalyPrivileges` / `useAnomalyOverview`
 * (which go through `useEntityAnalyticsRoutes`) because that hook pulls in
 * Security Solution's Redux store (via `useIsExperimentalFeatureEnabled`),
 * which is not present in Agent Builder's provider tree. Mirrors the same
 * workaround already used by `useEntityForAttachment`.
 */
export const useAnomalyOverviewForAttachment = ({
  entityId,
  entityType,
  enabled,
}: UseAnomalyOverviewForAttachmentParams): UseAnomalyOverviewForAttachmentResult => {
  const { services } = useKibana<{ http: HttpStart }>();
  const http = services.http;

  const privilegesEnabled = enabled && Boolean(http);

  const { data: privileges, isLoading: isPrivilegesLoading } = useQuery<
    EntityAnalyticsPrivileges,
    IHttpFetchError
  >({
    queryKey: [ANOMALY_PRIVILEGES_QUERY_KEY],
    queryFn: () =>
      http.fetch<EntityAnalyticsPrivileges>(ENTITY_ANOMALY_PRIVILEGES_INTERNAL_URL, {
        version: API_VERSIONS.internal.v1,
        method: 'GET',
      }),
    enabled: privilegesEnabled,
    retry: 0,
  });

  const overviewEnabled = privilegesEnabled && Boolean(privileges?.has_all_required) && !!entityId;

  const { data, isLoading: isOverviewLoading } = useQuery<
    GetAnomalyOverviewResponse,
    IHttpFetchError
  >({
    queryKey: [ANOMALY_OVERVIEW_QUERY_KEY, entityType, entityId],
    queryFn: ({ signal }) =>
      http.fetch<GetAnomalyOverviewResponse>(
        ENTITY_ANOMALY_OVERVIEW_INTERNAL_URL.replace(
          '{entity_type}',
          encodeURIComponent(entityType)
        ).replace('{entity_id}', encodeURIComponent(entityId)),
        {
          version: API_VERSIONS.internal.v1,
          method: 'POST',
          body: JSON.stringify({}),
          signal,
        }
      ),
    enabled: overviewEnabled,
    refetchOnWindowFocus: false,
  });

  return {
    data,
    isLoading: (privilegesEnabled && isPrivilegesLoading) || (overviewEnabled && isOverviewLoading),
  };
};
