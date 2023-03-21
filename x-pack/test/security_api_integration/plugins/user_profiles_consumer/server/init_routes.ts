/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { PluginStartDependencies } from '.';

export function initRoutes(core: CoreSetup<PluginStartDependencies>) {
  const router = core.http.createRouter();
  router.post(
    {
      path: '/internal/user_profiles_consumer/_suggest',
      validate: {
        body: schema.object({
          name: schema.maybe(schema.string()),
          dataPath: schema.maybe(schema.string()),
          hint: schema.maybe(
            schema.object({
              uids: schema.arrayOf(schema.string()),
            })
          ),
          size: schema.maybe(schema.number()),
          requiredAppPrivileges: schema.maybe(schema.arrayOf(schema.string())),
        }),
      },
    },
    async (context, request, response) => {
      const [, pluginDeps] = await core.getStartServices();
      const profiles = await pluginDeps.security.userProfiles.suggest({
        name: request.body.name,
        dataPath: request.body.dataPath,
        hint: request.body.hint,
        size: request.body.size,
        requiredPrivileges: request.body.requiredAppPrivileges
          ? {
              spaceId: pluginDeps.spaces.spacesService.getSpaceId(request),
              privileges: {
                kibana: request.body.requiredAppPrivileges.map((appPrivilege) =>
                  pluginDeps.security.authz.actions.app.get(appPrivilege)
                ),
              },
            }
          : undefined,
      });
      return response.ok({ body: profiles });
    }
  );
}
