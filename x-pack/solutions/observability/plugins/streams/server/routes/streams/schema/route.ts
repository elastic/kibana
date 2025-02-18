/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import { getFlattenedObject } from '@kbn/std';
import {
  RecursiveRecord,
  fieldDefinitionConfigSchema,
  isWiredStreamDefinition,
} from '@kbn/streams-schema';
import { checkAccess } from '../../../lib/streams/stream_crud';
import { createServerRoute } from '../../create_server_route';
import { DefinitionNotFoundError } from '../../../lib/streams/errors/definition_not_found_error';

const UNMAPPED_SAMPLE_SIZE = 500;

export const unmappedFieldsRoute = createServerRoute({
  endpoint: 'GET /api/streams/{name}/schema/unmapped_fields',
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
    path: z.object({ name: z.string() }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<{ unmappedFields: string[] }> => {
    const { scopedClusterClient, streamsClient } = await getScopedClients({ request });

    const searchBody = {
      sort: [
        {
          '@timestamp': {
            order: 'desc',
          },
        },
      ],
      size: UNMAPPED_SAMPLE_SIZE,
    };

    const [streamDefinition, ancestors, results] = await Promise.all([
      streamsClient.getStream(params.path.name),
      streamsClient.getAncestors(params.path.name),
      scopedClusterClient.asCurrentUser.search({
        index: params.path.name,
        ...searchBody,
      }),
    ]);

    const sourceFields = new Set<string>();

    results.hits.hits.forEach((hit) => {
      Object.keys(getFlattenedObject(hit._source as Record<string, unknown>)).forEach((field) => {
        sourceFields.add(field);
      });
    });

    // Mapped fields from the stream's definition and inherited from ancestors
    const mappedFields = new Set<string>();

    if (isWiredStreamDefinition(streamDefinition)) {
      Object.keys(streamDefinition.ingest.wired.fields).forEach((name) => mappedFields.add(name));
    }

    for (const ancestor of ancestors) {
      Object.keys(ancestor.ingest.wired.fields).forEach((name) => mappedFields.add(name));
    }

    const unmappedFields = Array.from(sourceFields)
      .filter((field) => !mappedFields.has(field))
      .sort();

    return { unmappedFields };
  },
});

const FIELD_SIMILATION_SAMPLE_SIZE = 200;

export const schemaFieldsSimulationRoute = createServerRoute({
  endpoint: 'POST /api/streams/{name}/schema/fields_simulation',
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
    path: z.object({ name: z.string() }),
    body: z.object({
      field_definitions: z.array(
        z.intersection(fieldDefinitionConfigSchema, z.object({ name: z.string() }))
      ),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
  }): Promise<{
    status: 'unknown' | 'success' | 'failure';
    simulationError: string | null;
    documentsWithRuntimeFieldsApplied: RecursiveRecord[] | null;
  }> => {
    const { scopedClusterClient } = await getScopedClients({ request });

    const { read } = await checkAccess({ name: params.path.name, scopedClusterClient });

    if (!read) {
      throw new DefinitionNotFoundError(`Stream definition for ${params.path.name} not found.`);
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
      size: FIELD_SIMILATION_SAMPLE_SIZE,
    };

    const sampleResults = await scopedClusterClient.asCurrentUser.search({
      index: params.path.name,
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
        {
          type: field.type,
          ...(field.format ? { format: field.format } : {}),
        },
      ])
    );

    const fieldDefinitionKeys = Object.keys(propertiesForSimulation);

    const sampleResultsAsSimulationDocs = sampleResults.hits.hits.map((hit) => ({
      _index: params.path.name,
      _id: hit._id,
      _source: Object.fromEntries(
        Object.entries(getFlattenedObject(hit._source as RecursiveRecord)).filter(
          ([k]) => fieldDefinitionKeys.includes(k) || k === '@timestamp'
        )
      ),
    }));

    const simulationBody = {
      docs: sampleResultsAsSimulationDocs,
      component_template_substitutions: {
        [`${params.path.name}@stream.layer`]: {
          template: {
            mappings: {
              dynamic: 'strict',
              properties: propertiesForSimulation,
            },
          },
        },
      },
      // prevent double-processing
      pipeline_substitutions: {
        [`${params.path.name}@stream.processing`]: {
          processors: [],
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
      size: FIELD_SIMILATION_SAMPLE_SIZE,
      fields: params.body.field_definitions.map((field) => field.name),
      _source: false,
    };

    // This gives us a "fields" representation rather than _source from the simulation
    const runtimeFieldsResult = await scopedClusterClient.asCurrentUser.search({
      index: params.path.name,
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
          return Object.keys(hit.fields).reduce<RecursiveRecord>((acc, field) => {
            acc[field] = hit.fields![field][0];
            return acc;
          }, {});
        })
        .filter((doc) => Object.keys(doc).length > 0),
    };
  },
});

export const schemaRoutes = {
  ...unmappedFieldsRoute,
  ...schemaFieldsSimulationRoute,
};
