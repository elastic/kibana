/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { notFound, internal } from '@hapi/boom';
import {
  FieldDefinitionConfig,
  ProcessingDefinition,
  getProcessorType,
  processingDefinitionSchema,
} from '@kbn/streams-schema';
import { calculateObjectDiff, flattenObject } from '@kbn/object-utils';
import { get } from 'lodash';
import {
  IngestSimulateResponse,
  IngestSimulateSimulateDocumentResult,
} from '@elastic/elasticsearch/lib/api/types';
import { createServerRoute } from '../../create_server_route';
import { DefinitionNotFound } from '../../../lib/streams/errors';
import { checkReadAccess } from '../../../lib/streams/stream_crud';
import { conditionToPainless } from '../../../lib/streams/helpers/condition_to_painless';

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
  params: z.object({
    path: z.object({ id: z.string() }),
    body: z.object({
      processing: z.array(processingDefinitionSchema),
      documents: z.array(z.record(z.unknown())),
    }),
  }),
  handler: async ({ params, request, getScopedClients }) => {
    try {
      const { scopedClusterClient } = await getScopedClients({ request });

      const hasAccess = await checkReadAccess({ id: params.path.id, scopedClusterClient });
      if (!hasAccess) {
        throw new DefinitionNotFound(`Stream definition for ${params.path.id} not found.`);
      }
      // Normalize processing definition to pipeline processors
      const processors = normalizeProcessing(params.body.processing);
      // Convert input documents to ingest simulation format
      const docs = params.body.documents.map((doc) => ({ _source: doc }));

      const simulationResult = await scopedClusterClient.asCurrentUser.ingest.simulate({
        verbose: true,
        pipeline: { processors },
        docs,
      });

      const documents = computeSimulationDocuments(simulationResult, docs);
      const detectedFields = computeDetectedFields(simulationResult, docs);
      const successRate = computeSuccessRate(simulationResult);
      const failureRate = 1 - successRate;

      return {
        documents,
        success_rate: parseFloat(successRate.toFixed(2)),
        failure_rate: parseFloat(failureRate.toFixed(2)),
        detected_fields: detectedFields,
      };
    } catch (e) {
      if (e instanceof DefinitionNotFound) {
        throw notFound(e);
      }

      throw internal(e);
    }
  },
});

const normalizeProcessing = (processing: ProcessingDefinition[]) => {
  return processing.map((processor) => {
    const type = getProcessorType(processor);
    const config = get(processor.config, type);
    return {
      [type]: {
        ...config,
        if: processor.condition ? conditionToPainless(processor.condition) : undefined,
      },
    };
  });
};

const computeSimulationDocuments = (
  simulation: IngestSimulateResponse,
  sampleDocs: Array<{ _source: Record<string, unknown> }>
) => {
  return simulation.docs.map((doc, id) => {
    // If every processor was successful, return and flatten the simulation doc from the last processor
    if (isSuccessfulDocument(doc)) {
      return {
        value: flattenObject(doc.processor_results.at(-1)?.doc?._source ?? sampleDocs[id]._source),
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

const computeSuccessRate = (simulation: IngestSimulateResponse) => {
  const successfulCount = simulation.docs.reduce((rate, doc) => {
    return (rate += isSuccessfulDocument(doc) ? 1 : 0);
  }, 0);
  return successfulCount / simulation.docs.length;
};

const isSuccessfulDocument = (
  doc: IngestSimulateSimulateDocumentResult
): doc is Required<IngestSimulateSimulateDocumentResult> =>
  doc.processor_results?.every((processorSimulation) => processorSimulation.status === 'success') ||
  false;
