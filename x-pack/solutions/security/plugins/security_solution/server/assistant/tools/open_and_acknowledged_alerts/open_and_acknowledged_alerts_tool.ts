/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { Replacements } from '@kbn/elastic-assistant-common';
import {
  securityAlertReference,
  getAnonymizedValue,
  getOpenAndAcknowledgedAlertsQuery,
  getRawDataOrDefault,
  sizeIsOutOfRange,
  transformRawData,
  contentReferenceBlock,
} from '@kbn/elastic-assistant-common';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { requestHasRequiredAnonymizationParams } from '@kbn/elastic-assistant-plugin/server/lib/langchain/helpers';
import { z } from '@kbn/zod';
import type { AssistantTool, AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import { APP_UI_ID } from '../../../../common';

export interface OpenAndAcknowledgedAlertsToolParams extends AssistantToolParams {
  alertsIndexPattern: string;
  size: number;
}

export const OPEN_AND_ACKNOWLEDGED_ALERTS_TOOL_DESCRIPTION =
  'Call this for knowledge about the latest n open and acknowledged alerts (sorted by `kibana.alert.risk_score`) in the environment, or when answering questions about open alerts. Do not call this tool for alert count or quantity. The output is an array of the latest n open and acknowledged alerts.';

/**
 * Returns a tool for querying open and acknowledged alerts, or null if the
 * request doesn't have all the required parameters.
 */
export const OPEN_AND_ACKNOWLEDGED_ALERTS_TOOL: AssistantTool = {
  id: 'open-and-acknowledged-alerts-tool',
  name: 'OpenAndAcknowledgedAlertsTool',
  // note: this description is overwritten when `getTool` is called
  // local definitions exist ../elastic_assistant/server/lib/prompt/tool_prompts.ts
  // local definitions can be overwritten by security-ai-prompt integration definitions
  description: OPEN_AND_ACKNOWLEDGED_ALERTS_TOOL_DESCRIPTION,
  sourceRegister: APP_UI_ID,
  isSupported: (params: AssistantToolParams): params is OpenAndAcknowledgedAlertsToolParams => {
    const { alertsIndexPattern, request, size } = params;
    return (
      requestHasRequiredAnonymizationParams(request) &&
      alertsIndexPattern != null &&
      size != null &&
      !sizeIsOutOfRange(size)
    );
  },
  getTool(params: AssistantToolParams) {
    if (!this.isSupported(params)) return null;

    const {
      alertsIndexPattern,
      anonymizationFields,
      esClient,
      onNewReplacements,
      replacements,
      size,
      contentReferencesStore,
    } = params as OpenAndAcknowledgedAlertsToolParams;
    return new DynamicStructuredTool({
      name: 'OpenAndAcknowledgedAlertsTool',
      description: params.description || OPEN_AND_ACKNOWLEDGED_ALERTS_TOOL_DESCRIPTION,
      schema: z.object({}),
      func: async () => {
        const query = getOpenAndAcknowledgedAlertsQuery({
          alertsIndexPattern,
          anonymizationFields: anonymizationFields ?? [],
          size,
        });

        const result = await esClient.search<SearchResponse>(query);

        // Accumulate replacements locally so we can, for example use the same
        // replacement for a hostname when we see it in multiple alerts:
        let localReplacements: Replacements = replacements ?? {};
        const localOnNewReplacements = (newReplacements: Replacements) => {
          localReplacements = { ...localReplacements, ...newReplacements };
          onNewReplacements?.(localReplacements); // invoke the callback with the latest replacements
          return Promise.resolve(localReplacements);
        };

        return JSON.stringify(
          result.hits?.hits?.map((x) => {
            const transformed = transformRawData({
              anonymizationFields,
              currentReplacements: localReplacements, // <-- the latest local replacements
              getAnonymizedValue,
              onNewReplacements: localOnNewReplacements, // <-- the local callback
              rawData: getRawDataOrDefault(x.fields),
            });
            const hitId = x._id;
            const citation =
              hitId &&
              contentReferencesStore &&
              `\nCitation,${contentReferenceBlock(
                contentReferencesStore.add((p) => securityAlertReference(p.id, hitId))
              )}`;

            return `${transformed}${citation ?? ''}`;
          })
        );
      },
      tags: ['alerts', 'open-and-acknowledged-alerts'],
    });
  },
};
