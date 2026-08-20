/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import type { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common';
import type { ToolSchema } from '@kbn/inference-common';
import { isInferenceRequestAbortedError } from '@kbn/inference-common';

import { API_VERSIONS } from '../../../common/constants';
import type { DetonationAiSummary } from '../../../common/detonate';
import { DETONATE_AI_SUMMARY_PATH } from '../../../common/detonate';
import type { DetonateAiSummaryResponse } from '../../../common/detonate/api';
import { useAppToasts } from '../../common/hooks/use_app_toasts';
import { useKibana } from '../../common/lib/kibana';
import { AI_SUMMARY_ERROR } from '../translations';

/** Caps mirror the server-side context caps, so the model cannot pad the panel indefinitely. */
const MAX_IOCS = 15;
const MAX_ACTIONS = 5;

const detonationSummarySchema = {
  type: 'object',
  properties: {
    summary: {
      type: 'string',
      description:
        'A single short paragraph describing what the sample did on the endpoint and why it was detected.',
    },
    iocs: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description: 'The indicator type, for example file hash, malware family or signature.',
          },
          value: { type: 'string', description: 'The indicator value.' },
        },
        required: ['type', 'value'],
      },
      description:
        'Indicators worth pivoting on. Only include values that appear in the context. Return an empty list when there are none.',
    },
    recommended_actions: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Concrete next steps for an analyst. Omit when the context does not support any.',
    },
  },
  required: ['summary'],
} as const satisfies ToolSchema;

interface RawSummaryOutput {
  summary: string;
  iocs?: Array<{ type: string; value: string }>;
  recommended_actions?: string[];
}

/**
 * Generates the AI summary for a detonation.
 *
 * The server route supplies anonymized context and the system prompt; the model call is made from
 * the browser through the inference plugin, matching the entity summary implementation.
 */
export const useDetonationAiSummary = ({
  taskId,
  connectorId,
  anonymizationFields,
}: {
  taskId: string;
  connectorId: string;
  anonymizationFields: AnonymizationFieldResponse[];
}) => {
  const { http, inference } = useKibana().services;
  const { addError } = useAppToasts();
  const [summary, setSummary] = useState<DetonationAiSummary | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generate = useCallback(async () => {
    setError(null);
    setIsGenerating(true);
    const controller = new AbortController();

    try {
      const { context, prompt } = await http.post<DetonateAiSummaryResponse>(
        DETONATE_AI_SUMMARY_PATH,
        {
          version: API_VERSIONS.internal.v1,
          body: JSON.stringify({ taskId, connectorId, anonymizationFields }),
          signal: controller.signal,
        }
      );

      const { output } = await inference.output({
        id: 'detonation-summary',
        connectorId,
        schema: detonationSummarySchema,
        system: prompt,
        input: `Detonation context:\n${JSON.stringify(context)}`,
        abortSignal: controller.signal,
      });

      const typedOutput = output as RawSummaryOutput;

      setSummary({
        summary: typedOutput.summary,
        iocs: (typedOutput.iocs ?? []).slice(0, MAX_IOCS),
        recommendedActions: (typedOutput.recommended_actions ?? []).slice(0, MAX_ACTIONS),
      });
    } catch (e) {
      if (isInferenceRequestAbortedError(e)) {
        return;
      }
      const caughtError = e instanceof Error ? e : new Error(String(e));
      addError(caughtError, { title: AI_SUMMARY_ERROR });
      setError(caughtError);
    } finally {
      setIsGenerating(false);
    }
  }, [http, inference, taskId, connectorId, anonymizationFields, addError]);

  return { summary, isGenerating, error, generate };
};
