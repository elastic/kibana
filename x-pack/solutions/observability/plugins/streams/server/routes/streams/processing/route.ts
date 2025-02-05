/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import { IScopedClusterClient } from '@kbn/core/server';
import { calculateObjectDiff, flattenObject } from '@kbn/object-utils';
import {
  FieldDefinitionConfig,
  namedFieldDefinitionConfigSchema,
  processorDefinitionSchema,
} from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import { get, isEmpty, uniqBy } from 'lodash';
import { formatToIngestProcessors } from '../../../lib/streams/helpers/processing';
import { checkAccess } from '../../../lib/streams/stream_crud';
import { createServerRoute } from '../../create_server_route';
import { DefinitionNotFoundError } from '../../../lib/streams/errors/definition_not_found_error';
import { SimulationFailedError } from '../../../lib/streams/errors/simulation_failed_error';
import { DetectedMappingFailureError } from '../../../lib/streams/errors/detected_mapping_failure_error';
import { NonAdditiveProcessorError } from '../../../lib/streams/errors/non_additive_processor_error';

const paramsSchema = z.object({
  path: z.object({ id: z.string() }),
  body: z.object({
    processing: z.array(processorDefinitionSchema),
    documents: z.array(z.record(z.unknown())),
    detected_fields: z.array(namedFieldDefinitionConfigSchema).optional(),
  }),
});

type ProcessingSimulateParams = z.infer<typeof paramsSchema>;

export const simulateProcessorRoute = createServerRoute({
  endpoint: 'POST /api/streams/{id}/processing/_simulate',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      enabled: false,
      reason:
        'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
    },
  },
  params: paramsSchema,
  handler: async ({ params, request, getScopedClients }) => {
    const { scopedClusterClient } = await getScopedClients({ request });

    const { read } = await checkAccess({ id: params.path.id, scopedClusterClient });
    if (!read) {
      throw new DefinitionNotFoundError(`Stream definition for ${params.path.id} not found.`);
    }

    const simulationBody = prepareSimulationBody(params);

    const simulationResult = await executeSimulation(scopedClusterClient, simulationBody);

    const simulationDiffs = prepareSimulationDiffs(simulationResult, simulationBody.docs);

    assertSimulationResult(simulationResult, simulationDiffs);

    return prepareSimulationResponse(
      simulationResult,
      simulationBody.docs,
      simulationDiffs,
      params.body.detected_fields
    );
  },
});

const prepareSimulationBody = (params: ProcessingSimulateParams) => {
  const { path, body } = params;
  const { processing, documents, detected_fields } = body;

  const processors = formatToIngestProcessors(processing);
  const docs = documents.map((doc, id) => ({
    _index: path.id,
    _id: id.toString(),
    _source: doc,
  }));

  const simulationBody: any = {
    docs,
    pipeline_substitutions: {
      [`${path.id}@stream.processing`]: {
        processors,
      },
    },
  };

  if (detected_fields) {
    const properties = computeMappingProperties(detected_fields);
    simulationBody.component_template_substitutions = {
      [`${path.id}@stream.layer`]: {
        template: {
          mappings: {
            properties,
          },
        },
      },
    };
  }

  return simulationBody;
};

// TODO: update type once Kibana updates to elasticsearch-js 8.17
const executeSimulation = async (
  scopedClusterClient: IScopedClusterClient,
  simulationBody: ReturnType<typeof prepareSimulationBody>
): Promise<any> => {
  try {
    // TODO: We should be using scopedClusterClient.asCurrentUser.simulate.ingest() once Kibana updates to elasticsearch-js 8.17
    return await scopedClusterClient.asCurrentUser.transport.request({
      method: 'POST',
      path: `_ingest/_simulate`,
      body: simulationBody,
    });
  } catch (error) {
    throw new SimulationFailedError(error);
  }
};

const assertSimulationResult = (
  simulationResult: Awaited<ReturnType<typeof executeSimulation>>,
  simulationDiffs: ReturnType<typeof prepareSimulationDiffs>
) => {
  // Assert mappings are compatible with the documents
  const entryWithError = simulationResult.docs.find(isMappingFailure);
  if (entryWithError) {
    throw new DetectedMappingFailureError(
      `The detected field types might not be compatible with these documents. ${entryWithError.doc.error.reason}`
    );
  }
  // Assert that the processors are purely additive to the documents
  const updatedFields = computeUpdatedFields(simulationDiffs);
  if (!isEmpty(updatedFields)) {
    throw new NonAdditiveProcessorError(
      `The processor is not additive to the documents. It might update fields [${updatedFields.join()}]`
    );
  }
};

const prepareSimulationResponse = (
  simulationResult: any,
  docs: Array<{ _source: Record<string, unknown> }>,
  simulationDiffs: ReturnType<typeof prepareSimulationDiffs>,
  detectedFields?: ProcessingSimulateParams['body']['detected_fields']
) => {
  const confirmedValidDetectedFields = computeMappingProperties(detectedFields ?? []);
  const documents = computeSimulationDocuments(simulationResult, docs);
  const detectedFieldsResult = computeDetectedFields(simulationDiffs, confirmedValidDetectedFields);
  const successRate = computeSuccessRate(simulationResult);
  const failureRate = 1 - successRate;

  return {
    documents,
    success_rate: parseFloat(successRate.toFixed(2)),
    failure_rate: parseFloat(failureRate.toFixed(2)),
    detected_fields: detectedFieldsResult,
  };
};

// TODO: update type once Kibana updates to elasticsearch-js 8.17
const prepareSimulationDiffs = (
  simulation: any,
  sampleDocs: Array<{ _source: Record<string, unknown> }>
) => {
  // Since we filter out failed documents, we need to map the simulation docs to the sample docs for later retrieval
  const samplesToSimulationMap = new Map<any, { _source: Record<string, unknown> }>(
    simulation.docs.map((entry: any, id: number) => [entry.doc, sampleDocs[id]])
  );

  const diffs = simulation.docs.filter(isSuccessfulDocument).map((entry: any) => {
    const sample = samplesToSimulationMap.get(entry.doc);
    if (sample) {
      return calculateObjectDiff(sample._source, entry.doc._source);
    }

    return calculateObjectDiff({});
  });

  return diffs;
};

// TODO: update type once Kibana updates to elasticsearch-js 8.17
const computeUpdatedFields = (simulationDiff: ReturnType<typeof prepareSimulationDiffs>) => {
  const diffs = simulationDiff
    .map((simulatedDoc: any) => flattenObject(simulatedDoc.updated))
    .flatMap(Object.keys);

  const uniqueFields = [...new Set(diffs)];

  return uniqueFields;
};

// TODO: update type once Kibana updates to elasticsearch-js 8.17
const computeSimulationDocuments = (
  simulation: any,
  sampleDocs: Array<{ _source: Record<string, unknown> }>
): Array<{ isMatch: boolean; value: Record<string, unknown> }> => {
  return simulation.docs.map((entry: any, id: number) => {
    // If every processor was successful, return and flatten the simulation doc from the last processor
    if (isSuccessfulDocument(entry)) {
      return {
        value: flattenObject(entry.doc._source ?? sampleDocs[id]._source),
        isMatch: true,
      };
    }

    return {
      value: flattenObject(sampleDocs[id]._source),
      isMatch: false,
    };
  });
};

const computeDetectedFields = (
  simulationDiff: ReturnType<typeof prepareSimulationDiffs>,
  confirmedValidDetectedFields: Record<string, { type: FieldDefinitionConfig['type'] | 'unmapped' }>
): Array<{
  name: string;
  type: FieldDefinitionConfig['type'] | 'unmapped';
}> => {
  const diffs: string[] = simulationDiff
    .map((simulatedDoc: any) => flattenObject(simulatedDoc.added))
    .flatMap(Object.keys);

  const uniqueFields = [...new Set(diffs)];

  return uniqueFields.map((name: string) => ({
    name,
    type: confirmedValidDetectedFields[name]?.type || 'unmapped',
  }));
};

// TODO: update type once Kibana updates to elasticsearch-js 8.17
const computeSuccessRate = (simulation: any) => {
  const successfulCount = simulation.docs.reduce((rate: number, entry: any) => {
    return (rate += isSuccessfulDocument(entry) ? 1 : 0);
  }, 0);

  return successfulCount / simulation.docs.length;
};

const computeMappingProperties = (
  detectedFields: NonNullable<ProcessingSimulateParams['body']['detected_fields']>
) => {
  return Object.fromEntries(detectedFields.map(({ name, type }) => [name, { type }]));
};

// TODO: update type once Kibana updates to elasticsearch-js 8.17
const isSuccessfulDocument = (entry: any) => entry.doc.error === undefined;
// TODO: update type once Kibana updates to elasticsearch-js 8.17
const isMappingFailure = (entry: any) =>
  !isSuccessfulDocument(entry) && entry.doc.error.type === 'document_parsing_exception';

const suggestionsParamsSchema = z.object({
  path: z.object({ id: z.string() }),
  body: z.object({
    field: z.string(),
    samples: z.array(z.record(z.unknown())),
  }),
});

export const processingSuggestionRoute = createServerRoute({
  endpoint: 'POST /api/streams/{id}/processing/_suggestions',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      enabled: false,
      reason:
        'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
    },
  },
  params: suggestionsParamsSchema,
  handler: async ({ params, request, logger, getScopedClients }) => {
    const { inferenceClient, scopedClusterClient } = await getScopedClients({ request });

    const {
      path: { id },
      body,
    } = params;

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
            total_count: 0,
            format: new Set<string>(),
            total_examples: new Set<string>(),
          };
        }
        acc[leftPattern].total_count += count;
        acc[leftPattern].format.add(pattern);
        examples.forEach((example) => acc[leftPattern].total_examples.add(example));
        return acc;
      },
      {} as Record<
        string,
        { total_count: number; format: Set<string>; total_examples: Set<string> }
      >
    );

    // Step 4: SORT total_count DESC and LIMIT 100
    const sortedStats = Object.entries(leftPatternStats)
      .sort(([, a], [, b]) => b.total_count - a.total_count)
      .slice(0, NUMBER_PATTERN_CATEGORIES)
      .map(([leftPattern, { total_count, format, total_examples }]) => ({
        leftPattern,
        total_count,
        total_examples: Array.from(total_examples).slice(0, NUMBER_SAMPLES_PER_PATTERN),
      }));

    const chatResponses = await Promise.all(
      sortedStats.map((sample) =>
        inferenceClient.output({
          id: 'get_pattern_suggestions',
          connectorId: 'azure-gpt4',
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
        ${sample.total_examples.join('\n')}
        Given the raw messages coming from one data source, help us do the following: 
        1. Name the log source based on logs format.
        2. Write a parsing rule for Elastic ingest pipeline to extract structured fields from the raw message.
        Make sure that the parsing rule is unique per log source.
            `,
        })
      )
    );

    const patterns = chatResponses.flatMap((chatResponse) => {
      return (
        chatResponse.output.rules?.map((rule) => rule.parsing_rule).filter(Boolean) as string[]
      ).map(sanitizePattern);
    });

    const simulations = (
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
    ).filter(Boolean);

    const deduplicatedSimulations = uniqBy(simulations, (simulation) => simulation!.pattern);

    return {
      patterns: deduplicatedSimulations.map((simulation) => simulation!.pattern),
      chatResponses,
      simuations: deduplicatedSimulations as Array<ReturnType<typeof prepareSimulationResponse>>,
    };
  },
});

function sanitizePattern(pattern: string): string {
  return pattern
    .replace(/%\{([^}]+):message\}/g, '%{$1:message_derived}')
    .replace(/%\{([^}]+):@timestamp\}/g, '%{$1:@timestamp_derived}');
}

export const processingRoutes = {
  ...simulateProcessorRoute,
  ...processingSuggestionRoute,
};
