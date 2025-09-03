/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { tool } from '@langchain/core/tools';
import { requestHasRequiredAnonymizationParams } from '@kbn/elastic-assistant-plugin/server/lib/langchain/helpers';
import type { AssistantTool, AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import { contentReferenceString, securityAlertsPageReference } from '@kbn/elastic-assistant-common';
import type { Require } from '@kbn/elastic-assistant-plugin/server/types';
import { getAlertsCountQuery } from './get_alert_counts_query';
import { APP_UI_ID } from '../../../../common';

export type OnechatToolParams = Require<AssistantToolParams, 'alertsIndexPattern'>;

export const ONECHAT_TOOL_DESCRIPTION =
  'Call this for the counts of last 24 hours of open and acknowledged alerts in the environment, grouped by their severity and workflow status. The response will be JSON and from it you can summarize the information to answer the question.';

export const ONECHAT_TOOL: AssistantTool = {
  id: 'onechat-tool',
  name: 'OnechatTool',
  // note: this description is overwritten when `getTool` is called
  // local definitions exist ../elastic_assistant/server/lib/prompt/tool_prompts.ts
  // local definitions can be overwritten by security-ai-prompt integration definitions
  description: ONECHAT_TOOL_DESCRIPTION,
  sourceRegister: APP_UI_ID,
  isSupported: (params: AssistantToolParams): params is OnechatToolParams => {
    const { request, alertsIndexPattern } = params;
    return requestHasRequiredAnonymizationParams(request) && alertsIndexPattern != null;
  },
  async getTool(params: AssistantToolParams) {
    if (!this.isSupported(params)) return null;
    const { alertsIndexPattern, esClient, contentReferencesStore } = params as OnechatToolParams;
    return tool(
      async () => {
        console.log('onechat-tool', alertsIndexPattern);
        const query = getAlertsCountQuery(alertsIndexPattern);
        const result = await esClient.search<SearchResponse>(query);
        const alertsCountReference = contentReferencesStore.add((p) =>
          securityAlertsPageReference(p.id)
        );

        const reference = `\n${contentReferenceString(alertsCountReference)}`;

        return `${JSON.stringify(result)}${reference}`;
      },
      {
        name: 'OnechatTool',
        description: params.description || ONECHAT_TOOL_DESCRIPTION,
        tags: ['alerts', 'alerts-count'],
      }
    );
  },
};
