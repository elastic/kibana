/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, CoreSetup, Logger } from '@kbn/core/server';
import { ENTITY_DEFINITION_SO_TYPE } from '../../common/constants';
import type { MetadataFilter } from '../../common/metadata_filter';
import type { EntityDefinitionAttributes, EntityDefinition } from '../../common/entity_definition';
import { discoverEntities } from '../lib/discover_entities';

export const registerEntitiesRoutes = ({
  router,
  getStartServices,
  logger,
}: {
  router: IRouter;
  getStartServices: CoreSetup['getStartServices'];
  logger: Logger;
}) => {
  router.post(
    {
      path: '/internal/entities_runtime_caue/definitions/{id}/_entities',
      validate: {
        params: schema.object({ id: schema.string({ maxLength: 256 }) }),
        body: schema.object({
          start: schema.string({ maxLength: 64 }),
          end: schema.string({ maxLength: 64 }),
          // ES Query DSL filter produced from KQL on the client — open shape, bounded by HTTP body size
          filter: schema.maybe(schema.any()),
          // Structured metadata filters applied as a post-JOIN WHERE in the discovery query
          metadataFilters: schema.maybe(
            schema.arrayOf(
              schema.object({
                field: schema.string({ minLength: 1, maxLength: 256 }),
                // Validated as a bounded string; narrowed to MetadataFilterOperator via cast below
                operator: schema.string({ minLength: 1, maxLength: 32 }),
                value: schema.maybe(schema.string({ maxLength: 1024 })),
              }),
              { maxSize: 10 }
            )
          ),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'ES reads use asCurrentUser; writes asInternalUser',
        },
      },
    },
    async (ctx, req, res) => {
      const { id } = req.params;
      const { start, end, filter } = req.body;
      // The schema validates operator is a string; cast to the narrower union type.
      const metadataFilters = req.body.metadataFilters as MetadataFilter[] | undefined;

      const { savedObjects } = await ctx.core;
      const soClient = savedObjects.getClient({
        includedHiddenTypes: [ENTITY_DEFINITION_SO_TYPE],
      });

      let so;
      try {
        so = await soClient.get<EntityDefinitionAttributes>(ENTITY_DEFINITION_SO_TYPE, id);
      } catch (err) {
        return res.notFound({ body: { message: `Definition ${id} not found` } });
      }

      const definition: EntityDefinition = { id: so.id, ...so.attributes };

      const [coreStart] = await getStartServices();
      const esClientCurrent = coreStart.elasticsearch.client.asScoped(req).asCurrentUser;
      const esClientInternal = coreStart.elasticsearch.client.asInternalUser;

      let result;
      try {
        result = await discoverEntities({
          definition,
          start,
          end,
          filter,
          metadataFilters,
          esClientCurrent,
          esClientInternal,
          logger,
        });
      } catch (err: unknown) {
        const msg = (err as Error).message ?? String(err);
        logger.error(`[entities_runtime_caue] discoverEntities threw: ${msg}`);
        return res.customError({ statusCode: 500, body: { message: msg } });
      }

      if (!Array.isArray(result)) {
        // Typed error from discoverEntities (e.g. unknown metadata field)
        return res.badRequest({
          body: { message: `Unknown metadata field: ${result.field}` },
        });
      }

      return res.ok({ body: { entities: result, definitionId: id } });
    }
  );
};
