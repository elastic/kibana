/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import { get, groupBy, mapValues, orderBy, shuffle, uniq, uniqBy } from 'lodash';
import { InferenceClient } from '@kbn/inference-plugin/server';
import { SampleDocument } from '@kbn/streams-schema';
import {
  assertSimulationResult,
  executeSimulation,
  prepareSimulationBody,
  prepareSimulationDiffs,
  prepareSimulationResponse,
} from './simulation_handler';
import { ProcessingSuggestionBody } from './route';

export const handleProcessingSuggestion = async (
  name: string,
  body: ProcessingSuggestionBody,
  inferenceClient: InferenceClient,
  scopedClusterClient: IScopedClusterClient
) => {
  const { field, samples } = body;
  // Turn sample messages into patterns to group by
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

  const NUMBER_PATTERN_CATEGORIES = 5;
  const NUMBER_SAMPLES_PER_PATTERN = 8;

  const samplesWithPatterns = samples.map((sample) => {
    const pattern = evalPattern(get(sample, field) as string);
    return {
      document: sample,
      fullPattern: pattern,
      truncatedPattern: pattern.slice(0, 10),
      fieldValue: get(sample, field) as string,
    };
  });

  const patternsToProcess = orderBy(
    Object.values(
      mapValues(
        // group by truncated pattern
        groupBy(samplesWithPatterns, 'truncatedPattern'),
        (samplesForTruncatedPattern, truncatedPattern) => {
          // return truncated pattern, count, and unique example values, shuffled
          return {
            truncatedPattern,
            count: samplesForTruncatedPattern.length,
            exampleValues: shuffle(
              uniq(samplesForTruncatedPattern.map(({ fieldValue }) => fieldValue))
            ).slice(0, NUMBER_SAMPLES_PER_PATTERN),
          };
        }
      )
    ),
    'count',
    'desc'
  ).slice(0, NUMBER_PATTERN_CATEGORIES);

  const results = await Promise.all(
    patternsToProcess.map((sample) =>
      processPattern(sample, name, body, inferenceClient, scopedClusterClient, field, samples)
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
  sample: { truncatedPattern: string; count: number; exampleValues: string[] },
  name: string,
  body: ProcessingSuggestionBody,
  inferenceClient: InferenceClient,
  scopedClusterClient: IScopedClusterClient,
  field: string,
  samples: SampleDocument[]
) {
  const chatResponse = await inferenceClient.output({
    id: 'get_pattern_suggestions',
    connectorId: body.connectorId,
    // necessary due to a bug in the inference client - TODO remove when fixed
    functionCalling: 'native',
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
        ${sample.exampleValues.join('\n')}
        Given the raw messages coming from one data source, help us do the following: 
        1. Name the log source based on logs format.
        2. Write a parsing rule for Elastic ingest pipeline to extract structured fields from the raw message.
        Make sure that the parsing rule is unique per log source. When in doubt, suggest multiple patterns, one generic one matching the general case and more specific ones.
            `,
  });

  const patterns = (
    chatResponse.output.rules?.map((rule) => rule.parsing_rule).filter(Boolean) as string[]
  ).map(sanitizePattern);

  const simulations = (
    await Promise.all(
      patterns.map(async (pattern) => {
        // Validate match on current sample
        const simulationBody = prepareSimulationBody(name, {
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

        // TODO if success rate is zero, try to strip out the date part and try again

        return {
          ...simulationResponse,
          pattern,
        };
      })
    )
  ).filter(Boolean) as SimulationWithPattern[];

  return {
    chatResponse,
    simulations,
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
