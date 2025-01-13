/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../plugin';

const roleMappingBaseSchema = {
  rules: schema.recordOf(schema.string(), schema.string()),
  roleType: schema.string(),
  engines: schema.arrayOf(schema.string()),
  accessAllEngines: schema.boolean(),
};

export function registerEnableRoleMappingsRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.post(
    {
      path: '/internal/app_search/role_mappings/enable_role_based_access',
      validate: false,
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/role_mappings/enable_role_based_access',
    })
  );
}

export function registerRoleMappingsRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/internal/app_search/role_mappings',
      validate: false,
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/role_mappings',
    })
  );

  router.post(
    {
      path: '/internal/app_search/role_mappings',
      validate: {
        body: schema.object(roleMappingBaseSchema),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/role_mappings',
    })
  );
}

export function registerRoleMappingRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.put(
    {
      path: '/internal/app_search/role_mappings/{id}',
      validate: {
        body: schema.object(roleMappingBaseSchema),
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/role_mappings/:id',
    })
  );

  router.delete(
    {
      path: '/internal/app_search/role_mappings/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/role_mappings/:id',
    })
  );
}

export function registerUserRoute({ router, enterpriseSearchRequestHandler }: RouteDependencies) {
  router.post(
    {
      path: '/internal/app_search/single_user_role_mapping',
      validate: {
        body: schema.object({
          roleMapping: schema.object({
            engines: schema.arrayOf(schema.string()),
            roleType: schema.string(),
            accessAllEngines: schema.boolean(),
            id: schema.maybe(schema.string()),
          }),
          elasticsearchUser: schema.object({
            username: schema.string(),
            email: schema.string(),
          }),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/role_mappings/upsert_single_user_role_mapping',
    })
  );
}

export const registerRoleMappingsRoutes = (dependencies: RouteDependencies) => {
  registerEnableRoleMappingsRoute(dependencies);
  registerRoleMappingsRoute(dependencies);
  registerRoleMappingRoute(dependencies);
  registerUserRoute(dependencies);
};
