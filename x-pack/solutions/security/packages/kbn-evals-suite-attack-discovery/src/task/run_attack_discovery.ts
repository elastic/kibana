/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { executeUntilValid } from '@kbn/inference-prompt-utils';
import type { ToolChoice, BoundInferenceClient } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import attackDiscoveryDefaultPrompt from '../prompts/attack_discovery_default_prompt.text';
import attackDiscoveryContinuePrompt from '../prompts/attack_discovery_continue_prompt.text';
import type { AttackDiscoveryClient } from '../clients/attack_discovery_client';
import type {
  AttackDiscoveryTaskInput,
  AttackDiscoveryTaskOutput,
  AnonymizedAlert,
} from '../types';
import { AttackDiscoveryGenerationPrompt } from '../prompts/attack_discovery_generation_prompt';

const toAlertStrings = (alerts: ReadonlyArray<AnonymizedAlert>): string[] => {
  return alerts.map((a) => a.pageContent);
};

const generateInsights = async ({
  inferenceClient,
  log,
  prompt,
  alerts,
  combinedMaybePartialResults,
  continuePrompt,
}: {
  inferenceClient: BoundInferenceClient;
  log: ToolingLog;
  prompt: string;
  alerts: string[];
  combinedMaybePartialResults?: string;
  continuePrompt?: string;
}): Promise<{ insights: AttackDiscovery[] }> => {
  const response = await executeUntilValid({
    prompt: AttackDiscoveryGenerationPrompt,
    inferenceClient,
    input: {
      prompt,
      alerts,
      combinedMaybePartialResults,
      continuePrompt,
    },
    finalToolChoice: {
      function: 'generate',
    } as ToolChoice<'generate'>,
    maxRetries: 3,
    toolCallbacks: {
      generate: async (toolCall) => ({
        response: toolCall.function.arguments,
      }),
    },
  });

  const toolCall = response.toolCalls[0];
  if (!toolCall) {
    throw new Error('No tool call found in LLM response');
  }

  return toolCall.function.arguments as { insights: AttackDiscovery[] };
};

export const runAttackDiscovery = async ({
  inferenceClient,
  attackDiscoveryClient,
  input,
  log,
}: {
  inferenceClient: BoundInferenceClient;
  attackDiscoveryClient: AttackDiscoveryClient;
  input: AttackDiscoveryTaskInput;
  log: ToolingLog;
}): Promise<AttackDiscoveryTaskOutput> => {
  try {
    if (input.mode === 'bundledAlerts') {
      const res = await generateInsights({
        inferenceClient,
        log,
        prompt: attackDiscoveryDefaultPrompt,
        alerts: toAlertStrings(input.anonymizedAlerts),
      });
      return { insights: res.insights };
    }

    if (input.mode === 'searchAlerts') {
      const alerts = await attackDiscoveryClient.searchAlertsAsContext({
        alertsIndexPattern: input.alertsIndexPattern,
        start: input.start,
        end: input.end,
        size: input.size,
        filter: input.filter,
      });

      const res = await generateInsights({
        inferenceClient,
        log,
        prompt: attackDiscoveryDefaultPrompt,
        alerts: toAlertStrings(alerts),
      });

      return { insights: res.insights, raw: { fetchedAlerts: alerts.length } };
    }

    const prompt = input.prompt ?? attackDiscoveryDefaultPrompt;
    const continuePrompt = input.continuePrompt ?? attackDiscoveryContinuePrompt;
    const combinedMaybePartialResults = input.combinedMaybePartialResults ?? '';
    const alerts = toAlertStrings(input.anonymizedAlerts ?? []);

    const res = await generateInsights({
      inferenceClient,
      log,
      prompt,
      alerts,
      combinedMaybePartialResults:
        combinedMaybePartialResults.length > 0 ? combinedMaybePartialResults : undefined,
      continuePrompt: combinedMaybePartialResults.length > 0 ? continuePrompt : undefined,
    });

    return { insights: res.insights };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log.error(new Error(`runAttackDiscovery failed: ${message}`, { cause: e as Error }));
    return { insights: null, errors: [message] };
  }
};
