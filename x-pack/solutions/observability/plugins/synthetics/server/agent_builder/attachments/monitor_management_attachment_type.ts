/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { Logger } from '@kbn/logging';
import {
  MONITOR_MANAGEMENT_ATTACHMENT_TYPE,
  monitorAttachmentDataSchema,
  type MonitorAttachmentData,
} from '../../../common/agent_builder';
import { ConfigKey } from '../../../common/runtime_types';
import { SourceType } from '../../../common/runtime_types/monitor_management/monitor_configs';
import { fetchMonitorAttachmentData } from '../internal/monitor_attachment_data';

interface CreateMonitorManagementAttachmentTypeOptions {
  logger: Logger;
}

/**
 * Status badge values surfaced in the inline card and the LLM
 * representation. Mirrors the four states the UI inline card renders
 * (`proposed` / `enabled` / `disabled` / `cli-managed`) — see brief §B and
 * `00-architecture.md`.
 */
type MonitorAttachmentStatus = 'proposed' | 'enabled' | 'disabled' | 'cli-managed';

const getMonitorStatus = (data: MonitorAttachmentData): MonitorAttachmentStatus => {
  // Project-origin monitors are CLI-managed — UI/agent edits are forbidden,
  // and the canvas Save button is replaced with a "Edit via CLI" link.
  if (data[ConfigKey.MONITOR_SOURCE_TYPE] === SourceType.PROJECT) {
    return 'cli-managed';
  }
  // No `config_id` ⇒ this is a draft the agent has composed via
  // `manage_synthetics_monitor` but the user has not yet saved.
  if (!data[ConfigKey.CONFIG_ID]) {
    return 'proposed';
  }
  return data[ConfigKey.ENABLED] ? 'enabled' : 'disabled';
};

/**
 * Render a plain-text summary of the monitor for the LLM prompt. We
 * deliberately avoid leaking encrypted secrets — the schema has already
 * stripped them on parse, but we keep the projection list explicit so
 * future fields default to "not exposed unless added here".
 */
const formatMonitorRepresentation = (attachmentId: string, data: MonitorAttachmentData): string => {
  const status = getMonitorStatus(data);
  const schedule = data[ConfigKey.SCHEDULE];
  const locationsCount = data[ConfigKey.LOCATIONS]?.length ?? 0;
  const tags = data[ConfigKey.TAGS] ?? [];

  const lines: string[] = [
    `Synthetics monitor "${
      data[ConfigKey.NAME]
    }" (monitorAttachment.id: "${attachmentId}", status: ${status}, type: ${
      data[ConfigKey.MONITOR_TYPE]
    })`,
    `URL: ${data[ConfigKey.URLS]}`,
    `Schedule: every ${schedule.number}${schedule.unit}`,
    `Locations: ${locationsCount}`,
  ];

  if (tags.length > 0) {
    lines.push(`Tags: ${tags.join(', ')}`);
  }

  if (data[ConfigKey.CONFIG_ID]) {
    lines.push(`config_id: ${data[ConfigKey.CONFIG_ID]}`);
  }

  return lines.join('\n');
};

/**
 * Attachment type definition for `MONITOR_MANAGEMENT_ATTACHMENT_TYPE`.
 *
 * Behaviour mirrors the dashboard_agent attachment type:
 * - `validate` runs `monitorAttachmentDataSchema` (Zod) — keys are
 *   `ConfigKey`-aligned, so a successful validation is also a structural
 *   guarantee that the data round-trips through the GET response shape
 *   for HTTP monitors.
 * - `resolve` is invoked once at attachment-add time for by-reference
 *   attachments — fetches the live monitor scoped to the user's request,
 *   logs at `warn` (not `error`) on failure, returns `undefined`.
 * - `isStale` compares the live monitor's SO `updated_at` against the
 *   attachment's `origin_snapshot_at`. Returns `false` (and warns) when
 *   either timestamp is missing — a conservative default that avoids
 *   spurious "outdated" banners.
 * - `format` exposes a plain-text representation built from the schema
 *   data — never from the raw SO — so secrets never leak into prompts.
 *
 * Persistence is the **user's** click; this attachment type never writes.
 */
export const createMonitorManagementAttachmentType = ({
  logger,
}: CreateMonitorManagementAttachmentTypeOptions): AttachmentTypeDefinition<
  typeof MONITOR_MANAGEMENT_ATTACHMENT_TYPE,
  MonitorAttachmentData
> => {
  return {
    id: MONITOR_MANAGEMENT_ATTACHMENT_TYPE,

    validate: (input) => {
      const parsed = monitorAttachmentDataSchema.safeParse(input);
      if (parsed.success) {
        return { valid: true, data: parsed.data };
      }
      return { valid: false, error: parsed.error.message };
    },

    resolve: async (origin, context) => {
      if (!context.savedObjectsClient) {
        // Same posture as dashboard_agent: bail loudly when the runtime
        // didn't pass us the request-scoped client. Without it we cannot
        // honour the auth-boundary contract (user is the actor).
        logger.warn(
          `monitor_management attachment.resolve: missing savedObjectsClient on context for origin '${origin}'`
        );
        return undefined;
      }

      const fetched = await fetchMonitorAttachmentData({
        soClient: context.savedObjectsClient,
        configId: origin,
        logger,
        context: 'attachment.resolve',
      });

      return fetched?.data;
    },

    isStale: async (attachment, context) => {
      // `isStale` is only invoked for attachments with a populated
      // `origin` per the framework contract, but the framework also
      // requires `origin_snapshot_at` to make a meaningful comparison —
      // without it we have no "last seen" anchor. Be conservative.
      if (!attachment.origin_snapshot_at) {
        return false;
      }
      if (!context.savedObjectsClient) {
        logger.warn(
          `monitor_management attachment.isStale: missing savedObjectsClient on context for origin '${attachment.origin}'`
        );
        return false;
      }

      try {
        const fetched = await fetchMonitorAttachmentData({
          soClient: context.savedObjectsClient,
          configId: attachment.origin,
          logger,
          context: 'attachment.isStale',
        });

        const liveUpdatedAt = fetched?.updatedAt;
        if (!liveUpdatedAt) {
          // Fallback when the SO has no `updated_at` (e.g. legacy fixture)
          // — avoid showing a spurious "outdated" banner.
          logger.warn(
            `monitor_management attachment.isStale: no updated_at on live monitor for origin '${attachment.origin}' — treating as fresh`
          );
          return false;
        }

        return Date.parse(liveUpdatedAt) > Date.parse(attachment.origin_snapshot_at);
      } catch (error) {
        logger.warn(
          `monitor_management attachment.isStale: failed for origin '${attachment.origin}': ${
            (error as Error).message
          }`
        );
        return false;
      }
    },

    format: (attachment) => ({
      getRepresentation: () => ({
        type: 'text',
        value: formatMonitorRepresentation(attachment.id, attachment.data),
      }),
    }),

    getAgentDescription: () =>
      // Aligns with the cross-cutting decision: agent description points to
      // the **real** skill (registered in T5 as `monitor-management`) and
      // the **real** tool (`manage_synthetics_monitor` from T4). No
      // fictitious tools.
      `A Synthetics monitor attachment. Rendering it inline shows a card with the monitor's name, status (proposed / enabled / disabled / cli-managed), schedule, location count, and tags. To compose or modify a draft monitor, load the \`monitor-management\` skill and use the \`manage_synthetics_monitor\` tool — the tool never persists; the user's click on Create / Update in the canvas flyout is what writes to Synthetics. CLI-managed (project-origin) monitors are read-only via this attachment.`,

    isReadonly: false,
  };
};

export { MONITOR_MANAGEMENT_ATTACHMENT_TYPE };
export type { MonitorAttachmentData };
