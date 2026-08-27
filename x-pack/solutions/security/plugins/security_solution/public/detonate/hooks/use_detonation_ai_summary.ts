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
import { useQuery } from '@kbn/react-query';

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
 * A summary of one detonation never goes out of date, and every fetch is a paid model call, so the
 * result is held for the whole visit and only the Regenerate button asks for another one.
 */
const SUMMARY_CACHE_MS = 60 * 60 * 1000;

/**
 * Generates the AI summary for a detonation.
 *
 * The server route supplies anonymized context and the system prompt; the model call is made from
 * the browser through the inference plugin, matching the entity summary implementation.
 *
 * Generation starts on its own only when `autoStart` is set. Otherwise it waits for `generate`,
 * which is what keeps a page visit from spending a model call on a detonation with nothing to
 * summarise. `anonymizationFields` being undefined means the configuration is still loading and
 * holds the call back either way: running before it arrives would send the context unanonymized.
 */
export const useDetonationAiSummary = ({
  taskId,
  connectorId,
  anonymizationFields,
  autoStart,
}: {
  taskId: string;
  connectorId: string;
  anonymizationFields: AnonymizationFieldResponse[] | undefined;
  autoStart: boolean;
}) => {
  const { http, inference } = useKibana().services;
  const { addError } = useAppToasts();
  const [isRequested, setIsRequested] = useState(false);

  const isReady = Boolean(taskId) && Boolean(connectorId) && anonymizationFields !== undefined;
  const enabled = isReady && (autoStart || isRequested);

  const {
    data: summary,
    isFetching,
    error,
    refetch,
  } = useQuery<DetonationAiSummary, Error>(
    ['detonate', 'ai-summary', taskId, connectorId],
    async ({ signal }) => {
      const { context, prompt } = await http.post<DetonateAiSummaryResponse>(
        DETONATE_AI_SUMMARY_PATH,
        {
          version: API_VERSIONS.internal.v1,
          body: JSON.stringify({ taskId, connectorId, anonymizationFields }),
          signal,
        }
      );

      const { output } = await inference.output({
        id: 'detonation-summary',
        connectorId,
        schema: detonationSummarySchema,
        system: prompt,
        input: `Detonation context:\n${JSON.stringify(context)}`,
        abortSignal: signal,
      });

      const typedOutput = output as RawSummaryOutput;

      return {
        summary: typedOutput.summary,
        iocs: (typedOutput.iocs ?? []).slice(0, MAX_IOCS),
        recommendedActions: (typedOutput.recommended_actions ?? []).slice(0, MAX_ACTIONS),
      };
    },
    {
      enabled,
      staleTime: Infinity,
      cacheTime: SUMMARY_CACHE_MS,
      refetchOnWindowFocus: false,
      // A failed generation is expensive to repeat and rarely succeeds on a second try.
      retry: false,
      onError: (e) => {
        // Navigating away mid-generation aborts the call, which is not worth a toast.
        if (isInferenceRequestAbortedError(e)) {
          return;
        }
        addError(e, { title: AI_SUMMARY_ERROR });
      },
    }
  );

  // Enabling the query is what starts the first run, so a refetch is only right once it already is.
  // Going through `refetch` in both cases would rely on it firing while the query is disabled.
  const generate = useCallback(() => {
    if (enabled) {
      refetch();
      return;
    }
    setIsRequested(true);
  }, [enabled, refetch]);

  return { summary: summary ?? null, isGenerating: isFetching, error, generate };
};
