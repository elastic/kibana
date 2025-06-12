/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createInventoryServerRoute } from '../create_inventory_server_route';
import { extractEntityIndexPatternsFromDefinitions } from './extract_entity_index_patterns_from_definitions';

export const getEntityDefinitionSourceIndexPatternsByType = createInventoryServerRoute({
  endpoint: 'GET /internal/inventory/entity/definitions/sources',
  security: {
    authz: {
      requiredPrivileges: ['inventory'],
    },
  },
  async handler({ context, request, plugins }) {
    const [_coreContext, entityManagerStart] = await Promise.all([
      context.core,
      plugins.entityManager.start(),
    ]);
    const entityManagerClient = await entityManagerStart.getScopedClient({ request });

    const entityDefinitionsSource = await entityManagerClient.v2.readSourceDefinitions({});

    return {
      definitionIndexPatterns: extractEntityIndexPatternsFromDefinitions(entityDefinitionsSource),
    };
  },
});

export const entityDefinitionsRoutes = {
  ...getEntityDefinitionSourceIndexPatternsByType,
};
