/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from '@kbn/zod';
import { requestHasRequiredAnonymizationParams } from '@kbn/elastic-assistant-plugin/server/lib/langchain/helpers';
import type { AssistantTool, AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import { contentReferenceString, securityAlertsPageReference } from '@kbn/elastic-assistant-common';
import { getAlertsCountQuery } from './get_alert_counts_query';
import { APP_UI_ID } from '../../../../common';

export interface AlertCountsToolParams extends AssistantToolParams {
  alertsIndexPattern: string;
}
export const ALERT_COUNTS_TOOL_DESCRIPTION =
  'Call this for the counts of last 24 hours of open and acknowledged alerts in the environment, grouped by their severity and workflow status. The response will be JSON and from it you can summarize the information to answer the question.';

export const ALERT_COUNTS_TOOL: AssistantTool = {
  id: 'alert-counts-tool',
  name: 'AlertCountsTool',
  // note: this description is overwritten when `getTool` is called
  // local definitions exist ../elastic_assistant/server/lib/prompt/tool_prompts.ts
  // local definitions can be overwritten by security-ai-prompt integration definitions
  description: ALERT_COUNTS_TOOL_DESCRIPTION,
  sourceRegister: APP_UI_ID,
  isSupported: (params: AssistantToolParams): params is AlertCountsToolParams => {
    const { request, alertsIndexPattern } = params;
    return requestHasRequiredAnonymizationParams(request) && alertsIndexPattern != null;
  },
  getTool(params: AssistantToolParams) {
    if (!this.isSupported(params)) return null;
    const { alertsIndexPattern, esClient, contentReferencesStore } =
      params as AlertCountsToolParams;
    return new DynamicStructuredTool({
      name: 'AlertCountsTool',
      description: params.description || ALERT_COUNTS_TOOL_DESCRIPTION,
      schema: z.object({}),
      func: async () => {
        const query = getAlertsCountQuery(alertsIndexPattern);
        const result = await esClient.search<SearchResponse>(query);
        const alertsCountReference =
          contentReferencesStore &&
          contentReferencesStore.add((p) => securityAlertsPageReference(p.id));

        const reference = alertsCountReference
          ? `\n${contentReferenceString(alertsCountReference)}`
          : '';

        return `${JSON.stringify(result)}${reference}`;
      },
      tags: ['alerts', 'alerts-count'],
    });
  },
};
