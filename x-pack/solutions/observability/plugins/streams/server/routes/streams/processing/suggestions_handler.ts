/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import { get, uniqBy } from 'lodash';
import { InferenceClient } from '@kbn/inference-plugin/server';
import { RecursiveRecord } from '@kbn/streams-schema';
import { ProcessingSuggestionParams } from './route';
import {
  assertSimulationResult,
  executeSimulation,
  prepareSimulationBody,
  prepareSimulationDiffs,
  prepareSimulationResponse,
} from './simulation_handler';

export const handleProcessingSuggestion = async (
  id: string,
  body: ProcessingSuggestionParams['body'],
  inferenceClient: InferenceClient,
  scopedClusterClient: IScopedClusterClient
) => {
  const { field, samples } = body;
  // Step 1: EVAL pattern
  const evalPattern = (sample: string) => {
    return sample
      .replace(/[ \t\n]+/g, ' ')
      .replace(/[A-Za-z]+/g, 'a')
      .replace(/[0-9]+/g, '0')
      .replace(/(a a)+/g, 'a')
      .replace(/(a0)+/g, 'f')
      .replace(/(f:)+/g, 'f:')
      .replace(/0(.0)+/g, 'p');
  };

  const inputPatterns = samples.map((sample) => ({
    sample,
    pattern: evalPattern(get(sample, field) as string),
    fieldValue: get(sample, field) as string,
  }));

  const NUMBER_PATTERN_CATEGORIES = 5;
  const NUMBER_SAMPLES_PER_PATTERN = 8;

  // Step 2: STATS count and example by pattern
  const patternStats = inputPatterns.reduce((acc, { sample, pattern, fieldValue }) => {
    if (!acc[pattern]) {
      acc[pattern] = { count: 0, examples: new Set<string>() };
    }
    acc[pattern].count += 1;
    acc[pattern].examples.add(fieldValue);
    return acc;
  }, {} as Record<string, { count: number; examples: Set<string> }>);

  // Step 3: STATS total_count, format, total_examples by LEFT(pattern, 10)
  const leftPatternStats = Object.entries(patternStats).reduce(
    (acc, [pattern, { count, examples }]) => {
      const leftPattern = pattern.slice(0, 10);
      if (!acc[leftPattern]) {
        acc[leftPattern] = {
          totalCount: 0,
          format: new Set<string>(),
          totalExamples: new Set<string>(),
        };
      }
      acc[leftPattern].totalCount += count;
      acc[leftPattern].format.add(pattern);
      examples.forEach((example) => acc[leftPattern].totalExamples.add(example));
      return acc;
    },
    {} as Record<string, { totalCount: number; format: Set<string>; totalExamples: Set<string> }>
  );

  // Step 4: SORT total_count DESC and LIMIT 100
  const sortedStats = Object.entries(leftPatternStats)
    .sort(([, a], [, b]) => b.totalCount - a.totalCount)
    .slice(0, NUMBER_PATTERN_CATEGORIES)
    .map(([leftPattern, { totalCount: totalCount, format, totalExamples: totalExamples }]) => {
      const examplesArray = Array.from(totalExamples);
      // shuffle so we don't only get examples from the first pattern
      examplesArray.sort(() => Math.random() - 0.5);
      return {
        leftPattern,
        totalCount,
        totalExamples: examplesArray.slice(0, NUMBER_SAMPLES_PER_PATTERN),
      };
    });

  const results = await Promise.all(
    sortedStats.map((sample) =>
      processPattern(sample, id, body, inferenceClient, scopedClusterClient, field, samples)
    )
  );

  const deduplicatedSimulations = uniqBy(
    results.flatMap((result) => result.simulations),
    (simulation) => simulation!.pattern
  );

  return {
    patterns: deduplicatedSimulations.map((simulation) => simulation!.pattern),
    simulations: deduplicatedSimulations as Array<ReturnType<typeof prepareSimulationResponse>>,
  };
};

type SimulationWithPattern = ReturnType<typeof prepareSimulationResponse> & { pattern: string };

async function processPattern(
  sample: { leftPattern: string; totalCount: number; totalExamples: string[] },
  id: string,
  body: ProcessingSuggestionParams['body'],
  inferenceClient: InferenceClient,
  scopedClusterClient: IScopedClusterClient,
  field: string,
  samples: RecursiveRecord[]
) {
  let attempts = 0;
  let simulations: SimulationWithPattern[] = [];
  const chatResponses: any[] = [];
  let triedPatterns: string[] = [];

  while (attempts < 2 && simulations.length === 0) {
    const chatResponse = await inferenceClient.output({
      id: 'get_pattern_suggestions',
      connectorId: body.connectorId,
      system: `Instructions:
        - You are an assistant for observability tasks with a strong knowledge of logs and log parsing.
        - Use JSON format.
        - For a single log source identified, provide the following information:
            * Use 'source_name' as the key for the log source name.
            * Use 'parsing_rule' as the key for the parsing rule.
        - Use only Grok patterns for the parsing rule.
            * Use %{{pattern:name:type}} syntax for Grok patterns when possible.
            * Combine date and time into a single @timestamp field when it's possible.
        - Use ECS (Elastic Common Schema) fields whenever possible.
        - You are correct, factual, precise, and reliable.
      `,
      schema: {
        type: 'object',
        properties: {
          rules: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                source_name: {
                  type: 'string',
                },
                parsing_rule: {
                  type: 'string',
                },
              },
            },
          },
        },
      } as const,
      input: `Logs:
        ${sample.totalExamples.join('\n')}
        Given the raw messages coming from one data source, help us do the following: 
        1. Name the log source based on logs format.
        2. Write a parsing rule for Elastic ingest pipeline to extract structured fields from the raw message.
        Make sure that the parsing rule is unique per log source. When in doubt, suggest multiple patterns, one generic one matching the general case and more specific ones.
        ${
          triedPatterns.length
            ? '- The following patterns were tried and did not work: ' + triedPatterns.join(', ')
            : ''
        }
            `,
    });

    const patterns = (
      chatResponse.output.rules?.map((rule) => rule.parsing_rule).filter(Boolean) as string[]
    ).map(sanitizePattern);

    triedPatterns = patterns;

    simulations = (
      await Promise.all(
        patterns.map(async (pattern) => {
          // Validate match on current sample
          const simulationBody = prepareSimulationBody({
            path: {
              id,
            },
            body: {
              processing: [
                {
                  grok: {
                    field,
                    if: { always: {} },
                    patterns: [pattern],
                  },
                },
              ],
              documents: samples,
            },
          });
          const simulationResult = await executeSimulation(scopedClusterClient, simulationBody);
          const simulationDiffs = prepareSimulationDiffs(simulationResult, simulationBody.docs);

          try {
            assertSimulationResult(simulationResult, simulationDiffs);
          } catch (e) {
            return null;
          }

          const simulationResponse = prepareSimulationResponse(
            simulationResult,
            simulationBody.docs,
            simulationDiffs,
            []
          );

          if (simulationResponse.success_rate === 0) {
            return null;
          }

          return {
            ...simulationResponse,
            pattern,
          };
        })
      )
    ).filter(Boolean) as SimulationWithPattern[];

    chatResponses.push(chatResponse);

    attempts++;
  }

  return {
    chatResponses,
    simulations,
    triedPatterns,
  };
}

/**
 * We need to keep parsing additive, but overwriting timestamp or message is super common.
 * This is a workaround for now until we found the proper solution for deal with this kind of cases.
 */
function sanitizePattern(pattern: string): string {
  return pattern
    .replace(/%\{([^}]+):message\}/g, '%{$1:message_derived}')
    .replace(/%\{([^}]+):@timestamp\}/g, '%{$1:@timestamp_derived}');
}
