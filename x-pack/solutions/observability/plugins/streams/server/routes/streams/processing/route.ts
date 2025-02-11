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
  ProcessorDefinition,
  ProcessorDefinitionWithId,
  FlattenRecord,
  flattenRecord,
  getInheritedFieldsFromAncestors,
  getProcessorType,
  isWiredStreamDefinition,
  namedFieldDefinitionConfigSchema,
  processorWithIdDefinitionSchema,
} from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import { isEmpty, mapValues, omit, uniq } from 'lodash';
import {
  ClusterComponentTemplateNode,
  ErrorCauseKeys,
  IngestPipelineConfig,
  IngestProcessorContainer,
  IngestSimulateDocument,
  IngestSimulatePipelineSimulation,
  IngestSimulateRequest,
  IngestSimulateResponse,
  IngestSimulateSimulateDocumentResult,
} from '@elastic/elasticsearch/lib/api/types';
import { StreamsClient } from '../../../lib/streams/client';
import { formatToIngestProcessors } from '../../../lib/streams/helpers/processing';
import { checkAccess } from '../../../lib/streams/stream_crud';
import { createServerRoute } from '../../create_server_route';
import { DefinitionNotFoundError } from '../../../lib/streams/errors/definition_not_found_error';
import { SimulationFailedError } from '../../../lib/streams/errors/simulation_failed_error';
import { DetectedMappingFailureError } from '../../../lib/streams/errors/detected_mapping_failure_error';

const paramsSchema = z.object({
  path: z.object({ name: z.string() }),
  body: z.object({
    processing: z.array(processorWithIdDefinitionSchema),
    documents: z.array(flattenRecord),
    detected_fields: z.array(namedFieldDefinitionConfigSchema).optional(),
  }),
});

type ProcessingSimulateParams = z.infer<typeof paramsSchema>;

export const simulateProcessorRoute = createServerRoute({
  endpoint: 'POST /api/streams/{name}/processing/_simulate',
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
    const { scopedClusterClient, streamsClient } = await getScopedClients({ request });

    const { read } = await checkAccess({ name: params.path.name, scopedClusterClient });
    if (!read) {
      throw new DefinitionNotFoundError(`Stream definition for ${params.path.name} not found.`);
    }
    // Prepare data for either simulation types (ingest, pipeline), used to compose both simulation bodies
    const simulationData = prepareSimulationData(params);

    const pipelineSimulationBody = preparePipelineSimulationBody(simulationData);

    /**
     * Run both pipeline and ingest simulations in parallel.
     * - The pipeline simulation is used to extract the normalized documents and the processor metrics. This always runs.
     * - The ingest simulation is used to fail fast on mapping failures. This runs only if `detected_fields` is provided.
     */
    const [pipelineSimulationResult] = await Promise.all([
      executePipelineSimulation(scopedClusterClient, pipelineSimulationBody),
      conditionallyExecuteIngestSimulation(scopedClusterClient, simulationData, params),
    ]);

    const { normalizedDocs, processorsMetrics } = parsePipelineSimulationResult(
      pipelineSimulationResult,
      simulationData.docs,
      params.body.processing
    );

    const res = await prepareSimulationResponse(
      normalizedDocs,
      processorsMetrics,
      streamsClient,
      params.path.name
    );

    return res;
  },
});

/* processing/_simulate API helpers */

const prepareSimulationDocs = (
  documents: FlattenRecord[],
  streamName: string
): IngestSimulateDocument[] => {
  return documents.map((doc, id) => ({
    _index: streamName,
    _id: id.toString(),
    _source: doc,
  }));
};

const prepareSimulationProcessors = (
  processing: ProcessorDefinitionWithId[]
): IngestProcessorContainer[] => {
  //
  /**
   * We want to simulate processors logic and collect data indipendently from the user config for simulation purposes.
   * 1. Force each processor to not ignore failures to collect all errors
   * 2. Append the error message to the `_errors` field on failure
   */
  const processors = processing.map((processor) => {
    const { id, ...processorConfig } = processor;

    const type = getProcessorType(processorConfig);
    return {
      [type]: {
        ...(processorConfig as any)[type], // Safe to use any here due to type structure
        ignore_failure: false,
        tag: id,
        on_failure: [
          {
            append: {
              field: '_errors',
              value: {
                processor_id: '{{{ _ingest.on_failure_processor_tag }}}',
                message: '{{{ _ingest.on_failure_message }}}',
              },
            },
          },
        ],
      },
    } as ProcessorDefinition;
  });

  return formatToIngestProcessors(processors);
};

const prepareSimulationData = (params: ProcessingSimulateParams) => {
  const { path, body } = params;
  const { processing, documents } = body;

  return {
    docs: prepareSimulationDocs(documents, path.name),
    processors: prepareSimulationProcessors(processing),
  };
};

const preparePipelineSimulationBody = (
  simulationData: ReturnType<typeof prepareSimulationData>
): IngestSimulateRequest => {
  const { docs, processors } = simulationData;

  return {
    docs,
    pipeline: { processors },
    verbose: true,
  };
};

const prepareIngestSimulationBody = (
  simulationData: ReturnType<typeof prepareSimulationData>,
  params: ProcessingSimulateParams
) => {
  const { path, body } = params;
  const { detected_fields } = body;

  const { docs, processors } = simulationData;

  // TODO: update type once Kibana updates to elasticsearch-js 8.17
  const simulationBody: {
    docs: IngestSimulateDocument[];
    pipeline_substitutions: Record<string, IngestPipelineConfig>;
    component_template_substitutions?: Record<string, ClusterComponentTemplateNode>;
  } = {
    docs,
    pipeline_substitutions: {
      [`${path.name}@stream.processing`]: {
        processors,
      },
    },
  };

  if (detected_fields) {
    const properties = computeMappingProperties(detected_fields);
    simulationBody.component_template_substitutions = {
      [`${path.name}@stream.layer`]: {
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

const getStreamFields = async (streamsClient: StreamsClient, streamName: string) => {
  const [stream, ancestors] = await Promise.all([
    streamsClient.getStream(streamName),
    streamsClient.getAncestors(streamName),
  ]);

  if (isWiredStreamDefinition(stream)) {
    return { ...stream.ingest.wired.fields, ...getInheritedFieldsFromAncestors(ancestors) };
  }

  return {};
};

const executePipelineSimulation = async (
  scopedClusterClient: IScopedClusterClient,
  simulationBody: IngestSimulateRequest
) => {
  try {
    return await scopedClusterClient.asCurrentUser.ingest.simulate(simulationBody);
  } catch (error) {
    // This catch high level errors that might occur during the simulation, such invalid grok syntax
    // I'm rethrowing the error to normalize the ES error as it has a different structure than the other errors.
    throw new SimulationFailedError(error);
  }
};

// TODO: update type once Kibana updates to elasticsearch-js 8.17
const conditionallyExecuteIngestSimulation = async (
  scopedClusterClient: IScopedClusterClient,
  simulationData: ReturnType<typeof prepareSimulationData>,
  params: ProcessingSimulateParams
): Promise<any> => {
  if (!params.body.detected_fields) return null;

  const simulationBody = prepareIngestSimulationBody(simulationData, params);

  let simulationResult: {
    docs: Array<{ doc: IngestSimulateDocument & { error?: ErrorCauseKeys } }>;
  };

  try {
    // TODO: We should be using scopedClusterClient.asCurrentUser.simulate.ingest() once Kibana updates to elasticsearch-js 8.17
    simulationResult = await scopedClusterClient.asCurrentUser.transport.request({
      method: 'POST',
      path: `_ingest/_simulate`,
      body: simulationBody,
    });
  } catch (error) {
    // This catch high level errors that might occur during the simulation, such invalid grok syntax
    // I'm rethrowing the error to normalize the ES error as it has a different structure than the other errors.
    throw new SimulationFailedError(error);
  }

  const entryWithError = simulationResult.docs.find(isMappingFailure);

  if (entryWithError) {
    throw new DetectedMappingFailureError(
      `The detected field types might not be compatible with these documents. ${entryWithError.doc.error?.reason}`
    );
  }

  return simulationResult;
};

interface SimulatedDocError {
  processor_id: string;
  message: string;
}

type DocSimulationStatus = 'parsed' | 'partially_parsed' | 'failed';

interface NormalizedSimulationDoc {
  detected_fields: Array<{ processor_id: string; field: string }>;
  errors: SimulatedDocError[];
  status: DocSimulationStatus;
  value: FlattenRecord;
}

interface ProcessorMetrics {
  detected_fields: string[];
  errors: string[];
  failure_rate: number;
  success_rate: number;
}

const initProcessorMetricsMap = (processing: ProcessorDefinitionWithId[]) => {
  const processorMetricsEntries: Array<[string, ProcessorMetrics]> = processing.map((processor) => [
    processor.id,
    {
      detected_fields: [],
      errors: [],
      failure_rate: 0,
      success_rate: 1,
    },
  ]);

  return new Map(processorMetricsEntries);
};

const extractProcessorMetrics = (processorsMap: Map<string, ProcessorMetrics>) => {
  return mapValues(Object.fromEntries(processorsMap), (metrics) => {
    const failureRate = metrics.failure_rate / 100;
    const successRate = 1 - failureRate;
    const detected_fields = uniq(metrics.detected_fields);
    const errors = uniq(metrics.errors);

    return {
      detected_fields,
      errors,
      failure_rate: parseFloat(failureRate.toFixed(2)),
      success_rate: parseFloat(successRate.toFixed(2)),
    };
  });
};

const getDocumentStatus = (doc: IngestSimulateSimulateDocumentResult): DocSimulationStatus => {
  if (isSuccessfulDocument(doc)) return 'parsed';

  if (isPartiallySuccessfulDocument(doc)) return 'partially_parsed';

  return 'failed';
};

const parsePipelineSimulationResult = (
  simulationResult: IngestSimulateResponse,
  sampleDocs: Array<{ _source: FlattenRecord }>,
  processing: ProcessorDefinitionWithId[]
): {
  normalizedDocs: NormalizedSimulationDoc[];
  processorsMetrics: Record<string, ProcessorMetrics>;
} => {
  const processorsMap = initProcessorMetricsMap(processing);

  const normalizedDocs = simulationResult.docs.map((docResult, id) => {
    const lastDocSource = docResult.processor_results?.at(-1)?.doc?._source!; // Safe to use ! here since we force the processor to not ignore failures

    const diff = computeSimulationDocDiff(docResult, sampleDocs[id]._source);

    const status = getDocumentStatus(docResult);

    const { _errors, ...docSource } = lastDocSource;
    const errors = (_errors ?? []) as SimulatedDocError[];

    diff.detected_fields.forEach(({ processor_id, field }) => {
      const metrics = processorsMap.get(processor_id)!; // Safe to use ! here since we initialize the map with all processor ids

      metrics.detected_fields.push(field);

      processorsMap.set(processor_id, metrics);
    });

    errors.push(...diff.errors);
    errors.forEach((error) => {
      const procId = error.processor_id;
      const metrics = processorsMap.get(procId)!; // Safe to use ! here since we initialize the map with all processor ids

      metrics.errors.push(error.message);
      metrics.failure_rate++;

      processorsMap.set(procId, metrics);
    });

    return {
      value: flattenObject(docSource),
      detected_fields: diff.detected_fields,
      errors,
      status,
    };
  });

  const processorsMetrics = extractProcessorMetrics(processorsMap);

  return { normalizedDocs, processorsMetrics };
};

const computeSimulationDocDiff = (
  docResult: IngestSimulateSimulateDocumentResult,
  sample: FlattenRecord
) => {
  const successfulProcessors = docResult.processor_results!.filter(isSuccessfulProcessor);

  const comparisonDocs = [
    { processor_id: 'sample', value: sample },
    ...successfulProcessors.map((proc) => ({
      processor_id: proc.tag,
      value: omit(proc.doc._source, ['_errors']),
    })),
  ];

  const diffResult: Pick<NormalizedSimulationDoc, 'detected_fields' | 'errors'> = {
    detected_fields: [],
    errors: [],
  };

  while (comparisonDocs.length > 1) {
    const currentDoc = comparisonDocs.shift()!; // Safe to use ! here since we check the length
    const nextDoc = comparisonDocs[0];

    const { added, updated } = calculateObjectDiff(
      flattenObject(currentDoc.value),
      flattenObject(nextDoc.value)
    );

    const addedFields = Object.keys(flattenObject(added));
    const updatedFields = Object.keys(flattenObject(updated));

    const processorDetectedFields = [...addedFields, ...updatedFields].map((field) => ({
      processor_id: nextDoc.processor_id,
      field,
    }));

    diffResult.detected_fields.push(...processorDetectedFields);

    if (!isEmpty(updatedFields)) {
      diffResult.errors.push({
        processor_id: nextDoc.processor_id,
        message: `The processor is not additive to the documents. It might update fields [${updatedFields.join()}]`,
      });
    }
  }

  return diffResult;
};

const prepareSimulationResponse = async (
  normalizedDocs: NormalizedSimulationDoc[],
  processorMetrics: Record<string, ProcessorMetrics>,
  streamsClient: StreamsClient,
  streamName: string
) => {
  const detectedFields = await computeDetectedFields(processorMetrics, streamsClient, streamName);
  const successRate = computeSuccessRate(normalizedDocs);
  const failureRate = 1 - successRate;

  return {
    detected_fields: detectedFields,
    documents: normalizedDocs,
    processor_metrics: processorMetrics,
    failure_rate: parseFloat(failureRate.toFixed(2)),
    success_rate: parseFloat(successRate.toFixed(2)),
  };
};

const computeDetectedFields = async (
  processorMetrics: Record<string, ProcessorMetrics>,
  streamsClient: StreamsClient,
  streamName: string
) => {
  const fields = Object.values(processorMetrics).flatMap((metrics) => metrics.detected_fields);

  const uniqueFields = uniq(fields);

  // Short-circuit to avoid fetching streams field if none is detected
  if (isEmpty(uniqueFields)) {
    return [];
  }

  const streamFields = await getStreamFields(streamsClient, streamName);

  return uniqueFields.map((name) => {
    const existingField = streamFields[name];
    if (existingField) {
      return { name, ...existingField };
    }

    return { name };
  });
};

const computeSuccessRate = (docs: NormalizedSimulationDoc[]) => {
  const successfulCount = docs.reduce((rate, doc) => (rate += doc.status === 'parsed' ? 1 : 0), 0);

  return successfulCount / docs.length;
};

const computeMappingProperties = (
  detectedFields: NonNullable<ProcessingSimulateParams['body']['detected_fields']>
) => {
  return Object.fromEntries(detectedFields.map(({ name, type }) => [name, { type }]));
};

const isSuccessfulDocument = (
  doc: IngestSimulateSimulateDocumentResult
): doc is Required<IngestSimulateSimulateDocumentResult> =>
  doc.processor_results?.every(isSuccessfulProcessor) ?? false;

const isPartiallySuccessfulDocument = (
  doc: IngestSimulateSimulateDocumentResult
): doc is Required<IngestSimulateSimulateDocumentResult> =>
  doc.processor_results?.some(isSuccessfulProcessor) ?? false;

const isSuccessfulProcessor = (
  processor: IngestSimulatePipelineSimulation
): processor is WithRequired<IngestSimulatePipelineSimulation, 'doc' | 'tag'> =>
  processor.status === 'success' && !!processor.tag;

// TODO: update type once Kibana updates to elasticsearch-js 8.17
const isMappingFailure = (entry: any) => entry.doc?.error?.type === 'document_parsing_exception';

type WithRequired<TObj, TKey extends keyof TObj> = TObj & { [TProp in TKey]-?: TObj[TProp] };

export const processingRoutes = {
  ...simulateProcessorRoute,
};
