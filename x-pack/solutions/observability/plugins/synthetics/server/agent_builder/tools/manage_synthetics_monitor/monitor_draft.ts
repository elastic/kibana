/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { ConfigKey } from '../../../../common/runtime_types';
import {
  FormMonitorType,
  MonitorTypeEnum,
  ScheduleUnit,
  SourceType,
} from '../../../../common/runtime_types/monitor_management/monitor_configs';
import { ALLOWED_SCHEDULES_IN_MINUTES } from '../../../../common/constants/monitor_defaults';
import type { MonitorAttachmentData, MonitorDraft } from '../../../../common/agent_builder';
import type { MonitorOperation } from './operations';

/**
 * Validation error thrown by `executeMonitorOperations` when an operation
 * is structurally fine (`monitorOperationSchema` passed) but breaks a
 * cross-field invariant — e.g. duplicate location ids, empty locations,
 * an out-of-allow-list schedule that snuck past the per-op `.refine`.
 *
 * Logger guidance from the brief:
 *   - `MonitorOperationValidationError` → `logger.warn`
 *   - any other error               → `logger.error`
 *
 * Distinct error class so `manage_synthetics_monitor.ts` can catch+log
 * appropriately and the LLM gets a structured error result back.
 */
export class MonitorOperationValidationError extends Error {
  /** Stable code for the LLM to branch on without parsing the message. */
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'MonitorOperationValidationError';
    this.code = code;
  }
}

/**
 * Stub of the **agent-only** default fields needed before the user edits
 * the proposed monitor in the canvas. Mirrors a minimal subset of
 * `DEFAULT_HTTP_SIMPLE_FIELDS` from
 * `common/constants/monitor_defaults.ts` — keeps Tools out of the io-ts
 * runtime path.
 *
 * Per the brief: the proposed attachment is **not** a fully formed
 * `HTTPSimpleFields` object. It only carries fields the user can edit
 * via `operations[]`. The Save button (T7) is what calls
 * `POST /api/synthetics/monitors`; that endpoint runs `normalizeAPIConfig`
 * (which fills in **all** missing default fields) before persistence.
 *
 * So the stub here only needs to satisfy `monitorAttachmentDataSchema`'s
 * required keys (T1) — not `HTTPSimpleFieldsCodec`'s full surface.
 */
export const buildEmptyMonitorDraft = (): MonitorDraft => ({
  [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.HTTP,
  [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.HTTP,
  [ConfigKey.MONITOR_SOURCE_TYPE]: SourceType.UI,
  [ConfigKey.ENABLED]: true,
  // Schedule + locations + urls + name are deliberately **not** seeded —
  // requiring the LLM to set them via `operations[]` keeps the proposed
  // attachment honest about what's been agreed with the user.
});

/**
 * Apply each operation in order, mutating an in-memory draft. Returns
 * the new draft (does not mutate the input). Per-op `.refine(...)` checks
 * have already run via `monitorOperationSchema.parse` before we get here,
 * so this loop only handles **cross-op** state transitions and deeper
 * cross-field rules that don't fit a single op.
 */
export const executeMonitorOperations = ({
  currentDraft,
  operations,
  logger,
}: {
  /** The previous attachment data (when updating) or `undefined` (when proposing). */
  currentDraft: MonitorAttachmentData | undefined;
  operations: MonitorOperation[];
  logger: Logger;
}): MonitorDraft => {
  let draft: MonitorDraft = currentDraft
    ? // Clone so callers don't observe partial mutations on errors.
      structuredClone(currentDraft as MonitorDraft)
    : buildEmptyMonitorDraft();

  for (const op of operations) {
    switch (op.operation) {
      case 'set_metadata': {
        if (
          op.name === undefined &&
          op.tags === undefined &&
          op.apm_service_name === undefined &&
          op.namespace === undefined
        ) {
          logger.debug('Skipping empty set_metadata operation');
          break;
        }
        draft = {
          ...draft,
          ...(op.name !== undefined ? { [ConfigKey.NAME]: op.name } : {}),
          ...(op.tags !== undefined ? { [ConfigKey.TAGS]: op.tags } : {}),
          ...(op.apm_service_name !== undefined
            ? { [ConfigKey.APM_SERVICE_NAME]: op.apm_service_name }
            : {}),
          ...(op.namespace !== undefined ? { [ConfigKey.NAMESPACE]: op.namespace } : {}),
        };
        break;
      }

      case 'set_schedule': {
        if (op.unit === ScheduleUnit.MINUTES && !ALLOWED_SCHEDULES_IN_MINUTES.includes(op.number)) {
          // Defensive: the per-op `.refine` should have rejected this
          // already. If it didn't, the codec layer downstream will, but a
          // structured error here is friendlier to the LLM.
          throw new MonitorOperationValidationError(
            'invalid_schedule',
            `Schedule "${op.number}${
              op.unit
            }" is not in the allow-list. Use one of: ${ALLOWED_SCHEDULES_IN_MINUTES.join(
              ', '
            )} (minutes).`
          );
        }
        draft = {
          ...draft,
          [ConfigKey.SCHEDULE]: { number: op.number, unit: op.unit },
        };
        break;
      }

      case 'set_http_check': {
        draft = {
          ...draft,
          [ConfigKey.URLS]: op.url,
          ...(op.method !== undefined ? { [ConfigKey.REQUEST_METHOD_CHECK]: op.method } : {}),
          ...(op.max_redirects !== undefined
            ? { [ConfigKey.MAX_REDIRECTS]: op.max_redirects }
            : {}),
          ...(op.ignore_https_errors !== undefined
            ? { [ConfigKey.IGNORE_HTTPS_ERRORS]: op.ignore_https_errors }
            : {}),
        };
        break;
      }

      case 'set_locations': {
        const ids = new Set<string>();
        for (const location of op.locations) {
          if (ids.has(location.id)) {
            throw new MonitorOperationValidationError(
              'duplicate_location',
              `Duplicate location id "${location.id}" in set_locations.`
            );
          }
          ids.add(location.id);
        }
        draft = {
          ...draft,
          [ConfigKey.LOCATIONS]: op.locations.map((location) => ({
            id: location.id,
            ...(location.label !== undefined ? { label: location.label } : {}),
            ...(location.isServiceManaged !== undefined
              ? { isServiceManaged: location.isServiceManaged }
              : {}),
            ...(location.agentPolicyId !== undefined
              ? { agentPolicyId: location.agentPolicyId }
              : {}),
          })),
        };
        break;
      }

      case 'set_enabled': {
        draft = {
          ...draft,
          [ConfigKey.ENABLED]: op.enabled,
        };
        break;
      }
    }
  }

  return draft;
};

/**
 * Result of {@link assertMonitorDraftSaveable} — used by the tool handler
 * to decide whether the canvas Save button should be enabled and what
 * (if anything) is still missing.
 */
export type MonitorDraftSaveability =
  | { saveable: true; data: MonitorAttachmentData }
  | { saveable: false; missing: string[]; reason: string };

/**
 * Batch-boundary check: the draft is structurally a complete
 * `MonitorAttachmentData` (all required keys present, schedule still in
 * the allow-list).
 *
 * This is **not** a substitute for `validateMonitor` — that runs server-
 * side at POST time when the user clicks Save and applies the full io-ts
 * codec including default fields. Here we just gate the Save button.
 */
export const assertMonitorDraftSaveable = (draft: MonitorDraft): MonitorDraftSaveability => {
  const missing: string[] = [];

  if (!draft[ConfigKey.NAME]) missing.push('name');
  if (!draft[ConfigKey.URLS]) missing.push('url (set via set_http_check)');

  const schedule = draft[ConfigKey.SCHEDULE];
  if (!schedule) {
    missing.push('schedule (set via set_schedule)');
  } else if (
    schedule.unit === ScheduleUnit.MINUTES &&
    !ALLOWED_SCHEDULES_IN_MINUTES.includes(schedule.number)
  ) {
    return {
      saveable: false,
      missing: ['schedule'],
      reason: `Schedule "${schedule.number}${
        schedule.unit
      }" is not in the allow-list (${ALLOWED_SCHEDULES_IN_MINUTES.join(', ')} minutes).`,
    };
  }

  const locations = draft[ConfigKey.LOCATIONS];
  if (!locations || locations.length === 0) {
    missing.push('locations (set via set_locations)');
  }

  if (missing.length > 0) {
    return {
      saveable: false,
      missing,
      reason: `Draft is missing required fields: ${missing.join(', ')}.`,
    };
  }

  // At this point all required keys are present and the schedule is in
  // the allow-list. Promote to attachment-data shape — the cast is safe
  // because `monitorDraftSchema = monitorAttachmentDataSchema.partial()`
  // (T1) and we just checked that no required key is missing.
  return {
    saveable: true,
    data: draft as MonitorAttachmentData,
  };
};
