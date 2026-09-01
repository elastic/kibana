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
import Fs from 'fs/promises';
import Path from 'path';
import { getCurrentTraceId } from '@kbn/evals';
import type { AttackDiscoveryClient } from '../clients/attack_discovery_client';
import type { AttackDiscoveryGenerateApiClient } from '../clients/attack_discovery_generate_api_client';
import type {
  AttackDiscoveryTaskInput,
  AttackDiscoveryTaskOutput,
  AnonymizedAlert,
} from '../types';
import { AttackDiscoveryGenerationPrompt } from '../prompts/attack_discovery_generation_prompt';

let defaultPromptPromise: Promise<string> | undefined;
let continuePromptPromise: Promise<string> | undefined;

const loadDefaultPrompt = (): Promise<string> => {
  if (!defaultPromptPromise) {
    defaultPromptPromise = Fs.readFile(
      Path.resolve(__dirname, '../prompts/attack_discovery_default_prompt.text'),
      'utf-8'
    );
  }

  return defaultPromptPromise;
};

const loadContinuePrompt = (): Promise<string> => {
  if (!continuePromptPromise) {
    continuePromptPromise = Fs.readFile(
      Path.resolve(__dirname, '../prompts/attack_discovery_continue_prompt.text'),
      'utf-8'
    );
  }

  return continuePromptPromise;
};

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
}): Promise<{ insights: AttackDiscovery[]; traceId?: string }> => {
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

  return {
    ...(toolCall.function.arguments as { insights: AttackDiscovery[] }),
    traceId: getCurrentTraceId() ?? undefined,
  };
};

export const runAttackDiscovery = async ({
  inferenceClient,
  attackDiscoveryClient,
  generateApiClient,
  input,
  log,
}: {
  inferenceClient: BoundInferenceClient;
  attackDiscoveryClient: AttackDiscoveryClient;
  generateApiClient?: AttackDiscoveryGenerateApiClient;
  input: AttackDiscoveryTaskInput;
  log: ToolingLog;
}): Promise<AttackDiscoveryTaskOutput> => {
  try {
    if (input.mode === 'generateApi') {
      if (!generateApiClient) {
        throw new Error(
          'generateApi mode requires an AttackDiscoveryGenerateApiClient — pass generateApiClient in the task config'
        );
      }

      const result = await generateApiClient.generate({
        connectorId: input.connectorId,
        actionTypeId: input.actionTypeId,
        modelId: input.modelId,
        alertsIndexPattern: input.alertsIndexPattern,
        size: input.size,
        start: input.start,
        end: input.end,
      });

      const traceId = getCurrentTraceId() ?? undefined;

      return {
        insights: result.discoveries.length > 0 ? result.discoveries : null,
        errors: result.error ? [result.error] : undefined,
        traceId,
        raw: {
          execution_uuid: result.executionUuid,
          status: result.status,
          alerts_context_count: result.alertsContextCount,
          latency_ms: result.latencyMs,
        },
      };
    }

    if (input.mode === 'bundledAlerts') {
      const prompt = await loadDefaultPrompt();
      const res = await generateInsights({
        inferenceClient,
        log,
        prompt,
        alerts: toAlertStrings(input.anonymizedAlerts),
      });
      return { insights: res.insights, traceId: res.traceId };
    }

    if (input.mode === 'searchAlerts') {
      const alerts = await attackDiscoveryClient.searchAlertsAsContext({
        alertsIndexPattern: input.alertsIndexPattern,
        start: input.start,
        end: input.end,
        size: input.size,
        filter: input.filter,
      });

      const prompt = await loadDefaultPrompt();
      const res = await generateInsights({
        inferenceClient,
        log,
        prompt,
        alerts: toAlertStrings(alerts),
      });

      return {
        insights: res.insights,
        raw: { fetchedAlerts: alerts.length },
        traceId: res.traceId,
      };
    }

    const prompt = input.prompt ?? (await loadDefaultPrompt());
    const continuePrompt = input.continuePrompt ?? (await loadContinuePrompt());
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

    return { insights: res.insights, traceId: res.traceId };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log.error(new Error(`runAttackDiscovery failed: ${message}`, { cause: e as Error }));
    return { insights: null, errors: [message] };
  }
};
