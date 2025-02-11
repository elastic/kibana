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
  ProcessorDefinition,
  ProcessorDefinitionWithId,
  RecursiveRecord,
  getProcessorType,
  namedFieldDefinitionConfigSchema,
  processorWithIdDefinitionSchema,
  recursiveRecord,
} from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import { isEmpty, mapValues, omit, uniq } from 'lodash';
import {
  IngestProcessorContainer,
  IngestSimulatePipelineSimulation,
  IngestSimulateRequest,
  IngestSimulateResponse,
  IngestSimulateSimulateDocumentResult,
} from '@elastic/elasticsearch/lib/api/types';
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
    processing: z.array(processorWithIdDefinitionSchema),
    documents: z.array(recursiveRecord),
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
    // Prepare data for either simulation types (ingest, pipeline), used to compose both simulation bodies
    const simulationData = prepareSimulationData(params);

    const pipelineSimulationBody = preparePipelineSimulationBody(simulationData);

    const pipelineSimulationResult = await executePipelineSimulation(
      scopedClusterClient,
      pipelineSimulationBody
    );

    const { normalizedDocs, processorsMetrics } = parsePipelineSimulationResult(
      pipelineSimulationResult,
      simulationData.docs,
      params.body.processing
    );

    return prepareSimulationResponse(normalizedDocs, processorsMetrics);
  },
});

/* processing/_simulate API helpers */

const prepareSimulationDocs = (documents: RecursiveRecord[], streamId: string) => {
  return documents.map((doc, id) => ({
    _index: streamId,
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
    docs: prepareSimulationDocs(documents, path.id),
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

// TODO: update type once Kibana updates to elasticsearch-js 8.17
const prepareIngestSimulationBody = (
  simulationData: ReturnType<typeof prepareSimulationData>,
  params: ProcessingSimulateParams
) => {
  const { path, body } = params;
  const { detected_fields } = body;

  const { docs, processors } = simulationData;

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

const executePipelineSimulation = async (
  scopedClusterClient: IScopedClusterClient,
  simulationBody: IngestSimulateRequest
) => {
  try {
    return await scopedClusterClient.asCurrentUser.ingest.simulate(simulationBody);
  } catch (error) {
    // This catch high level errors that might occur during the simulation, such invalid grok syntax
    throw new SimulationFailedError(error);
  }
};

// TODO: update type once Kibana updates to elasticsearch-js 8.17
const executeIngestSimulation = async (
  scopedClusterClient: IScopedClusterClient,
  simulationBody: ReturnType<typeof prepareIngestSimulationBody>
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

interface SimulatedDocError {
  processor_id: string;
  message: string;
}

type DocSimulationStatus = 'parsed' | 'partially_parsed' | 'failed';

interface NormalizedSimulationDoc {
  detected_fields: Array<{ processor_id: string; field: string }>;
  errors: SimulatedDocError[];
  status: DocSimulationStatus;
  value: RecursiveRecord;
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
  sampleDocs: Array<{ _source: RecursiveRecord }>,
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

      metrics.errors.push(extractGrokErrorMessage(error.message));
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
  sample: RecursiveRecord
) => {
  const successfulProcessors = docResult.processor_results!.filter(isSuccessfulProcessor);

  const comparisonDocs = [
    { processor_id: 'sample', value: sample },
    ...successfulProcessors.map((proc) => ({
      processor_id: proc.tag,
      value: omit(proc.doc._source, ['_errors', 'ingest']),
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

// const assertSimulationResult = (simulationDiffs: ReturnType<typeof prepareSimulationDiffs>) => {
//   // Assert mappings are compatible with the documents
//   const entryWithError = simulationResult.docs.find(isMappingFailure);
//   if (entryWithError) {
//     throw new DetectedMappingFailureError(
//       `The detected field types might not be compatible with these documents. ${entryWithError.doc.error.reason}`
//     );
//   }
//   // Assert that the processors are purely additive to the documents
//   const updatedFields = computeUpdatedFields(simulationDiffs);

//   if (!isEmpty(updatedFields)) {
//     throw new NonAdditiveProcessorError(
//       `The processor is not additive to the documents. It might update fields [${updatedFields.join()}]`
//     );
//   }
// };

const prepareSimulationResponse = (
  normalizedDocs: NormalizedSimulationDoc[],
  processorMetrics: Record<string, ProcessorMetrics>
) => {
  const detectedFields = computeDetectedFields(processorMetrics);
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

const computeDetectedFields = (
  processorMetrics: Record<string, ProcessorMetrics>
): Array<{
  name: string;
  type: FieldDefinitionConfig['type'] | 'unmapped';
}> => {
  const fields = Object.values(processorMetrics).flatMap((metrics) => metrics.detected_fields);

  const uniqueFields = uniq(fields);

  return uniqueFields.map((name) => ({ name, type: 'unmapped' }));
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

const baseGrokMatchError = 'Provided Grok expressions do not match field value';

const extractGrokErrorMessage = (message: string) => {
  const baseRegex = new RegExp(`${baseGrokMatchError}: (?:.*)`);
  const isMatch = baseRegex.test(message);

  return isMatch ? baseGrokMatchError : message;
};

type WithRequired<TObj, TKey extends keyof TObj> = TObj & { [TProp in TKey]-?: TObj[TProp] };

export const processingRoutes = {
  ...simulateProcessorRoute,
};
