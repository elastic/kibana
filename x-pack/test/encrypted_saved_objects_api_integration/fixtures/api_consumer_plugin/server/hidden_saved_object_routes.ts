/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IRouter, CoreSetup } from '@kbn/core/server';
import { PluginsSetup, PluginsStart } from '.';

export function registerHiddenSORoutes(
  router: IRouter,
  core: CoreSetup<PluginsStart>,
  deps: PluginsSetup,
  hiddenTypes: string[]
) {
  router.get(
    {
      path: '/api/hidden_saved_objects/get-decrypted-as-internal-user/{type}/{id}',
      validate: { params: (value) => ({ value }) },
    },
    async (context, request, response) => {
      const [, { encryptedSavedObjects }] = await core.getStartServices();
      const spaceId = deps.spaces.spacesService.getSpaceId(request);
      const namespace = deps.spaces.spacesService.spaceIdToNamespace(spaceId);
      try {
        return response.ok({
          body: await encryptedSavedObjects
            .getClient({
              includedHiddenTypes: [request.params.type],
            })
            .getDecryptedAsInternalUser(request.params.type, request.params.id, { namespace }),
        });
      } catch (err) {
        if (encryptedSavedObjects.isEncryptionError(err)) {
          return response.badRequest({ body: 'Failed to encrypt attributes' });
        }

        return response.customError({ body: err, statusCode: 500 });
      }
    }
  );

  router.get(
    {
      path: '/api/hidden_saved_objects/_find',
      validate: {
        query: schema.object({
          per_page: schema.number({ min: 0, defaultValue: 20 }),
          page: schema.number({ min: 0, defaultValue: 1 }),
          type: schema.oneOf([schema.string(), schema.arrayOf(schema.string())]),
          search: schema.maybe(schema.string()),
          default_search_operator: schema.oneOf([schema.literal('OR'), schema.literal('AND')], {
            defaultValue: 'OR',
          }),
          search_fields: schema.maybe(
            schema.oneOf([schema.string(), schema.arrayOf(schema.string())])
          ),
          sort_field: schema.maybe(schema.string()),
          has_reference: schema.maybe(
            schema.object({
              type: schema.string(),
              id: schema.string(),
            })
          ),
          fields: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
          filter: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      const query = request.query;
      const [{ savedObjects }] = await core.getStartServices();
      return response.ok({
        body: await savedObjects
          .getScopedClient(request, { includedHiddenTypes: hiddenTypes })
          .find({
            perPage: query.per_page,
            page: query.page,
            type: Array.isArray(query.type) ? query.type : [query.type],
            search: query.search,
            defaultSearchOperator: query.default_search_operator,
            searchFields:
              typeof query.search_fields === 'string' ? [query.search_fields] : query.search_fields,
            sortField: query.sort_field,
            hasReference: query.has_reference,
            fields: typeof query.fields === 'string' ? [query.fields] : query.fields,
            filter: query.filter,
          }),
      });
    }
  );

  router.get(
    {
      path: '/api/hidden_saved_objects/{type}/{id}',
      validate: { params: (value) => ({ value }) },
    },
    async (context, request, response) => {
      const [{ savedObjects }] = await core.getStartServices();
      return response.ok({
        body: await savedObjects
          .getScopedClient(request, { includedHiddenTypes: hiddenTypes })
          .get(request.params.type, request.params.id),
      });
    }
  );
  router.post(
    {
      path: '/api/hidden_saved_objects/{type}',
      validate: {
        params: schema.object({
          type: schema.string(),
          id: schema.maybe(schema.string()),
        }),
        query: schema.object({
          overwrite: schema.boolean({ defaultValue: false }),
        }),
        body: schema.object({
          attributes: schema.recordOf(schema.string(), schema.any()),
          migrationVersion: schema.maybe(schema.recordOf(schema.string(), schema.string())),
          references: schema.maybe(
            schema.arrayOf(
              schema.object({
                name: schema.string(),
                type: schema.string(),
                id: schema.string(),
              })
            )
          ),
        }),
      },
    },
    async (context, request, response) => {
      const [{ savedObjects }] = await core.getStartServices();
      const { type, id } = request.params;
      const { attributes, migrationVersion, references } = request.body as any;
      const options = { id, migrationVersion, references };
      const so = await savedObjects
        .getScopedClient(request, { includedHiddenTypes: hiddenTypes })
        .create(type, attributes, options);
      return response.ok({
        body: so,
      });
    }
  );
  router.put(
    {
      path: '/api/hidden_saved_objects/{type}/{id}',
      validate: {
        params: schema.object({
          type: schema.string(),
          id: schema.string(),
        }),
        body: schema.object({
          attributes: schema.recordOf(schema.string(), schema.any()),
          version: schema.maybe(schema.string()),
          references: schema.maybe(
            schema.arrayOf(
              schema.object({
                name: schema.string(),
                type: schema.string(),
                id: schema.string(),
              })
            )
          ),
        }),
      },
    },
    async (context, request, response) => {
      const [{ savedObjects }] = await core.getStartServices();
      const { type, id } = request.params as any;
      const { attributes, version, references } = request.body as any;
      const options = { version, references };
      return response.ok({
        body: await savedObjects
          .getScopedClient(request, { includedHiddenTypes: hiddenTypes })
          .update(type, id, attributes, options),
      });
    }
  );
  router.post(
    {
      path: '/api/hidden_saved_objects/_bulk_get',
      validate: {
        body: schema.arrayOf(
          schema.object({
            type: schema.string(),
            id: schema.string(),
            fields: schema.maybe(schema.arrayOf(schema.string())),
          })
        ),
      },
    },
    async (context, request, response) => {
      const [{ savedObjects }] = await core.getStartServices();
      return response.ok({
        body: await savedObjects
          .getScopedClient(request, { includedHiddenTypes: hiddenTypes })
          .bulkGet(request.body as any),
      });
    }
  );
  router.post(
    {
      path: '/api/hidden_saved_objects/_bulk_create',
      validate: {
        body: schema.arrayOf(
          schema.object({
            type: schema.string(),
            id: schema.maybe(schema.string()),
            attributes: schema.recordOf(schema.string(), schema.any()),
            version: schema.maybe(schema.string()),
            migrationVersion: schema.maybe(schema.recordOf(schema.string(), schema.string())),
            references: schema.maybe(
              schema.arrayOf(
                schema.object({
                  name: schema.string(),
                  type: schema.string(),
                  id: schema.string(),
                })
              )
            ),
          })
        ),
      },
    },
    async (context, request, response) => {
      const [{ savedObjects }] = await core.getStartServices();
      return response.ok({
        body: await savedObjects
          .getScopedClient(request, { includedHiddenTypes: hiddenTypes })
          .bulkCreate(request.body as any),
      });
    }
  );
}
