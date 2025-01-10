/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createInventoryServerRoute } from '../create_inventory_server_route';

export const getEntityDefinitionSourceIndexPatternsByType = createInventoryServerRoute({
  endpoint: 'GET /internal/inventory/entity/definitions/sources',
  options: {
    tags: ['access:inventory'],
  },
  async handler({ context, request, plugins }) {
    const [_coreContext, entityManagerStart] = await Promise.all([
      context.core,
      plugins.entityManager.start(),
    ]);
    const entityManagerClient = await entityManagerStart.getScopedClient({ request });

    const entityDefinitionsSource = await entityManagerClient.v2.readSourceDefinitions({});

    const allEntityDefinitionIndexPatterns = entityDefinitionsSource.map((source) => ({
      [source.type_id]: [
        ...new Set(
          entityDefinitionsSource
            .filter((sourceToFilter) => sourceToFilter.type_id === source.type_id)
            .flatMap((filteredSource) => filteredSource.index_patterns)
        ),
      ],
    }));

    return {
      definitionIndexPatterns: {
        ...Object.fromEntries(
          Array.from(new Set(allEntityDefinitionIndexPatterns)).flatMap(Object.entries)
        ),
      },
    };
  },
});

export const entityDefinitionsRoutes = {
  ...getEntityDefinitionSourceIndexPatternsByType,
};
