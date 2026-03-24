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
import { runIncrementalProgressive, runIncrementalDelta } from './incremental_runner';

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

  // Extract token usage from response.tokens (not response.usage!)
  const tokens = (response as any).tokens;
  const inputTokens = tokens?.prompt ?? tokens?.input ?? 0;
  const outputTokens = tokens?.completion ?? tokens?.output ?? 0;

  if (inputTokens > 0 || outputTokens > 0) {
    log.info(`✅ Tokens captured: prompt=${inputTokens}, completion=${outputTokens}, total=${inputTokens + outputTokens}`);
  } else {
    log.warning(`❌ No token data found (checked response.tokens and response.usage)`);
  }

  // Try tool call first, then fall back to parsing JSON from text response
  // (OSS models often return JSON in text instead of tool calls)
  const toolCall = response.toolCalls[0];
  if (toolCall) {
    return {
      insights: (toolCall.function.arguments as { insights: AttackDiscovery[] }).insights,
      usage: { inputTokens, outputTokens },
    };
  }

  // Fallback: parse JSON from text response (for OSS models that don't support tool calling)
  const textContent = (response as any).content ?? (response as any).output ?? '';
  if (textContent) {
    log.warning('No tool call found — attempting to parse insights from text response');
    const insights = parseInsightsFromText(textContent, log);
    if (insights.length > 0) {
      return { insights, usage: { inputTokens, outputTokens } };
    }
  }

  throw new Error('No tool call found in LLM response and could not parse JSON from text');
};

/**
 * Robust JSON extraction from LLM text responses.
 * Tries multiple strategies to find valid insight arrays, handling:
 * - JSON wrapped in markdown code blocks
 * - Partial JSON with missing closing braces
 * - Multiple JSON objects in response
 * - Insights nested under various keys
 */
function parseInsightsFromText(text: string, log: ToolingLog): AttackDiscovery[] {
  // Strip markdown code fences if present
  const stripped = text.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '');

  // Strategy 1: Find all JSON objects that look like insights and collect them
  const insightObjects: AttackDiscovery[] = [];
  const objectRegex = /\{[^{}]*"title"\s*:\s*"[^"]*"[^{}]*"alertIds"\s*:\s*\[[^\]]*\][^{}]*\}/g;
  let match;
  while ((match = objectRegex.exec(stripped)) !== null) {
    try {
      const parsed = JSON.parse(match[0]);
      if (parsed.title && parsed.alertIds) {
        insightObjects.push(normalizeInsight(parsed));
      }
    } catch {
      // skip malformed
    }
  }
  if (insightObjects.length > 0) {
    log.info(`Parsed ${insightObjects.length} insights via individual object extraction`);
    return insightObjects;
  }

  // Strategy 2: Find { "insights": [...] } wrapper
  const insightsKeyRegex = /"insights"\s*:\s*(\[[\s\S]*?\])\s*\}/;
  const insightsMatch = stripped.match(insightsKeyRegex);
  if (insightsMatch) {
    try {
      const arr = JSON.parse(insightsMatch[1]);
      if (Array.isArray(arr) && arr.length > 0) {
        log.info(`Parsed ${arr.length} insights via "insights" key extraction`);
        return arr.map(normalizeInsight);
      }
    } catch {
      // try fixing common JSON issues
      try {
        const fixed = insightsMatch[1].replace(/,\s*\]/, ']'); // trailing comma
        const arr = JSON.parse(fixed);
        if (Array.isArray(arr) && arr.length > 0) {
          log.info(`Parsed ${arr.length} insights via "insights" key (fixed trailing comma)`);
          return arr.map(normalizeInsight);
        }
      } catch {
        // continue to next strategy
      }
    }
  }

  // Strategy 3: Find any top-level JSON array
  const arrayRegex = /\[[\s\S]*\]/;
  const arrayMatch = stripped.match(arrayRegex);
  if (arrayMatch) {
    try {
      const arr = JSON.parse(arrayMatch[0]);
      if (Array.isArray(arr) && arr.length > 0 && arr[0].title) {
        log.info(`Parsed ${arr.length} insights via array extraction`);
        return arr.map(normalizeInsight);
      }
    } catch {
      // continue
    }
  }

  // Strategy 4: Try parsing the entire text as JSON
  try {
    const parsed = JSON.parse(stripped);
    if (parsed.insights && Array.isArray(parsed.insights)) {
      log.info(`Parsed ${parsed.insights.length} insights via full text JSON parse`);
      return parsed.insights.map(normalizeInsight);
    }
    if (Array.isArray(parsed) && parsed.length > 0) {
      log.info(`Parsed ${parsed.length} insights via full text array parse`);
      return parsed.map(normalizeInsight);
    }
  } catch {
    // not valid JSON
  }

  log.warning('Could not extract any insights from text response');
  return [];
}

/**
 * Normalize an insight object — handle variations in field names from OSS models
 */
function normalizeInsight(raw: Record<string, unknown>): AttackDiscovery {
  return {
    title: (raw.title as string) ?? 'Untitled Attack Discovery',
    alertIds: Array.isArray(raw.alertIds)
      ? (raw.alertIds as string[])
      : Array.isArray(raw.alert_ids)
        ? (raw.alert_ids as string[])
        : [],
    summaryMarkdown: (raw.summaryMarkdown as string) ??
      (raw.summary_markdown as string) ??
      (raw.summary as string) ?? '',
    detailsMarkdown: (raw.detailsMarkdown as string) ??
      (raw.details_markdown as string) ??
      (raw.details as string) ?? '',
    entitySummaryMarkdown: (raw.entitySummaryMarkdown as string) ??
      (raw.entity_summary_markdown as string),
    mitreAttackTactics: Array.isArray(raw.mitreAttackTactics)
      ? (raw.mitreAttackTactics as string[])
      : Array.isArray(raw.mitre_attack_tactics)
        ? (raw.mitre_attack_tactics as string[])
        : undefined,
  } as AttackDiscovery;
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
        // Calculate optimal batch configuration
        const numBatches = Math.ceil(alerts.length / BATCH_SIZE);
        const maxConcurrent = Number(process.env.ATTACK_DISCOVERY_MAX_CONCURRENT_BATCHES) ||
                              Math.min(numBatches, 20); // Dynamic: scale with batch count, cap at 20

        log.info(
          `Using batch processing: ${alerts.length} alerts, batch size ${BATCH_SIZE}, ${numBatches} batches, concurrency ${maxConcurrent}`
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
              log.debug(`Batch tokens: input=${res.usage.inputTokens}, output=${res.usage.outputTokens}`);
            } else {
              log.warning('No usage data in response - tokens will be 0');
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
          maxConcurrentBatches: maxConcurrent,
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

    if (input.mode === 'incrementalProgressive') {
      const prompt = await loadDefaultPrompt();

      const result = await runIncrementalProgressive({
        log,
        alerts: input.anonymizedAlerts,
        alertsPerRound: input.alertsPerRound,
        maxRounds: input.maxRounds,
        generateRoundInsights: async (roundAlerts, previousInsights) => {
          return generateInsights({
            inferenceClient,
            log,
            prompt,
            alerts: roundAlerts,
            combinedMaybePartialResults:
              previousInsights.length > 0
                ? JSON.stringify(previousInsights.map((ins) => ins.title))
                : undefined,
          });
        },
      });

      return result;
    }

    if (input.mode === 'incrementalDelta') {
      const prompt = await loadDefaultPrompt();

      const result = await runIncrementalDelta({
        log,
        allAlerts: input.anonymizedAlerts,
        previouslyProcessedCount: input.previouslyProcessedCount,
        alertsPerRound: input.alertsPerRound,
        maxRounds: input.maxRounds,
        generateRoundInsights: async (roundAlerts, previousInsights) => {
          return generateInsights({
            inferenceClient,
            log,
            prompt,
            alerts: roundAlerts,
            combinedMaybePartialResults:
              previousInsights.length > 0
                ? JSON.stringify(previousInsights.map((ins) => ins.title))
                : undefined,
          });
        },
      });

      return result;
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
