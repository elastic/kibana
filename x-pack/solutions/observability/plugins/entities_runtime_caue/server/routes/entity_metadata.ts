/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, CoreSetup } from '@kbn/core/server';
import { metadataIndexName } from '../../common/build_entity_query';
import { getMetadataFields } from '../lib/metadata_fields';

const PARAMS = schema.object({
  definitionId: schema.string({ maxLength: 256 }),
  entityId: schema.string({ maxLength: 2000 }),
});

export const registerEntityMetadataRoutes = ({
  router,
  getStartServices,
}: {
  router: IRouter;
  getStartServices: CoreSetup['getStartServices'];
}) => {
  // GET — list user-authored metadata fields available for filtering
  router.get(
    {
      path: '/internal/entities_runtime_caue/definitions/{definitionId}/metadata_fields',
      validate: {
        params: schema.object({ definitionId: schema.string({ maxLength: 256 }) }),
      },
      security: { authz: { enabled: false, reason: 'Read uses asInternalUser on internal index' } },
    },
    async (_ctx, req, res) => {
      const { definitionId } = req.params;
      const [coreStart] = await getStartServices();
      const esClient = coreStart.elasticsearch.client.asInternalUser;
      const fields = await getMetadataFields(esClient, definitionId);
      return res.ok({ body: { fields } });
    }
  );

  // GET — read all metadata fields for one entity from the lookup index
  router.get(
    {
      path: '/internal/entities_runtime_caue/definitions/{definitionId}/entities/{entityId}/metadata',
      validate: { params: PARAMS },
      security: { authz: { enabled: false, reason: 'Read uses asInternalUser on internal index' } },
    },
    async (_ctx, req, res) => {
      const { definitionId, entityId } = req.params;
      const [coreStart] = await getStartServices();
      const esClient = coreStart.elasticsearch.client.asInternalUser;
      const index = metadataIndexName(definitionId);

      try {
        const doc = await esClient.get({ index, id: entityId });
        // Remove internal fields; return everything else as metadata
        const {
          'entity.id': _id,
          first_seen: _fs,
          ...metadata
        } = (doc._source ?? {}) as Record<string, unknown>;
        return res.ok({ body: { metadata } });
      } catch (err: unknown) {
        const status = (err as { meta?: { statusCode?: number } })?.meta?.statusCode;
        if (status === 404) {
          return res.ok({ body: { metadata: {} } });
        }
        throw err;
      }
    }
  );

  // POST — partial-update metadata for one entity (preserves first_seen and other fields)
  router.post(
    {
      path: '/internal/entities_runtime_caue/definitions/{definitionId}/entities/{entityId}/metadata',
      validate: {
        params: PARAMS,
        body: schema.object({
          // Array of key/value rows so each can be bounded individually
          metadata: schema.arrayOf(
            schema.object({
              key: schema.string({ minLength: 1, maxLength: 256 }),
              value: schema.string({ maxLength: 4096 }),
            }),
            { maxSize: 50 }
          ),
        }),
      },
      security: {
        authz: { enabled: false, reason: 'Write uses asInternalUser on internal index' },
      },
    },
    async (_ctx, req, res) => {
      const { definitionId, entityId } = req.params;
      const { metadata } = req.body;

      const [coreStart] = await getStartServices();
      const esClient = coreStart.elasticsearch.client.asInternalUser;
      const index = metadataIndexName(definitionId);

      // Convert the array to a flat object for the partial update
      const doc: Record<string, string> = {};
      for (const { key, value } of metadata) {
        doc[key] = value;
      }

      // doc_as_upsert: entity must be discovered first (first_seen must already exist)
      await esClient.update({
        index,
        id: entityId,
        doc,
        refresh: true,
      });

      return res.ok({ body: { saved: true } });
    }
  );
};
