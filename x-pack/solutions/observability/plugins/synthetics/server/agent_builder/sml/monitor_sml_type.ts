/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SmlTypeDefinition } from '@kbn/agent-context-layer-plugin/server';
import type { SavedObject } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/logging';
import {
  MONITOR_MANAGEMENT_ATTACHMENT_TYPE,
  MONITOR_SML_TYPE,
} from '../../../common/agent_builder';
import {
  legacySyntheticsMonitorTypeSingle,
  syntheticsMonitorSavedObjectType,
  syntheticsMonitorSOTypes,
} from '../../../common/types/saved_objects';
import { ConfigKey } from '../../../common/runtime_types';
import { MonitorTypeEnum } from '../../../common/runtime_types/monitor_management/monitor_configs';
import type { EncryptedSyntheticsMonitorAttributes } from '../../../common/runtime_types';
import {
  fetchMonitorAttachmentData,
  type ResolvedMonitorSavedObjectType,
} from '../internal/monitor_attachment_data';

/**
 * SML chunk permission strings keyed by saved object type.
 *
 * AND-semantics in `SmlService.search` mean each chunk must list **every**
 * permission its viewer needs. Mixing the two SO type permissions on a
 * single chunk would silently hide it from users who only have the
 * appropriate one — see `00-cross-cutting-decisions.md`. Hence one chunk
 * per SO type per monitor.
 */
const PERMISSIONS_BY_SO_TYPE: Record<ResolvedMonitorSavedObjectType, readonly string[]> = {
  [syntheticsMonitorSavedObjectType]: [`saved_object:${syntheticsMonitorSavedObjectType}/get`],
  [legacySyntheticsMonitorTypeSingle]: [`saved_object:${legacySyntheticsMonitorTypeSingle}/get`],
};

/**
 * The fields we read off a monitor SO to build SML chunk content. Typed as
 * a narrow record (rather than `EncryptedSyntheticsMonitorAttributes`,
 * which is a **union** of HTTP/TCP/ICMP/Browser variants) because the
 * variants don't share a common subtype that includes `URLS` — and by the
 * time these helpers run the caller has already narrowed via the
 * discriminator (`attributes[ConfigKey.MONITOR_TYPE] === 'http'`). The
 * read-side projection keeps the helpers cheap and unit-testable.
 */
interface MonitorChunkFields {
  [ConfigKey.NAME]?: string;
  [ConfigKey.MONITOR_TYPE]?: string;
  [ConfigKey.URLS]?: string;
  [ConfigKey.TAGS]?: string[];
  [ConfigKey.LOCATIONS]?: Array<{ id: string; label?: string }>;
}

/**
 * Build the searchable text indexed for one monitor. Aimed at BM25 +
 * semantic search relevance — keep it terse and free of secrets.
 *
 * Order: name first (highest BM25 weight via prefix), then identifying
 * fields the user might mention in chat (URL, type, tags, location names).
 */
const toMonitorSearchContent = (attributes: MonitorChunkFields): string => {
  const lines: Array<string | undefined> = [
    attributes[ConfigKey.NAME],
    attributes[ConfigKey.MONITOR_TYPE],
    attributes[ConfigKey.URLS],
  ];

  for (const tag of attributes[ConfigKey.TAGS] ?? []) {
    lines.push(tag);
  }

  for (const location of attributes[ConfigKey.LOCATIONS] ?? []) {
    lines.push(location.label || location.id);
  }

  return lines.filter((line): line is string => Boolean(line && line.trim())).join('\n');
};

/** Fall-back chunk title when a monitor is somehow saved without a name. */
const toMonitorChunkTitle = (attributes: MonitorChunkFields, fallbackId: string): string => {
  const name = attributes[ConfigKey.NAME];
  if (name && name.trim()) {
    return name;
  }
  return fallbackId;
};

interface CreateMonitorSmlTypeOptions {
  /**
   * Plugin-level logger used by hooks that don't receive an `SmlContext`
   * (notably `toAttachment`, whose context only carries the user's
   * `request`, `savedObjectsClient`, and `spaceId`).
   */
  logger: Logger;
}

/**
 * SML type definition for Synthetics monitors.
 *
 * Wiring expectations (T5):
 * - Registered with Agent Builder behind both the experimental flag and
 *   the optional-`agentBuilder` plugin guard from `bind_on_setup.ts`.
 * - Indexed by the Agent Builder crawler at `fetchFrequency()` cadence.
 * - Search hits are filtered at runtime by the chunk's `permissions[]`,
 *   so users only see monitors they can read via the `<so-type>/get` SO
 *   privilege.
 *
 * Notes vs. dashboard_agent reference:
 * - We use `bulkGet` against both the current and legacy SO types instead
 *   of a domain client (`MonitorConfigRepository.get` is constructor-bound
 *   to an encrypted client we deliberately don't pass into the SML hooks).
 * - We emit a single chunk per monitor; the chunk's `permissions[]` matches
 *   the SO type the monitor was actually resolved from. Legacy
 *   (`synthetics-monitor`) and current (`synthetics-monitor-multi-space`)
 *   monitors never share a chunk — keeps the SML AND-semantics clean.
 */
export const createMonitorSmlType = ({
  logger,
}: CreateMonitorSmlTypeOptions): SmlTypeDefinition => ({
  id: MONITOR_SML_TYPE,
  fetchFrequency: () => '5m',

  async *list(context) {
    for (const soType of syntheticsMonitorSOTypes) {
      const finder =
        context.savedObjectsClient.createPointInTimeFinder<EncryptedSyntheticsMonitorAttributes>({
          type: soType,
          perPage: 1000,
          namespaces: ['*'],
          // Mirror `MonitorConfigRepository.getAll`'s pattern. We only need
          // SO meta (`id`, `updated_at`, `namespaces`) to populate
          // `SmlListItem`. `fields: [type]` keeps the page payload small
          // and lets the indexer short-circuit if a future filter slips
          // past us.
          fields: [ConfigKey.MONITOR_TYPE],
        });

      try {
        for await (const response of finder.find()) {
          const items = response.saved_objects.map(
            (savedObject: SavedObject<EncryptedSyntheticsMonitorAttributes>) => ({
              id: savedObject.id,
              updatedAt: savedObject.updated_at ?? new Date().toISOString(),
              spaces: savedObject.namespaces ?? [],
            })
          );
          if (items.length > 0) {
            yield items;
          }
        }
      } finally {
        await finder.close();
      }
    }
  },

  getSmlData: async (originId, context) => {
    try {
      const { saved_objects: savedObjects } =
        await context.savedObjectsClient.bulkGet<EncryptedSyntheticsMonitorAttributes>([
          { type: syntheticsMonitorSavedObjectType, id: originId },
          { type: legacySyntheticsMonitorTypeSingle, id: originId },
        ]);

      const resolved = savedObjects.find((obj) => Boolean(obj?.attributes));
      if (!resolved) {
        // Returning `undefined` tells the indexer to drop any prior chunks
        // for this origin — same handling as a deleted monitor.
        return undefined;
      }

      if (resolved.attributes[ConfigKey.MONITOR_TYPE] !== MonitorTypeEnum.HTTP) {
        // v1 scope: HTTP monitors only.
        return undefined;
      }

      const soType = resolved.type as ResolvedMonitorSavedObjectType;
      // Discriminator-checked above (`MONITOR_TYPE === 'http'`), but the
      // SO union doesn't carry `URLS` on every variant — narrow via the
      // read-side projection.
      const httpAttributes = resolved.attributes as MonitorChunkFields;
      return {
        chunks: [
          {
            type: MONITOR_SML_TYPE,
            title: toMonitorChunkTitle(httpAttributes, originId),
            content: toMonitorSearchContent(httpAttributes),
            permissions: [...PERMISSIONS_BY_SO_TYPE[soType]],
          },
        ],
      };
    } catch (error) {
      context.logger.warn(
        `monitor_management sml.getSmlData: failed for '${originId}': ${(error as Error).message}`
      );
      return undefined;
    }
  },

  toAttachment: async (item, context) => {
    const fetched = await fetchMonitorAttachmentData({
      soClient: context.savedObjectsClient,
      configId: item.origin_id,
      logger,
      context: 'sml.toAttachment',
    });

    if (!fetched) {
      return undefined;
    }

    return {
      type: MONITOR_MANAGEMENT_ATTACHMENT_TYPE,
      data: fetched.data,
      origin: item.origin_id,
    };
  },
});
