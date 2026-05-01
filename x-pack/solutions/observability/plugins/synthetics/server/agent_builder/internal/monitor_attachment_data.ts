/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/logging';
import type { MonitorAttachmentData } from '../../../common/agent_builder';
import { monitorAttachmentDataSchema } from '../../../common/agent_builder';
import {
  legacySyntheticsMonitorTypeSingle,
  syntheticsMonitorSavedObjectType,
} from '../../../common/types/saved_objects';
import { MonitorTypeEnum } from '../../../common/runtime_types/monitor_management/monitor_configs';
import type { EncryptedSyntheticsMonitorAttributes } from '../../../common/runtime_types';
import { ConfigKey } from '../../../common/runtime_types';
import { mapSavedObjectToMonitor } from '../../routes/monitor_cruds/formatters/saved_object_to_monitor';

/**
 * Either of the two saved object types that can back a Synthetics monitor.
 *
 * - `synthetics-monitor-multi-space` — current type
 * - `synthetics-monitor` — legacy single-namespace type
 *
 * Surfacing the resolved type lets callers attach the right SML chunk
 * permission string (`saved_object:<so-type>/get`) without coupling them to
 * the constants directly.
 */
export type ResolvedMonitorSavedObjectType =
  | typeof syntheticsMonitorSavedObjectType
  | typeof legacySyntheticsMonitorTypeSingle;

/**
 * Outcome of {@link fetchMonitorAttachmentData}. `undefined` is returned when
 * either no SO matched the id, or the SO matched but is **not** an HTTP
 * monitor (v1 scope).
 */
export interface FetchedMonitorAttachmentData {
  /** Schema-projected attachment data ready to feed to the attachment type. */
  data: MonitorAttachmentData;
  /** SO type the monitor was resolved from — drives chunk permission string. */
  soType: ResolvedMonitorSavedObjectType;
  /** SO meta `updated_at`, mirrored at the data level too — exposed here so callers don't re-bulkGet for `isStale`. */
  updatedAt?: string;
  /** Raw SO meta — useful for tests and for richer formatters that don't want to round-trip through Zod. */
  savedObject: SavedObject<EncryptedSyntheticsMonitorAttributes>;
}

/**
 * Look up a Synthetics monitor by `config_id` using the request-scoped
 * saved objects client and project it into the attachment-data shape used by
 * `MONITOR_MANAGEMENT_ATTACHMENT_TYPE`.
 *
 * Behaviour:
 * - Issues a `bulkGet` over both the current and legacy SO types (mirrors
 *   `MonitorConfigRepository.get`) so a single helper covers both reads.
 * - Filters out non-HTTP monitors — v1 of monitor management is HTTP only;
 *   TCP/ICMP/Browser come later via discriminated-union widening of the
 *   attachment schema.
 * - Strips secrets and any non-attachment-schema keys via
 *   `monitorAttachmentDataSchema.safeParse`. This is the only path through
 *   which monitor attribute data reaches the conversation index, so the
 *   parse step doubles as a defense-in-depth check that no encrypted
 *   field accidentally leaks.
 *
 * Errors are logged at `warn` (expected: not found, schema mismatch from a
 * legacy/partially-migrated monitor) — not thrown — and surface as
 * `undefined`. This mirrors the dashboard_agent attachment type's
 * `resolve()` policy.
 */
export const fetchMonitorAttachmentData = async ({
  soClient,
  configId,
  logger,
  context,
}: {
  soClient: SavedObjectsClientContract;
  configId: string;
  logger: Logger;
  /** Free-form context label used in warn logs (e.g. `'sml.toAttachment'`, `'attachment.resolve'`). */
  context: string;
}): Promise<FetchedMonitorAttachmentData | undefined> => {
  const { saved_objects: savedObjects } =
    await soClient.bulkGet<EncryptedSyntheticsMonitorAttributes>([
      { type: syntheticsMonitorSavedObjectType, id: configId },
      { type: legacySyntheticsMonitorTypeSingle, id: configId },
    ]);

  const resolved = savedObjects.find((obj) => Boolean(obj?.attributes));
  if (!resolved) {
    logger.warn(
      `monitor_management ${context}: no monitor found for config_id='${configId}' in either current or legacy SO type`
    );
    return undefined;
  }

  if (resolved.attributes[ConfigKey.MONITOR_TYPE] !== MonitorTypeEnum.HTTP) {
    // v1 scope: HTTP monitors only. Other types (tcp/icmp/browser) cannot
    // currently round-trip through `monitorAttachmentDataSchema` — bail
    // silently rather than warn so non-HTTP indexings stay quiet.
    return undefined;
  }

  const formatted = mapSavedObjectToMonitor({
    monitor: resolved,
    internal: true,
  }) as Record<string, unknown>;

  const parsed = monitorAttachmentDataSchema.safeParse(formatted);
  if (!parsed.success) {
    logger.warn(
      `monitor_management ${context}: monitor '${configId}' (type=${resolved.type}) failed attachment-schema parse — ${parsed.error.message}`
    );
    return undefined;
  }

  return {
    data: parsed.data,
    soType: resolved.type as ResolvedMonitorSavedObjectType,
    updatedAt: resolved.updated_at,
    savedObject: resolved,
  };
};
