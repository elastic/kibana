/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient, Message } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import {
  extractJson,
  getAttackDiscoveriesGenerationSchema,
  getCombinedAttackDiscoveryPrompt,
  getFormatInstructionsFromZodV4Schema,
  getStructuredGenerationPrompt,
} from '@kbn/discoveries';
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

const MAX_GENERATION_ATTEMPTS = 3;

const attackDiscoveryGenerationSchema = getAttackDiscoveriesGenerationSchema({
  detailsMarkdown: 'The detailed explanation of the insight in Markdown.',
  entitySummaryMarkdown: 'A summary of the entities involved in the insight in Markdown.',
  mitreAttackTactics: 'The MITRE ATT&CK tactics relevant to the insight.',
  summaryMarkdown: 'A one-sentence summary of the insight in Markdown.',
  title: 'The title of the insight.',
  insights: 'The generated insights.',
});

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

export const generateInsights = async ({
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
  // Build the same request product Attack Discovery sends: the combined prompt
  // with JSON Schema format instructions, no tools and no tool_choice.
  const query = getCombinedAttackDiscoveryPrompt({
    anonymizedDocs: alerts,
    prompt,
    combinedMaybePartialResults: combinedMaybePartialResults ?? '',
    continuePrompt: continuePrompt ?? '',
  });
  const message = getStructuredGenerationPrompt({
    formatInstructions: getFormatInstructionsFromZodV4Schema(attackDiscoveryGenerationSchema),
    query,
  });
  const messages: Message[] = [{ role: MessageRole.User, content: message }];

  let lastParseError: unknown;
  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    const response = await inferenceClient.chatComplete({ messages });

    try {
      // In continuation mode the model returns only the missing suffix of
      // combinedMaybePartialResults, so concatenate before parsing (same as
      // the product generate node's getCombined call).
      const jsonText = extractJson(response.content);
      const combinedResponse =
        combinedMaybePartialResults != null && combinedMaybePartialResults.length > 0
          ? `${combinedMaybePartialResults}${jsonText}`
          : jsonText;
      const validated = attackDiscoveryGenerationSchema.parse(JSON.parse(combinedResponse));
      return {
        insights: validated.insights as AttackDiscovery[],
        traceId: getCurrentTraceId() ?? undefined,
      };
    } catch (error) {
      lastParseError = error;
      log.debug(
        `attack discovery generation attempt ${attempt} failed to parse the LLM response: ${error}`
      );
    }
  }

  throw new Error(
    `Failed to parse insights from the LLM response after ${MAX_GENERATION_ATTEMPTS} attempts: ${lastParseError}`
  );
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
