/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, CoreSetup } from '@kbn/core/server';
import { ENTITY_DEFINITION_SO_TYPE } from '../../common/constants';
import { entityDefinitionAttributesSchema } from '../../common/entity_definition';
import type { EntityDefinition, EntityDefinitionAttributes } from '../../common/entity_definition';
import { ensureMetadataIndex, deleteMetadataIndex } from '../lib/metadata_index';
import { validateIndexPattern } from '../lib/validate_index_pattern';

export const registerDefinitionRoutes = ({
  router,
  getStartServices,
}: {
  router: IRouter;
  getStartServices: CoreSetup['getStartServices'];
}) => {
  // GET all definitions
  router.get(
    {
      path: '/internal/entities_runtime_caue/definitions',
      validate: false,
      security: { authz: { enabled: false, reason: 'Scoped by saved objects client' } },
    },
    async (ctx, _req, res) => {
      const { savedObjects } = await ctx.core;
      const soClient = savedObjects.getClient({
        includedHiddenTypes: [ENTITY_DEFINITION_SO_TYPE],
      });
      const result = await soClient.find<EntityDefinitionAttributes>({
        type: ENTITY_DEFINITION_SO_TYPE,
        perPage: 100,
      });
      const definitions: EntityDefinition[] = result.saved_objects.map((so) => ({
        id: so.id,
        ...so.attributes,
      }));
      return res.ok({ body: { definitions } });
    }
  );

  // POST create definition
  router.post(
    {
      path: '/internal/entities_runtime_caue/definitions',
      validate: { body: entityDefinitionAttributesSchema },
      security: { authz: { enabled: false, reason: 'Scoped by saved objects client' } },
    },
    async (ctx, req, res) => {
      const validationError = validateIndexPattern(req.body.indexPattern);
      if (validationError) {
        return res.badRequest({ body: { message: validationError } });
      }

      const { savedObjects } = await ctx.core;
      const soClient = savedObjects.getClient({
        includedHiddenTypes: [ENTITY_DEFINITION_SO_TYPE],
      });
      const so = await soClient.create<EntityDefinitionAttributes>(
        ENTITY_DEFINITION_SO_TYPE,
        req.body
      );

      // Create the per-definition lookup index (op can fail if already exists — ensureMetadataIndex handles it)
      const [coreStart] = await getStartServices();
      await ensureMetadataIndex(coreStart.elasticsearch.client.asInternalUser, so.id).catch(
        () => undefined // non-fatal: discovery route re-creates if missing
      );

      const definition: EntityDefinition = { id: so.id, ...so.attributes };
      return res.ok({ body: { definition } });
    }
  );

  // DELETE definition
  router.delete(
    {
      path: '/internal/entities_runtime_caue/definitions/{id}',
      validate: {
        params: schema.object({ id: schema.string({ maxLength: 256 }) }),
      },
      security: { authz: { enabled: false, reason: 'Scoped by saved objects client' } },
    },
    async (ctx, req, res) => {
      const { id } = req.params;
      const { savedObjects } = await ctx.core;
      const soClient = savedObjects.getClient({
        includedHiddenTypes: [ENTITY_DEFINITION_SO_TYPE],
      });
      await soClient.delete(ENTITY_DEFINITION_SO_TYPE, id);

      // Delete the lookup index
      const [coreStart] = await getStartServices();
      await deleteMetadataIndex(coreStart.elasticsearch.client.asInternalUser, id).catch(
        () => undefined
      );

      return res.ok({ body: { deleted: true } });
    }
  );
};
