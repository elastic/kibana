/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { notFound, internal } from '@hapi/boom';
import { getProcessorType, processingDefinitionSchema } from '@kbn/streams-schema';
import { get } from 'lodash';
import { IngestSimulateResponse } from '@elastic/elasticsearch/lib/api/types';
import { flattenObject } from '../../../../common/utils/flatten_object';
import { calculateObjectDiff } from '../../../../common/utils/calculate_object_diff';
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

      const processors = params.body.processing.map((processor) => {
        const type = getProcessorType(processor);
        const config = get(processor.config, type);
        return {
          [type]: {
            ...config,
            if: processor.condition ? conditionToPainless(processor.condition) : undefined,
          },
        };
      });

      const docs = params.body.documents.map((doc) => ({ _source: doc }));

      const simulationResult = await scopedClusterClient.asCurrentUser.ingest.simulate({
        verbose: true,
        pipeline: {
          description: 'Stream pipeline simulation',
          processors,
        },
        docs,
      });

      const documents = simulationResult.docs.map((doc, id) => {
        if (
          doc.processor_results?.every(
            (proc) => proc.status === 'success' || proc.status === 'error_ignored'
          )
        ) {
          return {
            value: flattenObject(
              doc.processor_results?.at(-1)?.doc?._source ?? params.body.documents[id]
            ),
            isMatch: true,
          };
        }

        return {
          value: flattenObject(params.body.documents[id]),
          isMatch: false,
        };
      });

      const detectedFields = computeDetectedFields(docs, simulationResult);

      const successRate =
        simulationResult.docs.reduce((rate, doc) => {
          return (rate += doc.processor_results?.every((proc) => proc.status === 'success')
            ? 1
            : 0);
        }, 0) / simulationResult.docs.length;

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

const computeDetectedFields = (
  sampleDocs: Array<{ _source: Record<string, unknown> }>,
  simulation: IngestSimulateResponse
) => {
  const samplesToSimulationMap = new Map(simulation.docs.map((doc, id) => [doc, sampleDocs[id]]));

  const diffs = simulation.docs
    .filter((doc) => {
      return doc.processor_results?.every((proc) => proc.status === 'success');
    })
    .map((doc) => {
      const sample = samplesToSimulationMap.get(doc);
      if (sample) {
        const { added } = calculateObjectDiff(
          sample._source,
          doc.processor_results?.at(-1)?.doc?._source
        );
        return flattenObject(added);
      }

      return {};
    })
    .map(Object.keys)
    .flat();

  return [...new Set(diffs)];
};
