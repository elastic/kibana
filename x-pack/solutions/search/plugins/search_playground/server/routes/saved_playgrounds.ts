/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import {
  PLUGIN_ID,
  ROUTE_VERSIONS,
  PLAYGROUND_SAVED_OBJECT_TYPE,
  PLAYGROUND_PRIVILEGES,
} from '../../common';

import {
  APIRoutes,
  DefineRoutesOptions,
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
          requiredPrivileges: [PLUGIN_ID, PLAYGROUND_PRIVILEGES.read],
        },
      },
    })
    .addVersion(
      {
        security: {
          authz: {
            requiredPrivileges: [PLUGIN_ID, PLAYGROUND_PRIVILEGES.read],
          },
        },
        validate: {
          request: {
            query: schema.object({
              page: schema.number({ defaultValue: 1, min: 1 }),
              size: schema.number({ defaultValue: 10, min: 1, max: 1000 }),
              sortField: schema.string({
                defaultValue: 'created_at',
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
        try {
          const soClient = (await context.core).savedObjects.client;
          const soPlaygrounds = await soClient.find<PlaygroundSavedObject>({
            type: PLAYGROUND_SAVED_OBJECT_TYPE,
            perPage: request.query.size,
            page: request.query.page,
            sortField: request.query.sortField,
            sortOrder: request.query.sortOrder,
          });
          const body = parsePlaygroundSOList(soPlaygrounds);
          return response.ok({
            body,
            headers: { 'content-type': 'application/json' },
          });
        } catch (error) {
          logger.error(
            i18n.translate('xpack.searchPlayground.savedPlaygrounds.listError', {
              defaultMessage: 'Error listing saved playgrounds',
            })
          );
          throw error;
        }
      })
    );
  router.versioned
    .get({
      access: 'internal',
      path: APIRoutes.GET_PLAYGROUND,
      security: {
        authz: {
          requiredPrivileges: [PLUGIN_ID, PLAYGROUND_PRIVILEGES.read],
        },
      },
    })
    .addVersion(
      {
        security: {
          authz: {
            requiredPrivileges: [PLUGIN_ID, PLAYGROUND_PRIVILEGES.read],
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
        let responseBody: PlaygroundResponse;
        try {
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
          responseBody = parsePlaygroundSO(soPlayground);
          return response.ok({
            body: responseBody,
            headers: { 'content-type': 'application/json' },
          });
        } catch (e) {
          if (e?.output?.statusCode === 404) {
            return response.notFound({
              body: {
                message: i18n.translate('xpack.searchPlayground.savedPlaygrounds.notFoundError', {
                  defaultMessage: '{id} playground not found',
                  values: { id: request.params.id },
                }),
              },
            });
          }
          const errorMsg = i18n.translate('xpack.searchPlayground.savedPlaygrounds.getError', {
            defaultMessage: 'Error getting search playground {id}',
            values: { id: request.params.id },
          });
          logger.error(errorMsg);
          if (e.output?.statusCode && typeof e.output.statusCode === 'number') {
            logger.error(e);
            return response.customError({
              statusCode: e.output.statusCode,
              body: {
                message: e?.message ?? errorMsg,
              },
            });
          }
          throw e;
        }
      })
    );
  // Create
  router.versioned
    .put({
      access: 'internal',
      path: APIRoutes.PUT_PLAYGROUND_CREATE,
      security: {
        authz: {
          requiredPrivileges: [PLUGIN_ID, PLAYGROUND_PRIVILEGES.create],
        },
      },
    })
    .addVersion(
      {
        security: {
          authz: {
            requiredPrivileges: [PLUGIN_ID, PLAYGROUND_PRIVILEGES.create],
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
        let responseBody: PlaygroundResponse;
        try {
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
          responseBody = parsePlaygroundSO(soPlayground);
        } catch (error) {
          logger.error(
            i18n.translate('xpack.searchPlayground.savedPlaygrounds.createError', {
              defaultMessage: 'Error creating search playground',
            })
          );
          throw error;
        }

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
          requiredPrivileges: [PLUGIN_ID, PLAYGROUND_PRIVILEGES.update],
        },
      },
    })
    .addVersion(
      {
        security: {
          authz: {
            requiredPrivileges: [PLUGIN_ID, PLAYGROUND_PRIVILEGES.update],
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
        try {
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
        } catch (e) {
          if (e?.output?.statusCode === 404) {
            return response.notFound({
              body: {
                message: i18n.translate('xpack.searchPlayground.savedPlaygrounds.notFoundError', {
                  defaultMessage: '{id} playground not found',
                  values: { id: request.params.id },
                }),
              },
            });
          }
          const errorMsg = i18n.translate('xpack.searchPlayground.savedPlaygrounds.updateError', {
            defaultMessage: 'Error updating search playground {id}',
            values: { id: request.params.id },
          });
          logger.error(errorMsg);
          if (e.output?.statusCode && typeof e.output.statusCode === 'number') {
            logger.error(e);
            return response.customError({
              statusCode: e.output.statusCode,
              body: {
                message: e?.message ?? errorMsg,
              },
            });
          }
          throw e;
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
          requiredPrivileges: [PLUGIN_ID, PLAYGROUND_PRIVILEGES.delete],
        },
      },
    })
    .addVersion(
      {
        security: {
          authz: {
            requiredPrivileges: [PLUGIN_ID, PLAYGROUND_PRIVILEGES.delete],
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
        try {
          const soClient = (await context.core).savedObjects.client;
          await soClient.delete(PLAYGROUND_SAVED_OBJECT_TYPE, request.params.id);
        } catch (e) {
          if (e?.output?.statusCode === 404) {
            return response.notFound({
              body: {
                message: i18n.translate('xpack.searchPlayground.savedPlaygrounds.notFoundError', {
                  defaultMessage: '{id} playground not found',
                  values: { id: request.params.id },
                }),
              },
            });
          }
          const errorMsg = i18n.translate('xpack.searchPlayground.savedPlaygrounds.deleteError', {
            defaultMessage: 'Error deleting search playground {id}',
            values: { id: request.params.id },
          });
          logger.error(errorMsg);
          logger.error(e);
          if (e.output?.statusCode && typeof e.output.statusCode === 'number') {
            return response.customError({
              statusCode: e.output.statusCode,
              body: {
                message: e?.message ?? errorMsg,
              },
            });
          }
          return response.customError({
            statusCode: 500,
            body: {
              message: e?.message ?? errorMsg,
            },
          });
        }
        return response.ok();
      })
    );
};
