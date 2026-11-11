/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type { EntityInventoryRouteRepository } from '@kbn/entity-inventory-plugin/server';
import type { DefaultClientOptions } from '@kbn/server-route-repository-client';
import { createRepositoryClient } from '@kbn/server-route-repository-client';
import type { EntityInventoryApiClient } from './client';

/** Client over the entity inventory `types` and `_list` routes of the server plugin. */
export const createHttpEntityInventoryApiClient = (http: HttpStart): EntityInventoryApiClient => {
  const { fetch } = createRepositoryClient<EntityInventoryRouteRepository, DefaultClientOptions>({
    http,
  });

  return {
    getTypes: ({ signal }) => fetch('GET /internal/entity_inventory/types', { signal }),
    getEntities: (type, request, { signal }) =>
      fetch('POST /internal/entity_inventory/entities/{type}/_list', {
        params: { path: { type }, body: request },
        signal,
      }),
  };
};
