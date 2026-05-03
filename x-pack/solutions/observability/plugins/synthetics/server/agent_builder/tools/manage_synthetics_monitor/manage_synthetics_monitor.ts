/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { z } from '@kbn/zod/v4';
import type { Logger } from '@kbn/logging';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { getLatestVersion, type VersionedAttachment } from '@kbn/agent-builder-common/attachments';

import {
  MONITOR_MANAGEMENT_ATTACHMENT_TYPE,
  type MonitorAttachmentData,
} from '../../../../common/agent_builder';
import { ConfigKey } from '../../../../common/runtime_types';
import { fetchMonitorAttachmentData } from '../../internal/monitor_attachment_data';
import { monitorOperationSchema } from './operations';
import {
  MonitorOperationValidationError,
  assertMonitorDraftSaveable,
  executeMonitorOperations,
} from './monitor_draft';

/**
 * Tool input schema. Two top-level inputs:
 *
 * - `monitor_attachment_id` (optional): when present, mutate the
 *   attachment in place; when absent, propose a new monitor.
 * - `operations[]`: ordered list of mutations applied to the in-memory
 *   draft. Discriminated union — invalid combinations are rejected by
 *   Zod before the handler runs.
 *
 * Field names are snake_case to match the LLM-facing tool JSON convention
 * used by the rest of agent_builder.
 */
const manageSyntheticsMonitorSchema = z.object({
  monitor_attachment_id: z
    .string()
    .optional()
    .describe(
      '(optional) Existing monitor attachment id to update. If omitted, a new monitor draft is proposed.'
    ),
  operations: z
    .array(monitorOperationSchema)
    .min(1)
    .describe(
      'Ordered list of mutations to apply to the draft. At minimum a new monitor needs `set_metadata` (name), `set_http_check` (url), `set_schedule`, and `set_locations` before the user can save.'
    ),
});

const TOOL_ID = 'manage_synthetics_monitor';

/**
 * Description shown to the LLM. Keep terse — every line spends context
 * tokens. Cross-link to the skill (T5) so the agent loads the broader
 * authoring guidance when this tool is bound.
 */
const TOOL_DESCRIPTION = `Compose or modify a draft Synthetics monitor in conversation context.

This tool mutates an in-memory **draft attachment** of type \`${MONITOR_MANAGEMENT_ATTACHMENT_TYPE}\`. It NEVER persists to Synthetics — the user clicks Create or Update in the canvas to write the monitor via the existing CRUD HTTP API. v1 supports HTTP monitors with origin: ui only.

Use \`operations[]\` (in order) to:
1. set_metadata    — name, tags, apm_service_name, namespace
2. set_schedule    — schedule.number + schedule.unit (allow-listed)
3. set_http_check  — url, method, max_redirects, ignore_https_errors
4. set_locations   — replace the location list (provide the full set)
5. set_enabled     — toggle whether the monitor runs once saved

Look up location ids via the \`monitor-management\` skill's SML search before calling \`set_locations\`. Project-origin (CLI-managed) monitors are read-only via this tool.`;

/**
 * Two orthogonal axes the LLM needs to keep separate when narrating
 * results back to the user:
 *
 * - `status` — what the **tool** just did to the conversation
 *   attachment record: created it (`proposed`), mutated an existing
 *   one (`updated`), refused (`cli_managed`), or bailed because the
 *   draft is missing required fields (`incomplete`).
 * - `lifecycle` — what the **monitor** itself actually is right now:
 *   `draft` (no `config_id` yet — the user must click **Create** to
 *   write it to Synthetics) or `saved` (already persisted — the user
 *   clicks **Update** to push the agent's changes).
 *
 * Without `lifecycle`, the LLM was conflating "tool action = updated"
 * with "monitor is saved", and would tell the user "Click Update"
 * even when the underlying attachment was still a draft (no
 * `config_id`). Splitting the two lets the skill prompt wire the
 * Create-vs-Update wording strictly to `lifecycle`.
 */
interface ToolResultPayload {
  status: 'proposed' | 'updated' | 'incomplete' | 'cli_managed';
  lifecycle: 'draft' | 'saved';
  attachment_id: string;
  saveable: boolean;
  missing_fields?: string[];
  monitor: {
    name?: string;
    type: string;
    enabled?: boolean;
    schedule?: { number: string; unit: string };
    locations_count: number;
    url?: string;
    config_id?: string;
    origin?: string;
  };
}

const summarizeMonitor = (
  attachmentId: string,
  data: ReturnType<typeof executeMonitorOperations>,
  saveable: boolean,
  missingFields: string[] | undefined,
  status: ToolResultPayload['status']
): ToolResultPayload => ({
  status,
  // Lifecycle keys off `config_id` exclusively — same heuristic the
  // canvas's `inferMonitorStatus` uses (sans the project/CLI branch
  // which is already surfaced via `status: 'cli_managed'` and the
  // `monitor.origin` field). Keeping the two in lockstep means the
  // LLM and the canvas always agree on whether the user should see
  // **Create** or **Update**.
  lifecycle: data[ConfigKey.CONFIG_ID] ? 'saved' : 'draft',
  attachment_id: attachmentId,
  saveable,
  missing_fields: missingFields,
  monitor: {
    name: data[ConfigKey.NAME],
    type: data[ConfigKey.MONITOR_TYPE] ?? 'http',
    enabled: data[ConfigKey.ENABLED],
    schedule: data[ConfigKey.SCHEDULE]
      ? {
          number: data[ConfigKey.SCHEDULE].number,
          unit: data[ConfigKey.SCHEDULE].unit,
        }
      : undefined,
    locations_count: data[ConfigKey.LOCATIONS]?.length ?? 0,
    url: data[ConfigKey.URLS],
    config_id: data[ConfigKey.CONFIG_ID],
    origin: data[ConfigKey.MONITOR_SOURCE_TYPE],
  },
});

/**
 * Read the latest in-memory snapshot of an existing monitor attachment.
 *
 * Pure projection of `attachments.getAttachmentRecord(id)` — does not
 * touch ES / SOs. The freshness layering (when to trust this snapshot
 * vs. re-resolve from the saved object) lives in
 * {@link resolveMonitorAttachmentData} so the snapshot reader stays
 * cheap and synchronous.
 */
const retrieveExistingMonitorAttachment = (
  attachmentRecord: VersionedAttachment | undefined,
  attachmentId: string
): MonitorAttachmentData | undefined => {
  if (!attachmentRecord) {
    throw new Error(`Monitor attachment "${attachmentId}" not found in conversation.`);
  }
  if (attachmentRecord.type !== MONITOR_MANAGEMENT_ATTACHMENT_TYPE) {
    throw new Error(
      `Attachment "${attachmentId}" is type "${attachmentRecord.type}", expected "${MONITOR_MANAGEMENT_ATTACHMENT_TYPE}".`
    );
  }
  const latest = getLatestVersion<MonitorAttachmentData>(
    attachmentRecord as VersionedAttachment<
      typeof MONITOR_MANAGEMENT_ATTACHMENT_TYPE,
      MonitorAttachmentData
    >
  );
  return latest?.data;
};

/**
 * Resolve the monitor data the agent should mutate.
 *
 * This is intentionally *not* the same as just reading the conversation
 * attachment's latest version. Sequence we have to handle:
 *
 *   1. Tool composes a draft (no `config_id`, no `origin`).
 *   2. User clicks Create in the canvas → `POST /api/synthetics/monitors`
 *      returns the new SO id → canvas calls `updateOrigin(id)`. The
 *      framework writes the origin onto the attachment record but
 *      does **not** re-resolve the data — the in-memory snapshot
 *      still has no `config_id`.
 *   3. Agent calls this tool again to update something (e.g. swap a
 *      location). If we trust the in-memory snapshot, we send back a
 *      result with `status: 'updated'`, but the canvas's
 *      `inferMonitorStatus` reads `config_id` to decide between
 *      proposed / enabled / disabled — without it, the canvas keeps
 *      showing **Create** instead of **Update**, and the action is
 *      silently a no-op against the saved monitor.
 *
 * Heuristic: when the attachment has an `origin` set (i.e. it has
 * been linked to a saved monitor) but the in-memory data is missing
 * `config_id`, refresh from the saved object via
 * `fetchMonitorAttachmentData`. The lookup is the same one the
 * attachment type's `resolve` uses, scoped to the user's request via
 * the tool context's `savedObjectsClient`.
 *
 * If the SO read fails (e.g. the monitor was deleted out-of-band),
 * fall back to the in-memory snapshot and warn — the operation will
 * still proceed and the eventual canvas Save will surface a
 * structured error. This mirrors the attachment type's
 * "warn-not-throw" posture for resolve failures.
 */
const resolveMonitorAttachmentData = async ({
  attachmentRecord,
  inMemoryData,
  savedObjectsClient,
  logger,
  attachmentId,
}: {
  attachmentRecord: VersionedAttachment | undefined;
  inMemoryData: MonitorAttachmentData | undefined;
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
  attachmentId: string;
}): Promise<MonitorAttachmentData | undefined> => {
  // We log every branch — including the no-ops — at debug because the
  // post-Create refresh is invisible from the UI side and field
  // debugging hinges on knowing *why* it did or didn't fire.
  // Production logs typically run at info, so this stays quiet by
  // default; flip the synthetics logger to debug to inspect.
  if (!inMemoryData || !attachmentRecord?.origin) {
    logger.debug(
      `manage_synthetics_monitor.refresh: skip attachment='${attachmentId}' reason='no-origin-or-no-data' hasOrigin=${Boolean(
        attachmentRecord?.origin
      )} hasInMemoryData=${Boolean(inMemoryData)}`
    );
    return inMemoryData;
  }
  if (inMemoryData[ConfigKey.CONFIG_ID]) {
    logger.debug(
      `manage_synthetics_monitor.refresh: skip attachment='${attachmentId}' reason='already-has-config-id' origin='${attachmentRecord.origin}'`
    );
    return inMemoryData;
  }
  logger.info(
    `manage_synthetics_monitor.refresh: fetch attachment='${attachmentId}' origin='${attachmentRecord.origin}' (in-memory snapshot has no config_id; refreshing from saved object)`
  );
  const fetched = await fetchMonitorAttachmentData({
    soClient: savedObjectsClient,
    configId: attachmentRecord.origin,
    logger,
    context: 'manage_synthetics_monitor.refreshAfterSave',
  });
  if (!fetched) {
    logger.warn(
      `manage_synthetics_monitor.refresh: miss attachment='${attachmentId}' origin='${attachmentRecord.origin}' — falling back to in-memory snapshot (canvas will still render as a draft until the SO is reachable)`
    );
    return inMemoryData;
  }
  logger.info(
    `manage_synthetics_monitor.refresh: hit attachment='${attachmentId}' origin='${
      attachmentRecord.origin
    }' resolvedConfigId='${fetched.data[ConfigKey.CONFIG_ID] ?? 'none'}'`
  );
  return fetched.data;
};

export const manageSyntheticsMonitorTool = (): BuiltinSkillBoundedTool<
  typeof manageSyntheticsMonitorSchema
> => ({
  id: TOOL_ID,
  type: ToolType.builtin,
  description: TOOL_DESCRIPTION,
  schema: manageSyntheticsMonitorSchema,
  handler: async (
    { monitor_attachment_id: previousAttachmentId, operations },
    { logger, attachments, savedObjectsClient }
  ) => {
    try {
      const attachmentRecord = previousAttachmentId
        ? attachments.getAttachmentRecord(previousAttachmentId)
        : undefined;
      const inMemoryData = previousAttachmentId
        ? retrieveExistingMonitorAttachment(attachmentRecord, previousAttachmentId)
        : undefined;
      const previousData = previousAttachmentId
        ? await resolveMonitorAttachmentData({
            attachmentRecord,
            inMemoryData,
            savedObjectsClient,
            logger,
            attachmentId: previousAttachmentId,
          })
        : undefined;

      // Project-origin (CLI-managed) monitors are read-only via this
      // tool — the brief makes this explicit. Refuse early with a
      // structured error so the LLM doesn't silently mutate something
      // the user can't save.
      if (previousData?.[ConfigKey.MONITOR_SOURCE_TYPE] === 'project') {
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                error: 'cli_managed_monitor',
                message: `Monitor "${previousAttachmentId}" is CLI-managed (origin: project) and cannot be edited via the agent. Use the synthetics-cli to update it.`,
                attachment_id: previousAttachmentId,
              },
            },
          ],
        };
      }

      // Apply ops to the in-memory draft. Per-op `.refine` checks ran
      // during Zod parse before the handler started, so this only
      // raises on **cross-field** failures.
      const draft = executeMonitorOperations({
        currentDraft: previousData,
        operations,
        logger,
      });

      const saveability = assertMonitorDraftSaveable(draft);

      const isNewMonitor = !previousAttachmentId;
      const attachmentId = previousAttachmentId ?? uuidv4();

      // Persist into the **conversation-level** attachment store —
      // distinct from any Synthetics persistence, which only happens
      // when the user clicks Save in the canvas.
      const attachmentInput = {
        id: attachmentId,
        type: MONITOR_MANAGEMENT_ATTACHMENT_TYPE,
        description:
          draft[ConfigKey.NAME] !== undefined
            ? `Synthetics monitor: ${draft[ConfigKey.NAME]}`
            : 'Synthetics monitor (proposed)',
        data: draft,
      };

      const attachment = isNewMonitor
        ? await attachments.add(attachmentInput)
        : await attachments.update(attachmentId, {
            data: draft,
            description: attachmentInput.description,
          });

      if (!attachment) {
        throw new Error(`Failed to persist monitor attachment "${attachmentId}".`);
      }

      const status: ToolResultPayload['status'] = !saveability.saveable
        ? 'incomplete'
        : isNewMonitor
        ? 'proposed'
        : 'updated';

      const missingFields = saveability.saveable ? undefined : saveability.missing;

      const lifecycle = draft[ConfigKey.CONFIG_ID] ? 'saved' : 'draft';
      logger.info(
        `${TOOL_ID}: ${status} attachment '${attachmentId}' lifecycle=${lifecycle} configId='${
          draft[ConfigKey.CONFIG_ID] ?? 'none'
        }' (saveable=${saveability.saveable}, ops=${operations.length})`
      );

      return {
        results: [
          {
            type: ToolResultType.other,
            data: summarizeMonitor(
              attachment.id,
              draft,
              saveability.saveable,
              missingFields,
              status
            ),
          },
        ],
      };
    } catch (error) {
      // Per the brief: validation errors → warn, everything else →
      // error. Both surface a structured error result to the LLM.
      const message = error instanceof Error ? error.message : String(error);
      if (error instanceof MonitorOperationValidationError) {
        logger.warn(`${TOOL_ID}: validation error (${error.code}) — ${message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message,
                metadata: {
                  code: error.code,
                  monitor_attachment_id: previousAttachmentId,
                  operations,
                },
              },
            },
          ],
        };
      }
      logger.error(`${TOOL_ID}: ${message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to manage Synthetics monitor: ${message}`,
              metadata: {
                monitor_attachment_id: previousAttachmentId,
                operations,
              },
            },
          },
        ],
      };
    }
  },
});

export { manageSyntheticsMonitorSchema };
