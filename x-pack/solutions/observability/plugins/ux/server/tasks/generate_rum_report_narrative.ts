/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { MessageRole } from '@kbn/inference-common';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import {
  defaultReportInstructions,
  reportToPromptContext,
  RUM_LLM_SYSTEM_PROMPT,
} from '../../common/rum_llm';
import type { RumReportResponse } from '../../common/rum_report';

const NARRATIVE_CHAR_CAP = 12_000;

export const generateRumReportNarrative = async ({
  inference,
  request,
  report,
  connectorId,
}: {
  inference: InferenceServerStart;
  request: KibanaRequest;
  report: RumReportResponse;
  connectorId?: string;
}): Promise<string> => {
  const connector = connectorId
    ? await inference.getConnectorById(connectorId, request)
    : await inference.getDefaultConnector(request);
  if (!connector) {
    throw new Error('No GenAI connector is configured');
  }
  const client = inference.getClient({ request });
  const response = await client.chatComplete({
    connectorId: connector.connectorId,
    system: RUM_LLM_SYSTEM_PROMPT,
    messages: [
      {
        role: MessageRole.User,
        content: [
          defaultReportInstructions(report.templateId),
          '',
          'Report data:',
          reportToPromptContext(report),
        ].join('\n'),
      },
    ],
  });
  const content = response.content?.trim() ?? '';
  if (!content) {
    throw new Error('The model returned no text');
  }
  return content.slice(0, NARRATIVE_CHAR_CAP);
};
