/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import { getIdentityFields } from '@kbn/entity-store/common';
import type { EntityStoreStartContract } from '@kbn/entity-store/server';
import { createClassicAlertMatcher } from '../alerts/classic_matcher';
import type { AlertMatchResult } from '../alerts/types';
import { InventoryDefinitionError } from '../inventory/generator';
import { listEntities } from '../inventory/list_entities';

const DEFAULT_SPACE_ID = 'default';
const MAX_WINDOW_MINUTES = 3 * 24 * 60;

const PROOF_OF_CONCEPT_AUTHZ = {
  enabled: false,
  reason:
    'Proof of concept. Every query runs as the requesting user, so Elasticsearch privileges apply.',
} as const;

const countMatchedAlerts = ({ alertIdsByEntity }: AlertMatchResult): number =>
  new Set([...alertIdsByEntity.values()].flatMap((alertIds) => [...alertIds])).size;

/** Internal routes of the alerts-by-entity proof of concept. */
export const registerPocRoutes = ({
  router,
  getEntityStore,
}: {
  router: IRouter;
  getEntityStore: () => Promise<EntityStoreStartContract>;
}): void => {
  router.get(
    {
      path: '/internal/entity_inventory/poc/definitions',
      security: { authz: PROOF_OF_CONCEPT_AUTHZ },
      validate: false,
      options: { access: 'internal' },
    },
    async (_context, _request, response) => {
      const definitions = await (await getEntityStore())
        .getEntityDefinitionsClientForSpace(DEFAULT_SPACE_ID)
        .list();

      return response.ok({
        body: {
          definitions: definitions.map(({ type, name, identityField, dynamic }) => ({
            type,
            name,
            identityFields: getIdentityFields(identityField),
            sources: dynamic?.sources.map(({ indexPattern }) => indexPattern) ?? [],
          })),
        },
      });
    }
  );

  router.get(
    {
      path: '/internal/entity_inventory/poc/entities',
      security: { authz: PROOF_OF_CONCEPT_AUTHZ },
      validate: {
        query: schema.object({
          type: schema.string({ minLength: 1, maxLength: 64 }),
          windowMinutes: schema.number({ min: 1, max: MAX_WINDOW_MINUTES, defaultValue: 60 }),
          ruleTag: schema.maybe(schema.string({ minLength: 1, maxLength: 128 })),
          limit: schema.number({ min: 1, max: 1000, defaultValue: 100 }),
        }),
      },
      options: { access: 'internal' },
    },
    async (context, request, response) => {
      const { type, windowMinutes, ruleTag, limit } = request.query;
      const definition = await (await getEntityStore())
        .getEntityDefinitionsClientForSpace(DEFAULT_SPACE_ID)
        .get(type);
      if (!definition) {
        return response.notFound({ body: { message: `Entity type "${type}" is not registered` } });
      }

      const { client } = (await context.core).elasticsearch;
      const esClient = client.asCurrentUser;
      const to = new Date();
      const window = {
        from: new Date(to.getTime() - windowMinutes * 60 * 1000).toISOString(),
        to: to.toISOString(),
      };

      try {
        const entities = await listEntities({ esClient, definition, window, limit: 10000 });
        const classic = await createClassicAlertMatcher({ esClient, ruleTag }).match({
          type,
          entities,
        });

        return response.ok({
          body: {
            type,
            window,
            entityCount: entities.length,
            coverage: {
              classic: {
                activeAlerts: classic.activeAlerts,
                matchedAlerts: countMatchedAlerts(classic),
              },
            },
            entities: entities.slice(0, limit).map((entity) => ({
              ...entity,
              alerts: {
                classic: classic.alertIdsByEntity.get(String(entity['entity.id']))?.size ?? 0,
              },
            })),
          },
        });
      } catch (error) {
        if (error instanceof InventoryDefinitionError) {
          return response.badRequest({ body: { message: error.message } });
        }
        throw error;
      }
    }
  );
};
