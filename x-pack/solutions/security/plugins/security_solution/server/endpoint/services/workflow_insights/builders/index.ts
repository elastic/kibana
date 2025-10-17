/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import type { DefendInsight, DefendInsightsPostRequestBody } from '@kbn/elastic-assistant-common';
import { DefendInsightType } from '@kbn/elastic-assistant-common';
import { InvalidDefendInsightTypeError } from '@kbn/elastic-assistant-plugin/server/lib/defend_insights/errors';

import type { SecurityWorkflowInsight } from '../../../../../common/endpoint/types/workflow_insights';

import type { EndpointMetadataService } from '../../metadata';
import { buildIncompatibleAntivirusWorkflowInsights } from './incompatible_antivirus';
import { buildPolicyResponseFailureWorkflowInsights } from './policy_response_failure';

export interface BuildWorkflowInsightParams {
  defendInsights: DefendInsight[];
  request: KibanaRequest<unknown, unknown, DefendInsightsPostRequestBody>;
  endpointMetadataService: EndpointMetadataService;
  esClient: ElasticsearchClient;
}

export function buildWorkflowInsights(
  params: BuildWorkflowInsightParams
): Promise<SecurityWorkflowInsight[]> {
  switch (params.request.body.insightType) {
    case DefendInsightType.Enum.incompatible_antivirus:
      return buildIncompatibleAntivirusWorkflowInsights(params);
    case DefendInsightType.Enum.policy_response_failure:
      return buildPolicyResponseFailureWorkflowInsights(params);
    default:
      throw new InvalidDefendInsightTypeError();
  }
}
