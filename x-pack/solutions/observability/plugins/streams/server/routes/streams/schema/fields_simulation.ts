/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { notFound, internal } from '@hapi/boom';
import { getFlattenedObject } from '@kbn/std';
import { fieldDefinitionSchema } from '../../../../common/types';
import { createServerRoute } from '../../create_server_route';
import { DefinitionNotFound } from '../../../lib/streams/errors';
import { checkReadAccess } from '../../../lib/streams/stream_crud';

const SAMPLE_SIZE = 200;

export const schemaFieldsSimulationRoute = createServerRoute({
  endpoint: 'POST /api/streams/{id}/schema/fields_simulation',
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
      field_definitions: z.array(fieldDefinitionSchema),
    }),
  }),
  handler: async ({
    response,
    params,
    request,
    logger,
    getScopedClients,
  }): Promise<{
    status: 'unknown' | 'success' | 'failure';
    simulationError: string | null;
    documentsWithRuntimeFieldsApplied: unknown[] | null;
  }> => {
    try {
      const { scopedClusterClient } = await getScopedClients({ request });

      const hasAccess = await checkReadAccess({ id: params.path.id, scopedClusterClient });
      if (!hasAccess) {
        throw new DefinitionNotFound(`Stream definition for ${params.path.id} not found.`);
      }

      const propertiesForSample = Object.fromEntries(
        params.body.field_definitions.map((field) => [field.name, { type: 'keyword' }])
      );

      const documentSamplesSearchBody = {
        // Add keyword runtime mappings so we can pair with exists, this is to attempt to "miss" less documents for the simulation.
        runtime_mappings: propertiesForSample,
        query: {
          bool: {
            filter: Object.keys(propertiesForSample).map((field) => ({
              exists: { field },
            })),
          },
        },
        sort: [
          {
            '@timestamp': {
              order: 'desc',
            },
          },
        ],
        size: SAMPLE_SIZE,
      };

      const sampleResults = await scopedClusterClient.asCurrentUser.search({
        index: params.path.id,
        ...documentSamplesSearchBody,
      });

      if (
        (typeof sampleResults.hits.total === 'object' && sampleResults.hits.total?.value === 0) ||
        sampleResults.hits.total === 0 ||
        !sampleResults.hits.total
      ) {
        return {
          status: 'unknown',
          simulationError: null,
          documentsWithRuntimeFieldsApplied: null,
        };
      }

      const propertiesForSimulation = Object.fromEntries(
        params.body.field_definitions.map((field) => [
          field.name,
          { type: field.type, ...(field.format ? { format: field.format } : {}) },
        ])
      );

      const fieldDefinitionKeys = Object.keys(propertiesForSimulation);

      const sampleResultsAsSimulationDocs = sampleResults.hits.hits.map((hit) => ({
        _index: params.path.id,
        _id: hit._id,
        _source: Object.fromEntries(
          Object.entries(getFlattenedObject(hit._source as Record<string, unknown>)).filter(
            ([k]) => fieldDefinitionKeys.includes(k) || k === '@timestamp'
          )
        ),
      }));

      const simulationBody = {
        docs: sampleResultsAsSimulationDocs,
        component_template_substitutions: {
          [`${params.path.id}@stream.layer`]: {
            template: {
              mappings: {
                dynamic: 'strict',
                properties: propertiesForSimulation,
              },
            },
          },
        },
      };

      // TODO: We should be using scopedClusterClient.asCurrentUser.simulate.ingest() but the ES JS lib currently has a bug. The types also aren't available yet, so we use any.
      const simulation = (await scopedClusterClient.asCurrentUser.transport.request({
        method: 'POST',
        path: `_ingest/_simulate`,
        body: simulationBody,
      })) as any;

      const hasErrors = simulation.docs.some((doc: any) => doc.doc.error !== undefined);

      if (hasErrors) {
        const documentWithError = simulation.docs.find((doc: any) => {
          return doc.doc.error !== undefined;
        });

        return {
          status: 'failure',
          simulationError: JSON.stringify(
            // Use the first error as a representative error
            documentWithError.doc.error
          ),
          documentsWithRuntimeFieldsApplied: null,
        };
      }

      // Convert the field definitions to a format that can be used in runtime mappings (match_only_text -> keyword)
      const propertiesCompatibleWithRuntimeMappings = Object.fromEntries(
        params.body.field_definitions.map((field) => [
          field.name,
          {
            type: field.type === 'match_only_text' ? 'keyword' : field.type,
            ...(field.format ? { format: field.format } : {}),
          },
        ])
      );

      const runtimeFieldsSearchBody = {
        runtime_mappings: propertiesCompatibleWithRuntimeMappings,
        sort: [
          {
            '@timestamp': {
              order: 'desc',
            },
          },
        ],
        size: SAMPLE_SIZE,
        fields: params.body.field_definitions.map((field) => field.name),
        _source: false,
      };

      // This gives us a "fields" representation rather than _source from the simulation
      const runtimeFieldsResult = await scopedClusterClient.asCurrentUser.search({
        index: params.path.id,
        ...runtimeFieldsSearchBody,
      });

      return {
        status: 'success',
        simulationError: null,
        documentsWithRuntimeFieldsApplied: runtimeFieldsResult.hits.hits
          .map((hit) => {
            if (!hit.fields) {
              return {};
            }
            return Object.keys(hit.fields).reduce<Record<string, unknown>>((acc, field) => {
              acc[field] = hit.fields![field][0];
              return acc;
            }, {});
          })
          .filter((doc) => Object.keys(doc).length > 0),
      };
    } catch (e) {
      if (e instanceof DefinitionNotFound) {
        throw notFound(e);
      }

      throw internal(e);
    }
  },
});
