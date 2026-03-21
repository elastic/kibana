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
import { batchProcess } from '@kbn/llm-batch-processing';
import type { AttackDiscoveryClient } from '../clients/attack_discovery_client';
import type {
  AttackDiscoveryTaskInput,
  AttackDiscoveryTaskOutput,
  AnonymizedAlert,
} from '../types';
import { AttackDiscoveryGenerationPrompt } from '../prompts/attack_discovery_generation_prompt';

const USE_BATCH_PROCESSING = process.env.ATTACK_DISCOVERY_USE_BATCH_PROCESSING === 'true';
const BATCH_SIZE = Number(process.env.ATTACK_DISCOVERY_BATCH_SIZE) || 100;

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
}): Promise<{ insights: AttackDiscovery[]; usage?: { inputTokens: number; outputTokens: number } }> => {
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

  // Extract token usage with graceful fallback (multiple formats)
  const usage = response.usage;
  const inputTokens =
    usage?.input_tokens ?? usage?.prompt_tokens ?? usage?.inputTokens ?? 0;
  const outputTokens =
    usage?.output_tokens ?? usage?.completion_tokens ?? usage?.outputTokens ?? 0;

  return {
    insights: (toolCall.function.arguments as { insights: AttackDiscovery[] }).insights,
    usage: { inputTokens, outputTokens },
  };
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
  const startTime = Date.now();
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    if (input.mode === 'bundledAlerts') {
      const prompt = await loadDefaultPrompt();
      const alerts = toAlertStrings(input.anonymizedAlerts);

      let insights: AttackDiscovery[];

      if (USE_BATCH_PROCESSING && alerts.length > BATCH_SIZE) {
        log.info(
          `Using batch processing: ${alerts.length} alerts, batch size ${BATCH_SIZE}`
        );

        // Use batch processing for large alert sets
        const batchResult = await batchProcess({
          input: alerts,
          splitStrategy: 'item-based',
          maxItemsPerBatch: BATCH_SIZE,
          processFn: async (alertBatch: string[]) => {
            const res = await generateInsights({
              inferenceClient,
              log,
              prompt,
              alerts: alertBatch,
            });

            if (res.usage) {
              inputTokens += res.usage.inputTokens;
              outputTokens += res.usage.outputTokens;
            }

            return res.insights;
          },
          mergeFn: async ([a, b]: [AttackDiscovery[], AttackDiscovery[]]) => {
            // Simple concatenation - Attack Discovery insights are independent observations
            // Semantic merge would require additional LLM calls (4x merge rounds = cost/latency)
            // For AD use case, preserving all discoveries is more important than narrative coherence
            log.info(`Merging ${a.length} and ${b.length} insights via concatenation`);
            return [...a, ...b];
          },
          maxConcurrentBatches: Number(process.env.ATTACK_DISCOVERY_MAX_CONCURRENT_BATCHES) || 10,
          onProgress: (completed: number, total: number) => {
            log.info(`Processed batch ${completed}/${total}`);
          },
        });

        insights = batchResult.output;
        log.info(
          `Batch processing complete: ${batchResult.stats.batches} batches, ${batchResult.stats.mergeRounds} merge rounds, ${batchResult.stats.durationMs}ms`
        );
      } else {
        // Standard single-pass processing
        const res = await generateInsights({
          inferenceClient,
          log,
          prompt,
          alerts,
        });

        if (res.usage) {
          inputTokens = res.usage.inputTokens;
          outputTokens = res.usage.outputTokens;
        }

        insights = res.insights;
      }

      const endTime = Date.now();
      return {
        insights,
        metadata: {
          latency: { startTime, endTime, durationMs: endTime - startTime },
          tokens: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens },
        },
      };
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

      if (res.usage) {
        inputTokens = res.usage.inputTokens;
        outputTokens = res.usage.outputTokens;
      }

      const endTime = Date.now();
      return {
        insights: res.insights,
        raw: { fetchedAlerts: alerts.length },
        metadata: {
          latency: { startTime, endTime, durationMs: endTime - startTime },
          tokens: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens },
        },
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

    if (res.usage) {
      inputTokens = res.usage.inputTokens;
      outputTokens = res.usage.outputTokens;
    }

    const endTime = Date.now();
    return {
      insights: res.insights,
      metadata: {
        latency: { startTime, endTime, durationMs: endTime - startTime },
        tokens: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens },
      },
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log.error(new Error(`runAttackDiscovery failed: ${message}`, { cause: e as Error }));

    const endTime = Date.now();
    return {
      insights: null,
      errors: [message],
      metadata: {
        latency: { startTime, endTime, durationMs: endTime - startTime },
        tokens: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens },
      },
    };
  }
};
