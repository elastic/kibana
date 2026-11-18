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

export const RESOLUTION_RULE_CHECK_QUERY_KEY = 'resolution-rule-check';

export type ResolutionRuleCheckStatus =
  | 'failing'
  | 'no_data'
  | 'declined'
  | 'would_link'
  | 'nothing_to_link'
  | 'not_applicable'
  | 'off';

export interface ResolutionRuleCheckResult {
  rule_id: string;
  status: ResolutionRuleCheckStatus;
  reason: string;
  details: string[];
  target_id?: string;
  would_link_ids?: string[];
  failure?: {
    last_error: string | null;
    consecutive_failures: number;
    next_attempt_at: string | null;
  };
}

export interface ResolutionRuleCheck {
  entity_id: string;
  entity_namespace: string;
  entity_type: string;
  resolved_to: string | null;
  summary: {
    needs_attention: number;
    would_link: number;
    applied: number;
    healthy: boolean;
  };
  rules: ResolutionRuleCheckResult[];
}

/** PROTOTYPE: reads the internal rule-check route for one entity. */
export const useResolutionRuleCheck = (entityId: string) => {
  const { http } = useKibana().services;

  return useQuery<ResolutionRuleCheck, IHttpFetchError>({
    queryKey: [RESOLUTION_RULE_CHECK_QUERY_KEY, entityId],
    queryFn: () =>
      http.fetch<ResolutionRuleCheck>(ENTITY_STORE_ROUTES.internal.RESOLUTION_ENTITY_CHECK, {
        method: 'GET',
        query: { apiVersion: ENTITY_STORE_API_VERSIONS.internal.v2, entity_id: entityId },
        context: buildExecutionContext(
          EA_EXECUTION_CONTEXT_NAMES.ENTITY_RESOLUTION,
          'resolution_rule_check'
        ),
      }),
    enabled: !!entityId,
    refetchOnWindowFocus: false,
  });
};
