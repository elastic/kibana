/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { createInventoryServerRoute } from '../create_inventory_server_route';

export const getEntityDefinitionSourceIndexPatternsByType = createInventoryServerRoute({
  endpoint: 'GET /internal/inventory/entity/definitions/sources',
  params: t.type({
    query: t.type({
      types: t.string,
    }),
  }),
  options: {
    tags: ['access:inventory'],
  },
  async handler({ context, params, request, plugins }) {
    const [_coreContext, entityManagerStart] = await Promise.all([
      context.core,
      plugins.entityManager.start(),
    ]);
    const { types } = params.query;
    const entityManagerClient = await entityManagerStart.getScopedClient({ request });

    const entityDefinitionIndexPatterns = await Promise.all(
      types.split(',').map(async (type) => {
        const entityDefinitionsSource = await entityManagerClient.v2.readSourceDefinitions({
          type,
        });
        return entityDefinitionsSource.reduce(
          (acc, { ['type_id']: typeId, index_patterns: indexPatterns }) => (
            (acc[typeId] = indexPatterns), acc
          ),
          {} as Record<string, string[]>
        );
      })
    );

    return {
      definitionIndexPatterns: {
        ...Object.fromEntries(entityDefinitionIndexPatterns.flatMap(Object.entries)),
      },
    };
  },
});

export const entityDefinitionsRoutes = {
  ...getEntityDefinitionSourceIndexPatternsByType,
};
