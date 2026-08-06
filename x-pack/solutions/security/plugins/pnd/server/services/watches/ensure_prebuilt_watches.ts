/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { stringifyWorkflowDefinition } from '@kbn/workflows-yaml';
import {
  getCatalogYaml,
  PREBUILT_WATCH_CATALOG,
  PREBUILT_WATCH_IDS,
  type PrebuiltWatchId,
} from './prebuilt_watch_catalog';
import {
  parseWorkflowYaml,
  structuralFingerprint,
} from './watch_settings_write';
import type { WatchWorkflowsManagementClient } from './watch_workflows_management_client';

/**
 * POC: first-visit seed. Creates missing user-owned pre-built watches.
 * Known gaps (do not "fix"): soft-delete tombstones block re-seed (409);
 * workflow ids are globally unique across spaces.
 */
export const ensurePrebuiltWatches = async ({
  management,
  spaceId,
  request,
  logger,
}: {
  management: WatchWorkflowsManagementClient;
  spaceId: string;
  request: KibanaRequest;
  logger: Logger;
}): Promise<{ created: PrebuiltWatchId[]; existed: PrebuiltWatchId[]; failed: PrebuiltWatchId[] }> => {
  const created: PrebuiltWatchId[] = [];
  const existed: PrebuiltWatchId[] = [];
  const failed: PrebuiltWatchId[] = [];

  for (const id of PREBUILT_WATCH_IDS) {
    const existing = await management.getWorkflow(id, spaceId);
    if (existing) {
      // Migrate legacy POC structuralHash (raw JSON) to short sha256 hex.
      const prov = existing.definition?.consts?.watch_provenance as
        | Record<string, unknown>
        | undefined;
      const hash = typeof prov?.structuralHash === 'string' ? prov.structuralHash : '';
      if (hash && !/^[a-f0-9]{64}$/.test(hash) && existing.yaml) {
        try {
          const def = parseWorkflowYaml(existing.yaml);
          def.consts = {
            ...def.consts,
            watch_provenance: {
              originSeedId: id,
              seedContentVersion:
                typeof prov?.seedContentVersion === 'number' ? prov.seedContentVersion : 1,
              structuralHash: structuralFingerprint(def),
            },
          };
          await management.updateWorkflow(
            id,
            {
              yaml: stringifyWorkflowDefinition(def as unknown as Record<string, unknown>),
              enabled: existing.enabled,
            },
            spaceId,
            request
          );
          logger.info(`POC re-stamped structuralHash for ${id}`);
        } catch (error) {
          logger.warn(
            `POC structuralHash re-stamp failed for ${id}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
      existed.push(id);
      continue;
    }

    const entry = PREBUILT_WATCH_CATALOG[id];
    // Stamp structuralHash against the YAML we are about to create so later
    // apply_update can detect definition-body edits without false conflicts
    // from engine YAML rewrite on create.
    const def = parseWorkflowYaml(getCatalogYaml(id, entry.version));
    def.consts = {
      ...def.consts,
      watch_provenance: {
        ...(typeof def.consts?.watch_provenance === 'object' && def.consts.watch_provenance
          ? (def.consts.watch_provenance as Record<string, unknown>)
          : {}),
        originSeedId: id,
        seedContentVersion: entry.version,
        structuralHash: structuralFingerprint(def),
      },
    };
    const yaml = stringifyWorkflowDefinition(def as unknown as Record<string, unknown>);

    try {
      const createdWorkflow = await management.createWorkflow({ id, yaml }, spaceId, request);
      // Create path has been observed to return enabled:false despite YAML enabled:true.
      if (createdWorkflow.enabled !== true) {
        await management.updateWorkflow(id, { enabled: true }, spaceId, request);
      }

      // Re-stamp structuralHash from the persisted definition (post-engine normalize).
      const persisted = await management.getWorkflow(id, spaceId);
      if (persisted?.definition) {
        const persistedYaml =
          persisted.yaml ??
          stringifyWorkflowDefinition(persisted.definition as unknown as Record<string, unknown>);
        const persistedDef = parseWorkflowYaml(persistedYaml);
        const hash = structuralFingerprint(persistedDef);
        persistedDef.consts = {
          ...persistedDef.consts,
          watch_provenance: {
            originSeedId: id,
            seedContentVersion: entry.version,
            structuralHash: hash,
          },
        };
        await management.updateWorkflow(
          id,
          {
            yaml: stringifyWorkflowDefinition(
              persistedDef as unknown as Record<string, unknown>
            ),
            enabled: true,
          },
          spaceId,
          request
        );
      }

      created.push(id);
      logger.info(`POC pre-built watch seeded: ${id} v${entry.version}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Conflict usually means soft-deleted tombstone still owns the id.
      if (/already exists|conflict|409/i.test(message)) {
        logger.warn(
          `POC pre-built watch "${id}" could not be seeded (likely soft-deleted tombstone): ${message}`
        );
        existed.push(id);
      } else {
        logger.error(`POC pre-built watch seed failed for "${id}": ${message}`);
        failed.push(id);
      }
    }
  }

  return { created, existed, failed };
};
