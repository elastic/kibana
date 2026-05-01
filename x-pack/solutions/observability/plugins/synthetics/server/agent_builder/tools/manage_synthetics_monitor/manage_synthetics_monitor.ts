/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { getLatestVersion, type VersionedAttachment } from '@kbn/agent-builder-common/attachments';

import {
  MONITOR_MANAGEMENT_ATTACHMENT_TYPE,
  type MonitorAttachmentData,
} from '../../../../common/agent_builder';
import { ConfigKey } from '../../../../common/runtime_types';
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

interface ToolResultPayload {
  status: 'proposed' | 'updated' | 'incomplete' | 'cli_managed';
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

export const manageSyntheticsMonitorTool = (): BuiltinSkillBoundedTool<
  typeof manageSyntheticsMonitorSchema
> => ({
  id: TOOL_ID,
  type: ToolType.builtin,
  description: TOOL_DESCRIPTION,
  schema: manageSyntheticsMonitorSchema,
  handler: async (
    { monitor_attachment_id: previousAttachmentId, operations },
    { logger, attachments }
  ) => {
    try {
      const attachmentRecord = previousAttachmentId
        ? attachments.getAttachmentRecord(previousAttachmentId)
        : undefined;
      const previousData = previousAttachmentId
        ? retrieveExistingMonitorAttachment(attachmentRecord, previousAttachmentId)
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

      logger.info(
        `${TOOL_ID}: ${status} attachment '${attachmentId}' (saveable=${saveability.saveable}, ops=${operations.length})`
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
