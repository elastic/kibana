/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import type {
  DefendInsights,
  DefendInsightsResponse,
  DefendInsightType,
  Replacements,
} from '@kbn/elastic-assistant-common';
import { API_VERSIONS, DEFEND_INSIGHTS } from '@kbn/elastic-assistant-common';
import { z } from '@kbn/zod';

/**
 * Document structure for anonymized events
 */
const Document = z.object({
  pageContent: z.string(),
  metadata: z.record(z.string(), z.any()),
});

type Document = z.infer<typeof Document>;

/**
 * Defend Insights graph input overrides from dataset examples
 */
export const DefendInsightsExampleInput = z.object({
  anonymizedEvents: z.array(Document).optional(),
  combinedGenerations: z.string().optional(),
  combinedRefinements: z.string().optional(),
  endpointIds: z.array(z.string()).optional(),
  errors: z.array(z.string()).optional(),
  generationAttempts: z.number().optional(),
  generations: z.array(z.string()).optional(),
  hallucinationFailures: z.number().optional(),
  insights: z.array(z.any()).nullable().optional(),
  insightType: z
    .enum(['incompatible_antivirus', 'noisy_process_tree', 'policy_response_failure'])
    .optional(),
  maxGenerationAttempts: z.number().optional(),
  maxHallucinationFailures: z.number().optional(),
  maxRepeatedGenerations: z.number().optional(),
  refinements: z.array(z.string()).optional(),
  refinePrompt: z.string().optional(),
  replacements: z.record(z.string(), z.string()).optional(),
  unrefinedResults: z.array(z.any()).nullable().optional(),
});

export type DefendInsightsExampleInput = z.infer<typeof DefendInsightsExampleInput>;

/**
 * Example input with optional overrides
 */
export const DefendInsightsExampleInputWithOverrides = z.intersection(
  DefendInsightsExampleInput,
  z.object({
    overrides: DefendInsightsExampleInput.optional(),
  })
);

export type DefendInsightsExampleInputWithOverrides = z.infer<
  typeof DefendInsightsExampleInputWithOverrides
>;

/**
 * Defend Insights graph state (simplified for evaluation)
 */
export interface DefendInsightsGraphState {
  anonymizedEvents: Document[];
  combinedGenerations: string;
  combinedRefinements: string;
  errors: string[];
  generationAttempts: number;
  generations: string[];
  hallucinationFailures: number;
  insights: DefendInsights | null;
  maxGenerationAttempts: number;
  maxHallucinationFailures: number;
  maxRepeatedGenerations: number;
  refinements: string[];
  replacements: Replacements;
  unrefinedResults: DefendInsights | null;
}

/**
 * Parses input from a dataset example to get the graph input overrides
 */
export function getDefendInsightsGraphInputOverrides(
  outputs: unknown
): Partial<DefendInsightsGraphState> {
  const validatedInput = DefendInsightsExampleInputWithOverrides.safeParse(outputs).data ?? {};

  const { replacements, overrides, anonymizedEvents, insights } = validatedInput;

  return {
    anonymizedEvents: anonymizedEvents ?? [],
    insights: insights ?? null,
    replacements: replacements ?? {},
    ...overrides,
  };
}

/**
 * Client for evaluating Defend Insights graphs
 * This client invokes the Defend Insights API endpoint for evaluation purposes
 */
export class DefendInsightsEvaluationClient {
  constructor(
    private readonly fetch: HttpHandler,
    private readonly log: ToolingLog,
    private readonly connectorId: string
  ) {}

  /**
   * Runs Defend Insights with optional input overrides from the dataset
   */
  async runDefendInsights({
    endpointIds,
    insightType = 'policy_response_failure',
    input,
  }: {
    endpointIds: string[];
    insightType?: DefendInsightType;
    input?: DefendInsightsExampleInputWithOverrides;
  }): Promise<DefendInsightsResponse> {
    this.log.info(
      `[defend-insights-client] Running Defend Insights with connector ${this.connectorId}`
    );

    // Parse overrides from input if provided
    const overrides = input ? getDefendInsightsGraphInputOverrides(input) : {};

    try {
      // Call the Defend Insights API
      const response = await this.fetch<DefendInsightsResponse>(DEFEND_INSIGHTS, {
        method: 'POST',
        version: API_VERSIONS.internal.v1,
        body: JSON.stringify({
          endpointIds,
          insightType,
          anonymizationFields: [
            { id: '@timestamp', field: '@timestamp', allowed: true, anonymized: false },
            { id: 'host.name', field: 'host.name', allowed: true, anonymized: true },
            { id: 'user.name', field: 'user.name', allowed: true, anonymized: true },
            { id: 'process.name', field: 'process.name', allowed: true, anonymized: false },
            {
              id: 'process.command_line',
              field: 'process.command_line',
              allowed: true,
              anonymized: false,
            },
            { id: 'file.path', field: 'file.path', allowed: true, anonymized: false },
            { id: 'endpoint.id', field: 'endpoint.id', allowed: true, anonymized: false },
          ],
          apiConfig: {
            connectorId: this.connectorId,
            actionTypeId: '.gen-ai',
          },
          replacements: overrides.replacements ?? {},
          subAction: 'invokeAI',
        }),
      });

      this.log.info(
        `[defend-insights-client] Defend Insights completed. Status: ${response.status}`
      );

      return response;
    } catch (error) {
      this.log.error(`[defend-insights-client] Error running Defend Insights: ${error.message}`);
      throw error;
    }
  }

  /**
   * Evaluates Defend Insights with dataset examples
   * Returns the graph state for evaluation comparison
   */
  async evaluate({
    endpointIds,
    insightType,
    input,
  }: {
    endpointIds: string[];
    insightType?: DefendInsightType;
    input: DefendInsightsExampleInputWithOverrides;
  }): Promise<{
    insights: DefendInsights | null;
    replacements: Replacements;
    errors: string[];
  }> {
    try {
      const result = await this.runDefendInsights({
        endpointIds,
        insightType,
        input,
      });

      return {
        insights: result.insights ?? null,
        replacements: result.replacements ?? {},
        errors: [],
      };
    } catch (error) {
      return {
        insights: null,
        replacements: {},
        errors: [error.message],
      };
    }
  }
}
