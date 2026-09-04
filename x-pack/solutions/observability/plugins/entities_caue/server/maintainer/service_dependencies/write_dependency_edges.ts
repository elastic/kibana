/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityUpdateClient } from '@kbn/entity-store/server';
import type { Logger } from '@kbn/core/server';
import type { ResolvedServiceDependency } from './resolve_downstream_services';

/**
 * Writes entity.relationships.depends_on.ids and .raw_identifiers.service.name
 * onto each source service entity document.
 *
 * These fields are declared with `collectValues` + `allowAPIUpdate: true`
 * (entity_store/common/domain/definitions/common_fields.ts:182-197), so:
 * - No `force: true` is required (unlike managed health fields)
 * - The write is a union-merge accumulation — edges added here stay until the
 *   entity document is deleted
 *
 * 404 / document_missing_exception are expected for services not yet extracted;
 * they are logged at debug level only.
 */
export const writeDependencyEdges = async ({
  crudClient,
  resolved,
  logger,
}: {
  crudClient: EntityUpdateClient;
  resolved: Map<string, ResolvedServiceDependency>;
  logger: Logger;
}): Promise<{ succeededEntityIds: Set<string>; failed: number }> => {
  const succeededEntityIds = new Set<string>();
  let failed = 0;

  if (resolved.size === 0) return { succeededEntityIds, failed };

  const objects = [...resolved.entries()].map(([sourceService, { resources }]) => {
    // Flatten per-resource targets into a deduplicated list of service EUIDs for the
    // entity doc. The per-resource correspondence is preserved in the metadata data stream
    // (write_relationship_metadata.ts); raw_identifiers stays a flat list of all resources.
    const targets = [...new Set(resources.flatMap((r) => r.targets))];
    const resourceNames = resources.map((r) => r.resource);

    return {
      type: 'service' as const,
      doc: {
        entity: {
          // Service EUID = `service:${service.name}` (singleField identity)
          id: `service:${sourceService}`,
          relationships: {
            depends_on: {
              ids: targets,
              raw_identifiers: {
                // raw_identifiers stores the exit span destination resource strings.
                // The field is keyed as 'service.name' (flat ECS style) per the
                // ENTITY_RELATIONSHIP_IDENTIFIER_FIELDS declaration in common_fields.ts.
                'service.name': resourceNames,
              },
            },
          },
        },
      },
    };
  });

  // entity.relationships.depends_on.ids uses collectValues + allowAPIUpdate: true
  // so force: false is correct here (unlike health fields which use managedValue)
  const errors = await crudClient.bulkUpdateEntity({ objects, force: false });

  const errored = new Set(errors.map((e) => e._id));

  for (const [sourceService] of resolved.entries()) {
    const expectedId = `service:${sourceService}`;
    if (!errored.has(expectedId)) {
      succeededEntityIds.add(expectedId);
    }
  }

  for (const err of errors) {
    if (err.status === 404 || err.type === 'document_missing_exception') {
      logger.debug(`[service-dependencies] Entity not yet extracted (expected): ${err._id}`);
    } else {
      logger.warn(
        `[service-dependencies] Failed to update entity ${err._id}: ${err.reason} (status ${err.status})`
      );
      failed++;
    }
  }

  return { succeededEntityIds, failed };
};
