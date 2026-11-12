/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core/server';
import { WATCH_AUTONOMY_LEVELS } from '@kbn/alertzero-common';
import type {
  AlertZeroAutonomyLevel,
  AlertZeroAutonomyMode,
  AlertZeroTriggerType,
  AlertZeroWatchTag,
  AlertZeroWorkerId,
} from './constants';
import { formatVocabulary } from './format_vocabulary';

export const ALERTZERO_TELEMETRY_PREFIX = 'alertzero';

/** The fields every AlertZero Worker run event carries, built by `buildAlertZeroEnvelope`. */
export interface AlertZeroEnvelope {
  autonomy_level?: AlertZeroAutonomyLevel;
  autonomy_mode?: AlertZeroAutonomyMode;
  execution_id: string;
  is_default_space: boolean;
  run_id: string;
  trigger_type: AlertZeroTriggerType;
  watch_tag: AlertZeroWatchTag;
  worker_id: AlertZeroWorkerId;
}

export const WORKER_ID_DESCRIPTION =
  'Worker catalog id of the managed workflow (for example `system-security-floor-attack-discovery`), or `other` outside the catalog';
export const WATCH_TAG_DESCRIPTION =
  'Watch tier tag of the Worker (`watch-floor`, `watch-officer`, `watch-hunt`, `watch-detection` or `watch-forensics`), or `other` outside the catalog';
const AUTONOMY_LEVEL_DESCRIPTION = `Worker autonomy level (${formatVocabulary(
  WATCH_AUTONOMY_LEVELS
)})`;
export const IS_DEFAULT_SPACE_DESCRIPTION =
  'Whether the event happened in the default space. The space id itself is never sent';
export const INVESTIGATION_ID_DESCRIPTION =
  "It is the Investigation's Agent Builder conversation id, a UUID, and the same value already ships raw as Agent Builder `conversation_id`. Most Workers' Investigations get a random id. Two are derived from a customer record, so they are stable ids for that record, not for a person: an Attack Discovery Worker Investigation's id is the first 120 bits of the attack's `kibana.alert.uuid` (the review's `attack_discovery_id`, a SHA-256 hex) with the UUID version and variant characters set to `8`, and a Hunt Worker Investigation's id is a UUID v5 of the threat report id";

export const ENVELOPE_SCHEMA: RootSchema<AlertZeroEnvelope> = {
  autonomy_level: {
    type: 'keyword',
    _meta: {
      description: `${AUTONOMY_LEVEL_DESCRIPTION}, read from the root execution's persisted definition consts; absent when the root carries none, or when the run does not act at that level (the Endpoint Analysis Worker uses it only for a scheduled run)`,
      optional: true,
    },
  },
  autonomy_mode: {
    type: 'keyword',
    _meta: {
      description:
        'Derived from autonomy_level: `auto_accept` when the Worker gate auto-approves (`supervised`), otherwise `gated`; absent with autonomy_level',
      optional: true,
    },
  },
  execution_id: {
    type: 'keyword',
    _meta: {
      description:
        'Generated UUID of the workflow execution that reported the event (the root or one of its descendants)',
      optional: false,
    },
  },
  is_default_space: {
    type: 'boolean',
    _meta: { description: IS_DEFAULT_SPACE_DESCRIPTION, optional: false },
  },
  run_id: {
    type: 'keyword',
    _meta: {
      description:
        "Generated UUID of the Worker run's root execution, derived server-side; every event of one run shares it and it joins to the engine's execution events",
      optional: false,
    },
  },
  trigger_type: {
    type: 'keyword',
    _meta: {
      description:
        "How the root execution started, from its persisted `triggeredBy`: `manual`, `scheduled`, `alert`, `workflow_step`, `event`, `other` (a custom provenance value) or `unknown`. `workflow_step` is the Workflows engine's `triggerType` value `workflow-step`, spelled with an underscore; `manual`, `scheduled`, `alert` and `event` match the engine's values",
      optional: false,
    },
  },
  watch_tag: {
    type: 'keyword',
    _meta: { description: WATCH_TAG_DESCRIPTION, optional: false },
  },
  worker_id: {
    type: 'keyword',
    _meta: { description: WORKER_ID_DESCRIPTION, optional: false },
  },
};

/** A required count field. */
export const countField = (description: string) =>
  ({ type: 'long', _meta: { description, optional: false } } as const);

/** A required boolean field. */
export const flagField = (description: string) =>
  ({ type: 'boolean', _meta: { description, optional: false } } as const);

/** A required keyword field holding one value of a closed vocabulary, which it lists. */
export const vocabularyField = (description: string, values: readonly string[]) =>
  ({
    type: 'keyword',
    _meta: { description: `${description}: ${formatVocabulary(values)}`, optional: false },
  } as const);

/** An optional keyword field holding one value of a closed vocabulary, which it lists. */
export const optionalVocabularyField = (description: string, values: readonly string[]) =>
  ({
    type: 'keyword',
    _meta: { description: `${description}: ${formatVocabulary(values)}`, optional: true },
  } as const);

/** The Investigation id a Worker item event always carries. */
export const investigationIdField = (description: string) =>
  ({
    type: 'keyword',
    _meta: { description: `${description}. ${INVESTIGATION_ID_DESCRIPTION}`, optional: false },
  } as const);

/** The Investigation id a Worker item event carries except in the one case its description names. */
export const optionalInvestigationIdField = (description: string) =>
  ({
    type: 'keyword',
    _meta: { description: `${description}. ${INVESTIGATION_ID_DESCRIPTION}`, optional: true },
  } as const);
