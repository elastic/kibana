/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, CoreSetup } from '@kbn/core/server';
import type { EntityStoreStartContract } from '@kbn/entity-store/server';
import {
  SERVICE_METADATA_EVENT_ACTION,
  type ServiceUserMetadataDoc,
} from '../../common/service_metadata';

// Hardcoded to match the entities-latest-default index used by the ES|QL query.
// TODO: make space-aware by reading the active space from context.
const NAMESPACE = 'default';

const PARAM_SCHEMA = {
  params: schema.object({
    entityId: schema.string({ maxLength: 1000 }),
  }),
};

const BODY_SCHEMA = schema.object({
  owner: schema.maybe(schema.string({ maxLength: 200 })),
  tier: schema.maybe(
    schema.oneOf([
      schema.literal('critical'),
      schema.literal('standard'),
      schema.literal('internal'),
    ])
  ),
  runbook_url: schema.maybe(schema.string({ maxLength: 500 })),
  notes: schema.maybe(schema.string({ maxLength: 2000 })),
});

export const registerServiceMetadataRoutes = ({
  router,
  getStartServices,
}: {
  router: IRouter;
  getStartServices: CoreSetup['getStartServices'];
}) => {
  // GET — read the latest user metadata for a service entity
  router.get(
    {
      path: '/internal/entities_caue/service/{entityId}/metadata',
      validate: PARAM_SCHEMA,
      security: {
        authz: { enabled: false, reason: 'Entity metadata read inherits ES privileges' },
      },
    },
    async (ctx, req, res) => {
      const { entityId } = req.params;
      const [coreStart, startDeps] = await getStartServices();
      const { entityStore } = startDeps as { entityStore: EntityStoreStartContract };

      const esClient = coreStart.elasticsearch.client.asScoped(req).asCurrentUser;
      const metadataClient = entityStore.createEntityMetadataClient(esClient, NAMESPACE);

      const doc = await metadataClient.getLatestByEntityId<ServiceUserMetadataDoc>({
        entityId,
        eventAction: SERVICE_METADATA_EVENT_ACTION,
      });

      if (!doc) {
        return res.ok({ body: { found: false, metadata: null } });
      }

      const { owner, tier, runbook_url, notes } = doc;
      return res.ok({ body: { found: true, metadata: { owner, tier, runbook_url, notes } } });
    }
  );

  // POST — append a new user metadata doc for a service entity
  router.post(
    {
      path: '/internal/entities_caue/service/{entityId}/metadata',
      validate: {
        ...PARAM_SCHEMA,
        body: BODY_SCHEMA,
      },
      security: {
        authz: { enabled: false, reason: 'Entity metadata write uses internal ES client' },
      },
    },
    async (ctx, req, res) => {
      const { entityId } = req.params;
      const [coreStart, startDeps] = await getStartServices();
      const { entityStore } = startDeps as { entityStore: EntityStoreStartContract };

      // Write with internal user: end users don't hold data stream write privileges
      const esClient = coreStart.elasticsearch.client.asInternalUser;
      const metadataClient = entityStore.createEntityMetadataClient(esClient, NAMESPACE);

      const doc: ServiceUserMetadataDoc = {
        '@timestamp': new Date().toISOString(),
        'event.kind': 'event',
        'event.action': SERVICE_METADATA_EVENT_ACTION,
        'entity.id': entityId,
        ...req.body,
      };

      const result = await metadataClient.bulkAppendMetadata([doc]);

      if (result.failed > 0) {
        return res.customError({
          statusCode: 500,
          body: { message: `Failed to save metadata: ${result.failed} document(s) dropped` },
        });
      }

      return res.ok({ body: { saved: true } });
    }
  );
};
