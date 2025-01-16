/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { notFound, internal, badRequest } from '@hapi/boom';
import {
  FieldDefinitionConfig,
  fieldDefinitionConfigSchema,
  processingDefinitionSchema,
} from '@kbn/streams-schema';
import { calculateObjectDiff, flattenObject } from '@kbn/object-utils';
import { isEmpty } from 'lodash';
import { DetectedMappingFailure } from '../../../lib/streams/errors/detected_mapping_failure';
import { NonAdditiveProcessor } from '../../../lib/streams/errors/non_additive_processor';
import { SimulationFailed } from '../../../lib/streams/errors/simulation_failed';
import { formatToIngestProcessors } from '../../../lib/streams/helpers/processing';
import { createServerRoute } from '../../create_server_route';
import { DefinitionNotFound } from '../../../lib/streams/errors';
import { checkAccess } from '../../../lib/streams/stream_crud';

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
      detected_fields: z
        .array(z.object({ name: z.string(), type: fieldDefinitionConfigSchema.shape.type }))
        .optional(),
    }),
  }),
  handler: async ({ params, request, getScopedClients }) => {
    try {
      const { scopedClusterClient } = await getScopedClients({ request });

      const hasAccess = await checkAccess({ id: params.path.id, scopedClusterClient });
      if (!hasAccess) {
        throw new DefinitionNotFound(`Stream definition for ${params.path.id} not found.`);
      }
      // Normalize processing definition to pipeline processors
      const processors = formatToIngestProcessors(params.body.processing);
      // Convert input documents to ingest simulation format
      const docs = params.body.documents.map((doc, id) => ({
        _index: params.path.id,
        _id: id.toString(),
        _source: doc,
      }));

      const simulationBody: any = {
        docs,
        pipeline_substitutions: {
          [`${params.path.id}@stream.processing`]: {
            processors,
          },
        },
      };

      // Add component template substitutions if detected fields are provided
      if (params.body.detected_fields) {
        const properties = computeMappingProperties(params.body.detected_fields);

        simulationBody.component_template_substitutions = {
          [`${params.path.id}@stream.layer`]: {
            template: {
              mappings: {
                properties,
              },
            },
          },
        };
      }

      // TODO: update type once Kibana updates to elasticsearch-js 8.17
      let simulationResult: any;
      try {
        // TODO: We should be using scopedClusterClient.asCurrentUser.simulate.ingest() but the ES JS lib currently has a bug. The types also aren't available yet, so we use any.
        simulationResult = await scopedClusterClient.asCurrentUser.transport.request({
          method: 'POST',
          path: `_ingest/_simulate`,
          body: simulationBody,
        });
      } catch (error) {
        throw new SimulationFailed(error);
      }

      const entryWithError = simulationResult.docs.find(isMappingFailure);
      // If there is at least one document with a mapping failure, throw an error
      if (entryWithError) {
        throw new DetectedMappingFailure(
          `The detected field types might not be compatible with these documents. ${entryWithError.doc.error.reason}`
        );
      }

      const simulationDiffs = computeSimulationDiffs(simulationResult, docs);

      const updatedFields = computeUpdatedFields(simulationDiffs);
      if (!isEmpty(updatedFields)) {
        throw new NonAdditiveProcessor(
          `The processor is not additive to the documents. It might update fields [${updatedFields.join()}]`
        );
      }

      // At this point, we know that the shared detected fields are valid, so we can keep the user type choices
      const confirmedValidDetectedFields = computeMappingProperties(
        params.body.detected_fields ?? []
      );

      const documents = computeSimulationDocuments(simulationResult, docs);
      const detectedFields = computeDetectedFields(simulationDiffs, confirmedValidDetectedFields);
      const successRate = computeSuccessRate(simulationResult);
      const failureRate = 1 - successRate;

      return {
        documents,
        success_rate: parseFloat(successRate.toFixed(2)),
        failure_rate: parseFloat(failureRate.toFixed(2)),
        detected_fields: detectedFields,
      };
    } catch (error) {
      if (error instanceof DefinitionNotFound) {
        throw notFound(error);
      }

      if (error instanceof SimulationFailed || error instanceof NonAdditiveProcessor) {
        throw badRequest(error);
      }

      throw internal(error);
    }
  },
});

// TODO: update type once Kibana updates to elasticsearch-js 8.17
const computeSimulationDiffs = (
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
const computeUpdatedFields = (simulationDiff: ReturnType<typeof computeSimulationDiffs>) => {
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
  simulationDiff: ReturnType<typeof computeSimulationDiffs>,
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
  detectedFields: Array<{ name: string; type: FieldDefinitionConfig['type'] }>
) => {
  return Object.fromEntries(detectedFields.map(({ name, type }) => [name, { type }]));
};

// TODO: update type once Kibana updates to elasticsearch-js 8.17
const isSuccessfulDocument = (entry: any) => entry.doc.error === undefined;
// TODO: update type once Kibana updates to elasticsearch-js 8.17
const isMappingFailure = (entry: any) =>
  !isSuccessfulDocument(entry) && entry.doc.error.type === 'document_parsing_exception';
