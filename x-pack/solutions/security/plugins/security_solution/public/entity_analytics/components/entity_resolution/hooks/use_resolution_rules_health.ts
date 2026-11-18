/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { IHttpFetchError } from '@kbn/core/public';
import {
  API_VERSIONS as ENTITY_STORE_API_VERSIONS,
  ENTITY_STORE_ROUTES,
} from '@kbn/entity-store/common';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import {
  buildExecutionContext,
  EA_EXECUTION_CONTEXT_NAMES,
} from '../../../../common/utils/execution_context';

export const RESOLUTION_RULES_HEALTH_QUERY_KEY = 'resolution-rules-health';

export type ResolutionRuleHealthStatus = 'failing' | 'healthy' | 'not_run_yet' | 'off';

export interface ResolutionRuleHealth {
  rule_id: string;
  kind: string;
  description: string;
  enabled: boolean;
  status: ResolutionRuleHealthStatus;
  failure?: {
    last_error: string | null;
    consecutive_failures: number;
    next_attempt_at: string | null;
    last_failed_at: string | null;
  };
  last_run?: {
    links_created: number;
    skipped_ambiguous: number;
    skipped_oversized: number;
    skipped_noop: number;
  };
  last_processed_timestamp: string | null;
}

export interface ResolutionRulesHealth {
  failing: number;
  /** Failed rule runs in the past 24 hours, or null when the run stream cannot be read. */
  failed_runs_24h: number | null;
  dashboard_id: string;
  /** False when the monitoring dashboard is missing and could not be installed. */
  dashboard_installed: boolean;
  rules: ResolutionRuleHealth[];
}

/** PROTOTYPE: reads the internal rules health route (one row per resolution rule). */
export const useResolutionRulesHealth = () => {
  const { http } = useKibana().services;

  return useQuery<ResolutionRulesHealth, IHttpFetchError>({
    queryKey: [RESOLUTION_RULES_HEALTH_QUERY_KEY],
    queryFn: () =>
      http.fetch<ResolutionRulesHealth>(ENTITY_STORE_ROUTES.internal.RESOLUTION_RULES_HEALTH, {
        method: 'GET',
        query: { apiVersion: ENTITY_STORE_API_VERSIONS.internal.v2 },
        context: buildExecutionContext(
          EA_EXECUTION_CONTEXT_NAMES.ENTITY_RESOLUTION,
          'resolution_rules_health'
        ),
      }),
    refetchOnWindowFocus: false,
  });
};
