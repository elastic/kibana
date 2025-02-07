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

    const simulationData = prepareSimulationData(params);

    const ingestSimulationBody = prepareIngestSimulationBody(simulationData, params);

    const simulationResult = await executeIngestSimulation(
      scopedClusterClient,
      ingestSimulationBody
    );

    const simulationDiffs = prepareSimulationDiffs(simulationResult, ingestSimulationBody.docs);

    assertSimulationResult(simulationResult, simulationDiffs);

    return prepareSimulationResponse(
      simulationResult,
      ingestSimulationBody.docs,
      simulationDiffs,
      params.body.detected_fields
    );
  },
});

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
  // Force each processor to not ignore failures to collect all errors
  const processors = processing.map((processor) => {
    const type = getProcessorType(processor);
    return {
      [type]: {
        ...(processor as any)[type], // Safe to use any here due to type structure
        ignore_failure: false,
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
): Promise<any> => {
  try {
    return await scopedClusterClient.asCurrentUser.ingest.simulate(simulationBody);
  } catch (error) {
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
  docs: Array<{ _source: RecursiveRecord }>,
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
  sampleDocs: Array<{ _source: RecursiveRecord }>
) => {
  // Since we filter out failed documents, we need to map the simulation docs to the sample docs for later retrieval
  const samplesToSimulationMap = new Map<any, { _source: RecursiveRecord }>(
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
  sampleDocs: Array<{ _source: RecursiveRecord }>
): Array<{ isMatch: boolean; value: RecursiveRecord }> => {
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

export const processingRoutes = {
  ...simulateProcessorRoute,
};
