/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { PLUGIN_ID, ROUTE_VERSIONS, PLAYGROUND_SAVED_OBJECT_TYPE } from '../../common';

import {
  APIRoutes,
  DefineRoutesOptions,
  PlaygroundListResponse,
  PlaygroundResponse,
  PlaygroundSavedObject,
} from '../types';
import { errorHandler } from '../utils/error_handler';
import { parsePlaygroundSO, parsePlaygroundSOList, validatePlayground } from '../utils/playgrounds';
import { playgroundAttributesSchema } from '../playground_saved_object/schema/v1/v1';

export const defineSavedPlaygroundRoutes = ({ logger, router }: DefineRoutesOptions) => {
  router.versioned
    .get({
      access: 'internal',
      path: APIRoutes.GET_PLAYGROUNDS,
      security: {
        authz: {
          requiredPrivileges: [PLUGIN_ID],
        },
      },
    })
    .addVersion(
      {
        security: {
          authz: {
            requiredPrivileges: [PLUGIN_ID],
          },
        },
        validate: {
          request: {
            query: schema.object({
              page: schema.number({ defaultValue: 1, min: 1 }),
              size: schema.number({ defaultValue: 10, min: 1, max: 1000 }),
              sortField: schema.string({
                defaultValue: 'updated_at',
              }),
              sortOrder: schema.oneOf([schema.literal('desc'), schema.literal('asc')], {
                defaultValue: 'desc',
              }),
            }),
          },
        },
        version: ROUTE_VERSIONS.v1,
      },
      errorHandler(logger)(async (context, request, response) => {
        const soClient = (await context.core).savedObjects.client;
        const soPlaygrounds = await soClient.find<PlaygroundSavedObject>({
          type: PLAYGROUND_SAVED_OBJECT_TYPE,
          perPage: request.query.size,
          page: request.query.page,
          sortField: request.query.sortField,
          sortOrder: request.query.sortOrder,
        });
        const body: PlaygroundListResponse = parsePlaygroundSOList(soPlaygrounds);
        return response.ok({
          body,
          headers: { 'content-type': 'application/json' },
        });
      })
    );
  router.versioned
    .get({
      access: 'internal',
      path: APIRoutes.GET_PLAYGROUND,
      security: {
        authz: {
          requiredPrivileges: [PLUGIN_ID],
        },
      },
    })
    .addVersion(
      {
        security: {
          authz: {
            requiredPrivileges: [PLUGIN_ID],
          },
        },
        validate: {
          request: {
            params: schema.object({
              id: schema.string(),
            }),
          },
        },
        version: ROUTE_VERSIONS.v1,
      },
      errorHandler(logger)(async (context, request, response) => {
        const soClient = (await context.core).savedObjects.client;
        const soPlayground = await soClient.get<PlaygroundSavedObject>(
          PLAYGROUND_SAVED_OBJECT_TYPE,
          request.params.id
        );
        if (soPlayground.error) {
          if (soPlayground.error.statusCode === 404) {
            return response.notFound({
              body: {
                message: i18n.translate('xpack.searchPlayground.savedPlaygrounds.notFoundError', {
                  defaultMessage: '{id} playground not found',
                  values: { id: request.params.id },
                }),
              },
            });
          }
          logger.error(
            i18n.translate('xpack.searchPlayground.savedPlaygrounds.getSOError', {
              defaultMessage: 'SavedObject error getting search playground {id}',
              values: { id: request.params.id },
            })
          );
          return response.customError({
            statusCode: soPlayground.error.statusCode,
            body: {
              message: soPlayground.error.message,
              attributes: {
                error: soPlayground.error.error,
                ...(soPlayground.error.metadata ?? {}),
              },
            },
          });
        }
        const responseBody: PlaygroundResponse = parsePlaygroundSO(soPlayground);
        return response.ok({
          body: responseBody,
          headers: { 'content-type': 'application/json' },
        });
      })
    );
  // Create
  router.versioned
    .put({
      access: 'internal',
      path: APIRoutes.PUT_PLAYGROUND_CREATE,
      security: {
        authz: {
          requiredPrivileges: [PLUGIN_ID],
        },
      },
    })
    .addVersion(
      {
        security: {
          authz: {
            requiredPrivileges: [PLUGIN_ID],
          },
        },
        version: ROUTE_VERSIONS.v1,
        validate: {
          request: {
            body: playgroundAttributesSchema,
          },
        },
      },
      errorHandler(logger)(async (context, request, response) => {
        // Validate playground request
        const playground = request.body;
        const validationErrors = validatePlayground(playground);
        if (validationErrors && validationErrors.length > 0) {
          return response.badRequest({
            body: {
              message: i18n.translate('xpack.searchPlayground.savedPlaygrounds.validationError', {
                defaultMessage: 'Invalid playground request',
              }),
              attributes: {
                errors: validationErrors,
              },
            },
          });
        }
        const soClient = (await context.core).savedObjects.client;
        const soPlayground = await soClient.create<PlaygroundSavedObject>(
          PLAYGROUND_SAVED_OBJECT_TYPE,
          playground
        );
        if (soPlayground.error) {
          return response.customError({
            statusCode: soPlayground.error.statusCode,
            body: {
              message: soPlayground.error.message,
              attributes: {
                error: soPlayground.error.error,
                ...(soPlayground.error.metadata ?? {}),
              },
            },
          });
        }
        const responseBody: PlaygroundResponse = parsePlaygroundSO(soPlayground);

        return response.ok({
          body: responseBody,
          headers: { 'content-type': 'application/json' },
        });
      })
    );

  // Update
  router.versioned
    .put({
      access: 'internal',
      path: APIRoutes.PUT_PLAYGROUND_UPDATE,
      security: {
        authz: {
          requiredPrivileges: [PLUGIN_ID],
        },
      },
    })
    .addVersion(
      {
        security: {
          authz: {
            requiredPrivileges: [PLUGIN_ID],
          },
        },
        version: ROUTE_VERSIONS.v1,
        validate: {
          request: {
            params: schema.object({
              id: schema.string(),
            }),
            body: playgroundAttributesSchema,
          },
        },
      },
      errorHandler(logger)(async (context, request, response) => {
        const playground = request.body;
        const validationErrors = validatePlayground(playground);
        if (validationErrors && validationErrors.length > 0) {
          return response.badRequest({
            body: {
              message: i18n.translate('xpack.searchPlayground.savedPlaygrounds.validationError', {
                defaultMessage: 'Invalid playground request',
              }),
              attributes: {
                errors: validationErrors,
              },
            },
          });
        }
        const soClient = (await context.core).savedObjects.client;
        const soPlayground = await soClient.update<PlaygroundSavedObject>(
          PLAYGROUND_SAVED_OBJECT_TYPE,
          request.params.id,
          playground
        );
        if (soPlayground.error) {
          return response.customError({
            statusCode: soPlayground.error.statusCode,
            body: {
              message: soPlayground.error.message,
              attributes: {
                error: soPlayground.error.error,
                ...(soPlayground.error.metadata ?? {}),
              },
            },
          });
        }
        return response.ok();
      })
    );

  // Delete
  router.versioned
    .delete({
      access: 'internal',
      path: APIRoutes.DELETE_PLAYGROUND,
      security: {
        authz: {
          requiredPrivileges: [PLUGIN_ID],
        },
      },
    })
    .addVersion(
      {
        security: {
          authz: {
            requiredPrivileges: [PLUGIN_ID],
          },
        },
        version: ROUTE_VERSIONS.v1,
        validate: {
          request: {
            params: schema.object({
              id: schema.string(),
            }),
          },
        },
      },
      errorHandler(logger)(async (context, request, response) => {
        const soClient = (await context.core).savedObjects.client;
        await soClient.delete(PLAYGROUND_SAVED_OBJECT_TYPE, request.params.id);
        return response.ok();
      })
    );
};
