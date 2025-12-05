/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import type { AttackDiscovery, Replacements } from '@kbn/elastic-assistant-common';
import { API_VERSIONS } from '@kbn/elastic-assistant-common';
import { z } from '@kbn/zod';

/**
 * Document structure for anonymized alerts
 */
const Document = z.object({
  pageContent: z.string(),
  metadata: z.record(z.string(), z.any()),
});

type Document = z.infer<typeof Document>;

/**
 * Attack Discovery graph input overrides from dataset examples
 */
export const AttackDiscoveryExampleInput = z.object({
  attackDiscoveries: z.array(z.any()).nullable().optional(),
  attackDiscoveryPrompt: z.string().optional(),
  anonymizedAlerts: z.array(Document).optional(),
  anonymizedDocuments: z.array(Document).optional(),
  combinedGenerations: z.string().optional(),
  combinedRefinements: z.string().optional(),
  errors: z.array(z.string()).optional(),
  generationAttempts: z.number().optional(),
  generations: z.array(z.string()).optional(),
  hallucinationFailures: z.number().optional(),
  insights: z.array(z.any()).nullable().optional(),
  maxGenerationAttempts: z.number().optional(),
  maxHallucinationFailures: z.number().optional(),
  maxRepeatedGenerations: z.number().optional(),
  refinements: z.array(z.string()).optional(),
  refinePrompt: z.string().optional(),
  replacements: z.record(z.string(), z.string()).optional(),
  unrefinedResults: z.array(z.any()).nullable().optional(),
});

export type AttackDiscoveryExampleInput = z.infer<typeof AttackDiscoveryExampleInput>;

/**
 * Example input with optional overrides
 */
export const AttackDiscoveryExampleInputWithOverrides = z.intersection(
  AttackDiscoveryExampleInput,
  z.object({
    overrides: AttackDiscoveryExampleInput.optional(),
  })
);

export type AttackDiscoveryExampleInputWithOverrides = z.infer<
  typeof AttackDiscoveryExampleInputWithOverrides
>;

/**
 * Attack Discovery graph state (simplified for evaluation)
 */
export interface AttackDiscoveryGraphState {
  anonymizedDocuments: Document[];
  combinedGenerations: string;
  combinedRefinements: string;
  errors: string[];
  generationAttempts: number;
  generations: string[];
  hallucinationFailures: number;
  insights: AttackDiscovery[] | null;
  maxGenerationAttempts: number;
  maxHallucinationFailures: number;
  maxRepeatedGenerations: number;
  refinements: string[];
  replacements: Replacements;
  unrefinedResults: AttackDiscovery[] | null;
}

/**
 * Response from Attack Discovery API
 */
export interface AttackDiscoveryResponse {
  attackDiscoveries: AttackDiscovery[];
  connectorId: string;
  replacements: Replacements;
  status: string;
  alertsContextCount?: number;
}

/**
 * Parses input from a dataset example to get the graph input overrides
 */
export function getGraphInputOverrides(outputs: unknown): Partial<AttackDiscoveryGraphState> {
  const validatedInput = AttackDiscoveryExampleInputWithOverrides.safeParse(outputs).data ?? {};

  const { replacements, overrides } = validatedInput;

  // Fallback to and rename the root level legacy properties
  const anonymizedDocuments =
    validatedInput.anonymizedDocuments ?? validatedInput.anonymizedAlerts ?? [];
  const insights = validatedInput.insights ?? validatedInput.attackDiscoveries ?? null;

  return {
    anonymizedDocuments,
    insights,
    replacements: replacements ?? {},
    ...overrides,
  };
}

/**
 * Client for evaluating Attack Discovery graphs
 * This client invokes the Attack Discovery API endpoint for evaluation purposes
 */
export class AttackDiscoveryEvaluationClient {
  constructor(
    private readonly fetch: HttpHandler,
    private readonly log: ToolingLog,
    private readonly connectorId: string
  ) {}

  /**
   * Runs Attack Discovery with optional input overrides from the dataset
   */
  async runAttackDiscovery({
    alertsIndexPattern = '.alerts-security.alerts-default',
    input,
    size = 100,
  }: {
    alertsIndexPattern?: string;
    input?: AttackDiscoveryExampleInputWithOverrides;
    size?: number;
  }): Promise<AttackDiscoveryResponse> {
    this.log.info(
      `[attack-discovery-client] Running Attack Discovery with connector ${this.connectorId}`
    );

    // Parse overrides from input if provided
    const overrides = input ? getGraphInputOverrides(input) : {};

    try {
      // Call the Attack Discovery API
      const response = await this.fetch<AttackDiscoveryResponse>(
        '/internal/elastic_assistant/attack_discovery',
        {
          method: 'POST',
          version: API_VERSIONS.internal.v1,
          body: JSON.stringify({
            alertsIndexPattern,
            anonymizationFields: [
              { id: '@timestamp', field: '@timestamp', allowed: true, anonymized: false },
              {
                id: 'cloud.availability_zone',
                field: 'cloud.availability_zone',
                allowed: true,
                anonymized: false,
              },
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
              { id: 'destination.ip', field: 'destination.ip', allowed: true, anonymized: false },
              { id: 'source.ip', field: 'source.ip', allowed: true, anonymized: false },
              {
                id: 'kibana.alert.rule.name',
                field: 'kibana.alert.rule.name',
                allowed: true,
                anonymized: false,
              },
              {
                id: 'kibana.alert.severity',
                field: 'kibana.alert.severity',
                allowed: true,
                anonymized: false,
              },
            ],
            connectorId: this.connectorId,
            replacements: overrides.replacements ?? {},
            size,
            subAction: 'invokeAI',
            // Include any dataset overrides for seeding the graph state
            ...(overrides.anonymizedDocuments
              ? { anonymizedAlerts: overrides.anonymizedDocuments }
              : {}),
          }),
        }
      );

      this.log.info(
        `[attack-discovery-client] Attack Discovery completed. Found ${
          response.attackDiscoveries?.length ?? 0
        } discoveries`
      );

      return response;
    } catch (error) {
      this.log.error(`[attack-discovery-client] Error running Attack Discovery: ${error.message}`);
      throw error;
    }
  }

  /**
   * Evaluates Attack Discovery with dataset examples
   * Returns the graph state for evaluation comparison
   */
  async evaluate({
    input,
    alertsIndexPattern,
    size,
  }: {
    input: AttackDiscoveryExampleInputWithOverrides;
    alertsIndexPattern?: string;
    size?: number;
  }): Promise<{
    insights: AttackDiscovery[] | null;
    replacements: Replacements;
    errors: string[];
  }> {
    try {
      const result = await this.runAttackDiscovery({
        alertsIndexPattern,
        input,
        size,
      });

      return {
        insights: result.attackDiscoveries ?? null,
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
