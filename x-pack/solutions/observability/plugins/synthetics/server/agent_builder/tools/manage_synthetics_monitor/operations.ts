/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ScheduleUnit } from '../../../../common/runtime_types/monitor_management/monitor_configs';

/**
 * Discriminated-union of in-memory mutations applied to a `MonitorDraft`
 * during a single `manage_synthetics_monitor` tool batch.
 *
 * Design rules:
 * - Every operation maps to one or more `ConfigKey`s. The "promoted" draft
 *   (after `executeMonitorOperations`) must round-trip through
 *   `monitorAttachmentDataSchema` if it's complete.
 * - HTTP-only in v1. TCP / ICMP / Browser come later via additional
 *   operations (`set_tcp_check`, `set_icmp_check`, `set_browser_script`)
 *   discriminated on a `monitor_type` field added at that point.
 * - Per-op cross-field checks (e.g. schedule allow-list, urls non-empty)
 *   live here in `set_*` op `.refine(...)` blocks; **batch-boundary**
 *   checks (locations resolved against private-location SOs, name+urls+
 *   schedule+locations all present together) live in
 *   `manage_synthetics_monitor.ts`.
 *
 * Keep the descriptions terse — they show up verbatim in the LLM tool
 * prompt and contribute to context size.
 */

import { ALLOWED_SCHEDULES_IN_MINUTES } from '../../../../common/constants/monitor_defaults';

const allowedScheduleNumbersInMinutes = ALLOWED_SCHEDULES_IN_MINUTES as ReadonlyArray<string>;

export const setMetadataOperationSchema = z.object({
  operation: z.literal('set_metadata'),
  name: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Human-readable monitor name. Required before the user can save (the canvas Save button is disabled without it).'
    ),
  tags: z
    .array(z.string().min(1))
    .optional()
    .describe('Free-form tags. Use to group related monitors (e.g. team, environment).'),
  apm_service_name: z
    .string()
    .optional()
    .describe(
      'Optional. APM service name to correlate this monitor with an existing service in APM.'
    ),
  namespace: z
    .string()
    .optional()
    .describe('Heartbeat data stream namespace. Defaults to the current Kibana space if omitted.'),
});

export const setScheduleOperationSchema = z
  .object({
    operation: z.literal('set_schedule'),
    number: z
      .string()
      .min(1)
      .describe(
        `Schedule interval as a string. Allowed values when unit is minutes: ${allowedScheduleNumbersInMinutes.join(
          ', '
        )}. Other values are rejected at the per-op check.`
      ),
    unit: z
      .enum([ScheduleUnit.MINUTES, ScheduleUnit.SECONDS])
      .describe('Schedule unit. Use minutes for production monitors; seconds is rare.'),
  })
  .refine(
    (op) => op.unit !== ScheduleUnit.MINUTES || allowedScheduleNumbersInMinutes.includes(op.number),
    {
      message: `When unit is minutes, schedule.number must be one of: ${allowedScheduleNumbersInMinutes.join(
        ', '
      )}`,
      path: ['number'],
    }
  );

const httpMethodSchema = z.enum(['GET', 'HEAD', 'POST', 'OPTIONS', 'PUT', 'PATCH', 'DELETE']);

export const setHttpCheckOperationSchema = z
  .object({
    operation: z.literal('set_http_check'),
    url: z
      .string()
      .min(1)
      .describe(
        'Full URL to monitor (e.g. `https://example.com/health`). Required for HTTP monitors.'
      ),
    method: httpMethodSchema.optional().describe('HTTP method. Defaults to GET when omitted.'),
    max_redirects: z
      .union([z.string(), z.number()])
      .optional()
      .describe('Maximum redirects to follow. Defaults to 0.'),
    ignore_https_errors: z
      .boolean()
      .optional()
      .describe('Skip TLS certificate validation. Use only for staging/testing.'),
  })
  .refine((op) => /^https?:\/\//i.test(op.url), {
    message: 'url must start with http:// or https://',
    path: ['url'],
  });

const locationInputSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .describe(
        'Location id. For Elastic-managed locations use the standard region id (e.g. `us_central`). For private locations use the saved object id of the private location.'
      ),
    label: z.string().optional(),
    isServiceManaged: z
      .boolean()
      .optional()
      .describe(
        '`true` for Elastic-managed (public) locations, `false` for private locations. Resolves to the proper structural shape at the batch boundary.'
      ),
    agentPolicyId: z
      .string()
      .optional()
      .describe('Required for private locations. The Fleet agent policy id backing the location.'),
  })
  .passthrough();

export const setLocationsOperationSchema = z.object({
  operation: z.literal('set_locations'),
  locations: z
    .array(locationInputSchema)
    .min(1)
    .describe(
      'Replace the monitor locations with this list. For v1 the tool does not append; provide the full desired set.'
    ),
});

export const setEnabledOperationSchema = z.object({
  operation: z.literal('set_enabled'),
  enabled: z.boolean().describe('`true` to enable; `false` to keep the monitor saved but paused.'),
});

export const monitorOperationSchema = z.discriminatedUnion('operation', [
  setMetadataOperationSchema,
  setScheduleOperationSchema,
  setHttpCheckOperationSchema,
  setLocationsOperationSchema,
  setEnabledOperationSchema,
]);

export type MonitorOperation = z.infer<typeof monitorOperationSchema>;
