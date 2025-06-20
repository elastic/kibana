/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, Plugin } from '@kbn/core/server';

const READ_ONLY_TYPE = 'read_only_type';
const NON_READ_ONLY_TYPE = 'non_read_only_type';

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
          description: { type: 'text' },
        },
      },
    });

    core.savedObjects.registerType({
      name: NON_READ_ONLY_TYPE,
      hidden: false,
      namespaceType: 'multiple-isolated',
      mappings: {
        dynamic: false,
        properties: {
          description: { type: 'text' },
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
        validate: {
          body: schema.object({
            type: schema.maybe(
              schema.oneOf([schema.literal(READ_ONLY_TYPE), schema.literal(NON_READ_ONLY_TYPE)])
            ),
            isReadOnly: schema.maybe(schema.boolean()),
          }),
        },
      },
      async (context, request, response) => {
        const soClient = (await context.core).savedObjects.getClient();
        const objType = request.body.type || READ_ONLY_TYPE;
        const { isReadOnly } = request.body;
        try {
          await soClient.create(
            objType,
            {
              description: 'test',
            },
            {
              ...(isReadOnly ? { accessControl: { accessMode: 'read_only' } } : {}),
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
        validate: {
          body: schema.object({
            type: schema.oneOf([
              schema.literal(READ_ONLY_TYPE),
              schema.literal(NON_READ_ONLY_TYPE),
            ]),
            objectId: schema.string(),
          }),
        },
      },
      async (context, request, response) => {
        const soClient = (await context.core).savedObjects.client;
        try {
          const objectType = request.body.type || READ_ONLY_TYPE;
          const result = await soClient.update(objectType, request.body.objectId, {
            attributes: {
              description: 'updated description',
            },
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
