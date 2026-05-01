/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ConfigKey } from '../constants/monitor_management';
import {
  FormMonitorType,
  MonitorTypeEnum,
  ScheduleUnit,
  SourceType,
} from '../runtime_types/monitor_management/monitor_configs';

/**
 * Zod schemas for the Agent Builder × Synthetics monitor management
 * attachment. These mirror a **strict subset** of the response shape produced
 * by `HTTPSimpleFieldsCodec` + `CommonFieldsCodec`
 * (see `common/runtime_types/monitor_management/monitor_types.ts`).
 *
 * Parity rule (do not break):
 *   Every key declared here MUST be a member of the response codec for HTTP
 *   monitors, with a value type that is a Zod equivalent of the io-ts shape.
 *   Server-generated fields (`config_id`, monitor query `id`, `created_at`,
 *   `updated_at`, `revision`) are optional so the same schema accepts both
 *   "proposed" (no `config_id`) and "saved" (with `config_id`) attachments.
 *
 * v1 scope: HTTP monitors with `origin: 'ui'`. TCP / ICMP / Browser come
 * later via additional discriminators on `ConfigKey.MONITOR_TYPE`.
 */

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

/**
 * Schedule shape from `ScheduleCodec` in `monitor_types.ts`.
 * Allow-list enforcement (`ALLOWED_SCHEDULES_IN_MINUTES`,
 * `ALLOWED_SCHEDULES_IN_SECONDS`) lives in the per-batch cross-field
 * validation inside the `manage_synthetics_monitor` tool, not here.
 */
const scheduleSchema = z.object({
  number: z.string().min(1),
  unit: z.enum([ScheduleUnit.MINUTES, ScheduleUnit.SECONDS]),
});

/**
 * Location shape — accepts both public/Elastic-managed locations
 * (`MonitorServiceLocationCodec`) and private locations
 * (`PrivateLocationCodec`). Extra keys are preserved via `.passthrough()`
 * so private-location-only fields (e.g. `agentPolicyId`, `tags`,
 * `namespace`) survive a round-trip without the schema needing to know
 * about every variant.
 */
const locationSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().optional(),
    isServiceManaged: z.boolean().optional(),
    isInvalid: z.boolean().optional(),
    url: z.string().optional(),
    status: z.string().optional(),
    geo: z
      .object({
        lat: z.union([z.string(), z.number(), z.null()]).optional(),
        lon: z.union([z.string(), z.number(), z.null()]).optional(),
      })
      .passthrough()
      .optional(),
    agentPolicyId: z.string().optional(),
  })
  .passthrough();

/**
 * `__ui` metadata — `MetadataCodec` from
 * `common/runtime_types/monitor_management/monitor_meta_data.ts`.
 */
const metadataSchema = z.object({
  is_tls_enabled: z.boolean().optional(),
  script_source: z
    .object({
      is_generated_script: z.boolean(),
      file_name: z.string(),
    })
    .optional(),
});

/**
 * `alert` config — `AlertConfigsCodec` (TLS + status alert toggles).
 * Encrypted-secret subfields are deliberately not represented; only the
 * non-secret toggles round-trip in attachments.
 */
const alertConfigSchema = z.object({
  enabled: z.boolean(),
  groupBy: z.string().optional(),
});
const alertConfigsSchema = z.object({
  tls: alertConfigSchema.optional(),
  status: alertConfigSchema.optional(),
});

// ---------------------------------------------------------------------------
// Attachment data schema
// ---------------------------------------------------------------------------

/**
 * Attachment data for `MONITOR_MANAGEMENT_ATTACHMENT_TYPE`.
 *
 * Required keys are those a user must supply for a monitor to be saveable
 * (`name`, `type`, `enabled`, `schedule`, `locations`, `urls`). Everything
 * else is optional, including all server-generated identifiers, so the same
 * shape covers both proposed-but-not-yet-saved monitors and saved ones.
 *
 * Renderers branch on `data[ConfigKey.CONFIG_ID]` (and `data[ConfigKey.MONITOR_SOURCE_TYPE]`)
 * to decide between `proposed` / `enabled` / `disabled` / `cli-managed`
 * status badges.
 */
export const monitorAttachmentDataSchema = z.object({
  // --- user-editable, required for a saveable monitor ------------------
  [ConfigKey.NAME]: z.string().min(1),
  [ConfigKey.MONITOR_TYPE]: z.literal(MonitorTypeEnum.HTTP),
  [ConfigKey.ENABLED]: z.boolean(),
  [ConfigKey.SCHEDULE]: scheduleSchema,
  [ConfigKey.LOCATIONS]: z.array(locationSchema).min(1),
  [ConfigKey.URLS]: z.string().min(1),

  // --- user-editable, optional ----------------------------------------
  [ConfigKey.TAGS]: z.array(z.string()).optional(),
  [ConfigKey.LABELS]: z.record(z.string(), z.string()).optional(),
  [ConfigKey.NAMESPACE]: z.string().optional(),
  [ConfigKey.APM_SERVICE_NAME]: z.string().optional(),
  [ConfigKey.MAX_REDIRECTS]: z.union([z.string(), z.number()]).optional(),
  [ConfigKey.PORT]: z.union([z.number(), z.null()]).optional(),
  [ConfigKey.REQUEST_METHOD_CHECK]: z.string().optional(),
  [ConfigKey.IGNORE_HTTPS_ERRORS]: z.boolean().optional(),
  [ConfigKey.METADATA]: metadataSchema.optional(),
  [ConfigKey.ALERT_CONFIG]: alertConfigsSchema.optional(),
  [ConfigKey.MAX_ATTEMPTS]: z.number().optional(),
  [ConfigKey.KIBANA_SPACES]: z.array(z.string()).optional(),
  [ConfigKey.FORM_MONITOR_TYPE]: z
    .enum([
      FormMonitorType.SINGLE,
      FormMonitorType.MULTISTEP,
      FormMonitorType.HTTP,
      FormMonitorType.TCP,
      FormMonitorType.ICMP,
    ])
    .optional(),

  // --- server-generated / read-only after save ------------------------
  [ConfigKey.MONITOR_SOURCE_TYPE]: z.enum([SourceType.UI, SourceType.PROJECT]).optional(),
  [ConfigKey.CONFIG_ID]: z.string().optional(),
  [ConfigKey.MONITOR_QUERY_ID]: z.string().optional(),
  [ConfigKey.REVISION]: z.number().optional(),
  [ConfigKey.CONFIG_HASH]: z.string().optional(),

  // SO meta from the GET response shape
  // (see `EncryptedSyntheticsSavedMonitorCodec`).
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type MonitorAttachmentData = z.infer<typeof monitorAttachmentDataSchema>;

// ---------------------------------------------------------------------------
// Draft schema — permissive in-memory state for `operations[]`
// ---------------------------------------------------------------------------

/**
 * Permissive draft used by `manage_synthetics_monitor` to merge
 * `operations[]` mutations across a single tool batch. Every field is
 * optional because the LLM may produce a partial draft mid-conversation
 * (e.g. only `set_metadata` so far). Strict validation
 * (`normalizeAPIConfig` → `validateMonitor`) runs at the **batch boundary**
 * before the attachment is added/updated, not after every op.
 *
 * The set of keys is intentionally a strict superset of
 * `monitorAttachmentDataSchema`: anything that can appear in the saved
 * attachment can appear in a draft, plus nothing else, so a draft can be
 * promoted to attachment data via the boundary validator without key
 * renaming.
 */
export const monitorDraftSchema = monitorAttachmentDataSchema.partial();

export type MonitorDraft = z.infer<typeof monitorDraftSchema>;
