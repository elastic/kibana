/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin } from '@kbn/core/server';

const READ_ONLY_TYPE = 'read_only_type';

export class ReadOnlyObjectsPlugin implements Plugin {
  public setup(core: CoreSetup) {
    core.savedObjects.registerType({
      name: READ_ONLY_TYPE,
      hidden: false,
      namespaceType: 'multiple-isolated',
      supportsAccessControl: true,
      mappings: {
        dynamic: false,
        properties: {
          description: { type: 'text', dynamic: false },
        },
      },
    });

    const router = core.http.createRouter();

    router.post(
      {
        path: '/read_only_objects/create',
        security: {
          authz: {
            enabled: false,
            reason: 'This route is opted out from authorization',
          },
        },
        validate: false,
      },
      async (context, request, response) => {
        const soClient = (await context.core).savedObjects.getClient();
        const currentUser = (await context.core).security?.authc.getCurrentUser();
        console.log({ currentUser, soClient });
        try {
          await soClient.create(
            READ_ONLY_TYPE,
            {
              description: 'test',
            },
            {
              accessControl: {
                owner: currentUser?.username!,
                accessMode: 'read_only',
              },
            }
          );
          return response.ok({
            body: 'test',
          });
        } catch (error) {
          return response.badRequest({
            body: error.message,
          });
        }
      }
    );
    router.get(
      {
        path: '/read_only_objects/get',
        security: {
          authz: {
            enabled: false,
            reason: 'This route is opted out from authorization',
          },
        },
        validate: false,
      },
      async (context, request, response) => {
        const soClient = (await context.core).savedObjects.client;
        const result = await soClient.find({
          type: READ_ONLY_TYPE,
        });

        return response.ok({
          body: result,
        });
      }
    );
    router.put(
      {
        path: '/read_only_objects/update',
        security: {
          authz: {
            enabled: false,
            reason: 'This route is opted out from authorization',
          },
        },
        validate: false,
      },
      async (context, request, response) => {
        const soClient = (await context.core).savedObjects.client;
        try {
          const result = await soClient.update(READ_ONLY_TYPE, 'some_id', {
            attributes: {},
          });
          return response.ok({
            body: result,
          });
        } catch (error) {
          return response.badRequest({
            body: error.message,
          });
        }
      }
    );
  }
  public start() {}
}
