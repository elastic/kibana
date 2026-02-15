/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { DefendInsight } from '@kbn/elastic-assistant-common';
import { DefendInsightType } from '@kbn/elastic-assistant-common';
import { InvalidDefendInsightTypeError } from '@kbn/elastic-assistant-plugin/server/lib/defend_insights/errors';

import type { SecurityWorkflowInsight } from '../../../../../common/endpoint/types/workflow_insights';
import type { EndpointMetadataService } from '../../metadata';
import { buildIncompatibleAntivirusWorkflowInsights } from './incompatible_antivirus';
import { buildCustomWorkflowInsights } from './custom';

export interface BuildWorkflowInsightParams {
  defendInsights: DefendInsight[];
  endpointMetadataService: EndpointMetadataService;
  esClient: ElasticsearchClient;
  options: {
    insightType: DefendInsightType;
    endpointIds: string[];
    connectorId?: string;
    model?: string;
  };
}

export function buildWorkflowInsights(
  params: BuildWorkflowInsightParams
): Promise<SecurityWorkflowInsight[]> {
  switch (params.options.insightType) {
    case DefendInsightType.Enum.incompatible_antivirus:
      return buildIncompatibleAntivirusWorkflowInsights(params);
    case DefendInsightType.Enum.policy_response_failure:
      return buildCustomWorkflowInsights(params);
    case DefendInsightType.Enum.custom:
      return buildCustomWorkflowInsights(params);
    default:
      throw new InvalidDefendInsightTypeError();
  }
}
