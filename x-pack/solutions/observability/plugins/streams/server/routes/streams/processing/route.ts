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
  RecursiveRecord,
  getProcessorType,
  namedFieldDefinitionConfigSchema,
  processorDefinitionSchema,
  recursiveRecord,
} from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import { isEmpty } from 'lodash';
import {
  IngestProcessorContainer,
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
    processing: z.array(processorDefinitionSchema),
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

    const { normalizedDocs, processorsMetrics } = normalizePipelineSimulationResult(
      pipelineSimulationResult,
      simulationData.docs
    );

    const simulationDiffs = prepareSimulationDiffs(normalizedDocs, pipelineSimulationBody.docs);

    // console.log(JSON.stringify(normalizedPipelineSimulationResult[0], null, 2));

    assertSimulationResult(simulationDiffs);

    return prepareSimulationResponse(simulationResult, normalizedDocs, params.body.detected_fields);
  },
});

/* processing/_simulate API helpers */

const getProcessorId = (id: number) => `processor-${id}`;

const prepareSimulationDocs = (documents: RecursiveRecord[], streamId: string) => {
  return documents.map((doc, id) => ({
    _index: streamId,
    _id: id.toString(),
    _source: doc,
  }));
};

const prepareSimulationProcessors = (
  processing: ProcessorDefinition[]
): IngestProcessorContainer[] => {
  //
  /**
   * We want to simulate processors logic and collect data indipendently from the user config for simulation purposes.
   * 1. Force each processor to not ignore failures to collect all errors
   * 2. Append the error message to the `_errors` field on failure
   */
  const processors = processing.map((processor, id) => {
    const type = getProcessorType(processor);
    return {
      [type]: {
        ...(processor as any)[type], // Safe to use any here due to type structure
        ignore_failure: false,
        tag: getProcessorId(id),
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

interface NormalizedSimulationDoc {
  value: RecursiveRecord;
  status: 'parsed' | 'partially_parsed' | 'failed';
  errors?: string[];
}

interface ProcessorMetrics {
  success_rate: number;
  failure_rate: number;
  errors?: string[];
}

const normalizePipelineSimulationResult = (
  simulationResult: IngestSimulateResponse,
  sampleDocs: Array<{ _source: RecursiveRecord }>
) => {
  const processorsMap = new Map<string, ProcessorMetrics>();

  const normalizedDocs = simulationResult.docs.map((docResult, id) => {
    const lastDocSource = docResult.processor_results?.at(-1)?.doc?._source;

    const status = isSuccessfulPipelineSimulationDocument(docResult)
      ? 'parsed'
      : isPartiallySuccessfulPipelineSimulationDocument(docResult)
      ? 'partially_parsed'
      : 'failed';

    if (lastDocSource) {
      const { _errors, ...docSource } = lastDocSource;
      const errors = _errors as SimulatedDocError[] | undefined;

      if (errors) {
        errors?.forEach((error) => {
          const procId = error.processor_id;
          const metrics = processorsMap.get(procId) ?? {
            errors: [],
            success_rate: 0,
            failure_rate: 0,
          };

          metrics.errors?.push(error.message);
          metrics.failure_rate++;

          processorsMap.set(procId, metrics);
        });
      }

      return {
        value: flattenObject(docSource),
        errors,
        status,
      };
    } else {
      return {
        value: flattenObject(sampleDocs[id]._source),
        errors: [{ processor_id: 'unknown', message: 'Unknown error' }],
        status: 'failed',
      };
    }
  });

  const processorsMetrics = Object.fromEntries(processorsMap);

  return { normalizedDocs, processorsMetrics };
};

const assertSimulationResult = (simulationDiffs: ReturnType<typeof prepareSimulationDiffs>) => {
  // Assert mappings are compatible with the documents
  // const entryWithError = simulationResult.docs.find(isMappingFailure);
  // if (entryWithError) {
  //   throw new DetectedMappingFailureError(
  //     `The detected field types might not be compatible with these documents. ${entryWithError.doc.error.reason}`
  //   );
  // }
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
  normalizedDocs: NormalizedSimulationDoc[],
  detectedFields?: ProcessingSimulateParams['body']['detected_fields']
) => {
  // const confirmedValidDetectedFields = computeMappingProperties(detectedFields ?? []);
  // const detectedFieldsResult = computeDetectedFields(simulationDiffs, confirmedValidDetectedFields);
  const successRate = computeSuccessRate(simulationResult);
  const failureRate = 1 - successRate;

  return {
    documents: normalizedDocs,
    success_rate: parseFloat(successRate.toFixed(2)),
    failure_rate: parseFloat(failureRate.toFixed(2)),
    detected_fields: detectedFieldsResult,
  };
};

// TODO: update type once Kibana updates to elasticsearch-js 8.17
const prepareSimulationDiffs = (
  normalizedDocs: NormalizedSimulationDoc[],
  sampleDocs: Array<{ _source: RecursiveRecord }>
) => {
  // Since we filter out failed documents, we need to map the simulation docs to the sample docs for later retrieval
  const samplesToSimulationMap = new Map(
    normalizedDocs.map((doc, id) => [doc.value, sampleDocs[id]])
  );

  const diffs = normalizedDocs
    .filter((doc) => doc.status !== 'failed') // Exclude completely failed documents, keep parsed and partially parsed
    .map((doc) => {
      const sample = samplesToSimulationMap.get(doc.value);
      if (sample) {
        return calculateObjectDiff(sample._source, doc.value);
      }

      return calculateObjectDiff({});
    });

  return diffs;
};

const computeDetectedFields = (
  simulation: IngestSimulateResponse,
  sampleDocs: Array<{ _source: Record<string, unknown> }>
): Array<{
  name: string;
  type: FieldDefinitionConfig['type'] | 'unmapped';
}> => {
  // Since we filter out failed documents, we need to map the simulation docs to the sample docs for later retrieval
  const samplesToSimulationMap = new Map(simulation.docs.map((doc, id) => [doc, sampleDocs[id]]));

  const diffs = simulation.docs
    .filter(isSuccessfulDocument)
    .map((doc) => {
      const sample = samplesToSimulationMap.get(doc);
      if (sample) {
        const { added } = calculateObjectDiff(
          sample._source,
          doc.processor_results.at(-1)?.doc?._source
        );
        return flattenObject(added);
      }

      return {};
    })
    .map(Object.keys)
    .flat();

  const uniqueFields = [...new Set(diffs)];

  return uniqueFields.map((name) => ({ name, type: 'unmapped' }));
};

const computeUpdatedFields = (simulationDiff: ReturnType<typeof prepareSimulationDiffs>) => {
  const diffs = simulationDiff
    .map((simulatedDoc) => flattenObject(simulatedDoc.updated))
    .flatMap(Object.keys);

  const uniqueFields = [...new Set(diffs)];

  return uniqueFields;
};

interface ProcessorMetrics {
  success_rate: number;
  failure_rate: number;
  errors?: string[];
}

// const computeSimulationMetrics = (
//   docs: NormalizedSimulationDoc[],
//   processors: ProcessorDefinition[]
// ): ProcessorMetrics[] => {
//   const processorIds = processors.map((_, id) => getProcessorId(id));
//   const processorsMap = new Map<string, ProcessorMetrics>(
//     processorIds.map((id) => [id, { success_rate: 0, failure_rate: 0, errors: [] }])
//   );

//   processorIds.forEach((id) => {
//     const metrics = processorsMap.get(id)!; // Safe to use ! here since we initialize the map with all processor ids
//     docs.forEach((doc) => {
//       if (doc.errors) {
//         const processorErrors = doc.errors.filter((error) => error.processor_id === id);
//         metrics.errors?.push(...processorErrors.map((error) => error.message));
//       }
//     });

//     processorsMap.set(id, metrics);
//   });
// };

// TODO: update type once Kibana updates to elasticsearch-js 8.17
const computeSuccessRate = (docs: NormalizedSimulationDoc[]) => {
  const successfulCount = docs.reduce((rate, entry) => {
    return (rate += doc ? 1 : 0);
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

const isSuccessfulPipelineSimulationDocument = (
  doc: IngestSimulateSimulateDocumentResult
): doc is Required<IngestSimulateSimulateDocumentResult> =>
  doc.processor_results?.every((processorSimulation) => processorSimulation.status === 'success') ??
  false;

const isPartiallySuccessfulPipelineSimulationDocument = (
  doc: IngestSimulateSimulateDocumentResult
): doc is Required<IngestSimulateSimulateDocumentResult> =>
  doc.processor_results?.some(
    (processorSimulation) => processorSimulation.status === 'success' && processorSimulation.tag
  ) ?? false;

export const processingRoutes = {
  ...simulateProcessorRoute,
};
