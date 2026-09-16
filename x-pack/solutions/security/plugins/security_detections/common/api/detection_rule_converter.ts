/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Detection rule converter — the only file in the plugin that knows both
 * the public wire shape and the framework storage shape.
 *
 * Pure: no I/O, no external calls, no side effects.  The caller is responsible
 * for applying defaults (via `applyRuleDefaults` / `applyRuleUpdateDefaults`)
 * before passing a create or update payload into the "in" direction.
 *
 * Two directions:
 *   - In  (public → framework): produces CreateRuleData (POST) or UpdateRuleData
 *     (PUT / PATCH).
 *   - Out (framework → public): maps a framework RuleResponse back to the
 *     public DetectionRuleResponse contract.
 *
 * Mapping contract:
 *   rule_id           ↔ metadata.signature_id
 *   revision          ↔ metadata.revision           (read-only; out only)
 *   version           ↔ metadata.source.version      (writes send full stored source + new version)
 *   source            ↔ metadata.source minus version (out only)
 *   type              ↔ metadata.builder_type         (via alias map)
 *   name              ↔ metadata.name
 *   description       ↔ metadata.description
 *   tags              ↔ metadata.tags                (empty array never stored; see off-table rules)
 *   schedule.interval ↔ schedule.every
 *   schedule.lookback ↔ schedule.lookback
 *   enabled           ↔ enabled                      (response-only here; create uses options)
 *   all detection fields ↔ metadata.builder_fields.* (same names inside the container)
 *
 * Off-table rules (not representable as a simple column mapping):
 *
 *   Empty tags: The framework rejects an empty metadata.tags array.  On create
 *   and full-replace the converter omits the field; on PATCH it sends explicit
 *   null (because omission would keep the stored tags); on the way out it reads
 *   absence back as [] so the public contract always hands the caller an array.
 *
 *   Description cap: metadata.description is optional and capped at 1024 chars
 *   in the framework.  The public contract requires a description and inherits
 *   the cap.  Do not widen it; do not truncate silently.
 *
 *   Internal fields that never surface: kind, time_field, grouping,
 *   recovery_strategy, no_data_strategy, state_transition, artifacts,
 *   metadata.owner, metadata.ownership, metadata.version (the mutation
 *   sequence), and the saved-object concurrency token.
 *
 * Ref: rule-domain-model.md "Two models, one converter"
 *      rule-domain-model.md "How public fields map onto the stored rule"
 */

import type {
  CreateRuleData,
  UpdateRuleData,
  RuleResponse,
  RuleSource,
} from '@kbn/alerting-v2-schemas';

import {
  ALIAS_TO_BUILDER_TYPE_ID,
  ALIAS_TO_KIND,
  BUILDER_TYPE_ID_TO_ALIAS,
} from './rule_alias_map';
import { RULE_DEFAULTS } from './apply_rule_defaults';
import type {
  DetectionRuleResponse,
  CustomQueryRuleTypeFields,
  ThresholdRuleTypeFields,
  DetectionRuleResponseBase,
} from './detection_rule_response_schema';

// ---------------------------------------------------------------------------
// Internal helper: extract builder_fields from a public payload
// ---------------------------------------------------------------------------

/**
 * Shared shape of the per-type detection fields that live inside
 * `metadata.builder_fields`.  Used by create, replace, and patch converters.
 */
interface RawBuilderFields {
  severity: string;
  risk_score: number;
  max_signals?: number;
  threat?: unknown[];
  setup?: string;
  note?: string | null;
  references?: string[];
  false_positives?: string[];
  author?: string[];
  license?: string | null;
  related_integrations?: unknown[];
  required_fields?: unknown[];
  index: string[];
  query: string;
  language: string;
  threshold?: unknown;
}

/**
 * Extract the detection-domain builder fields from a public create or update
 * payload.  The result is stored verbatim in `metadata.builder_fields`.
 *
 * Excluded from the container: `type`, `name`, `description`, `rule_id`,
 * `version`, `enabled`, `schedule`, `tags` — they all live at higher levels
 * of the framework model.  `note` and `license` set to `null` are also
 * excluded because a null value means "clear this optional field".
 *
 * Everything else — the shared fragment plus per-type fields — belongs inside
 * the container.
 */
function extractBuilderFields(raw: RawBuilderFields): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    severity: raw.severity,
    risk_score: raw.risk_score,
    index: raw.index,
    query: raw.query,
    language: raw.language,
  };

  if (raw.max_signals !== undefined) fields.max_signals = raw.max_signals;
  if (raw.threat != null) fields.threat = raw.threat;
  if (raw.setup != null) fields.setup = raw.setup;
  if (raw.note != null) fields.note = raw.note;
  if (raw.references != null) fields.references = raw.references;
  if (raw.false_positives != null) fields.false_positives = raw.false_positives;
  if (raw.author != null) fields.author = raw.author;
  if (raw.license != null) fields.license = raw.license;
  if (raw.related_integrations != null) fields.related_integrations = raw.related_integrations;
  if (raw.required_fields != null) fields.required_fields = raw.required_fields;
  if (raw.threshold !== undefined) fields.threshold = raw.threshold;

  return fields;
}

// ---------------------------------------------------------------------------
// In direction: public → framework
// ---------------------------------------------------------------------------

/**
 * Public detection rule fields as they appear after defaults are applied.
 * Used by both the create and replace converter functions.
 */
export interface DetectionRuleCreateInput {
  type: 'query' | 'threshold';
  name: string;
  description: string;
  version: number;
  rule_id?: string;
  tags: string[];
  severity: string;
  risk_score: number;
  max_signals?: number;
  threat?: unknown[];
  setup?: string;
  note?: string;
  references?: string[];
  false_positives?: string[];
  author?: string[];
  license?: string;
  related_integrations?: unknown[];
  required_fields?: unknown[];
  schedule: { interval: string; lookback?: string };
  language: string;
  index: string[];
  query: string;
  threshold?: unknown;
}

/**
 * Convert a detection rule create request (with defaults already applied) into
 * the framework's `CreateRuleData`.
 *
 * Detection rules always have:
 *   - `kind: 'signal'` — they collect evidence, not alert episodes.
 *   - `recovery_strategy: 'none'` and `no_data_strategy: 'none'` — sent
 *     explicitly so stored detection rules are uniform even if the framework
 *     default ever changes.  The framework's create schema accepts only absence
 *     or `'none'` for signal rules.
 *   - No persisted `query` — the framework compiles the query at execution time
 *     from `metadata.builder_fields`.
 *   - No `state_transition` or `grouping` — signal-kind rules do not use those
 *     framework features.
 *
 * Empty tags: the framework rejects `metadata.tags = []`, so the field is
 * omitted when the caller provides an empty array.
 *
 * Ref: rule-domain-model.md "How public fields map onto the stored rule"
 *      rule-crud-api.md "Create a rule"
 */
export function toFrameworkCreate(props: DetectionRuleCreateInput): CreateRuleData {
  const builderTypeId = ALIAS_TO_BUILDER_TYPE_ID[props.type];
  // Read the pinned kind from the alias map so that a future entry with a
  // different kind pin requires no change here.
  const kind = ALIAS_TO_KIND[props.type];

  // Empty tags: omit so the framework stores no tags; the response converter
  // reads absence back as [].
  const metadataTags = props.tags.length > 0 ? props.tags : undefined;

  return {
    kind,
    // Sent explicitly so stored detection rules are uniform regardless of the
    // framework default.  The framework's create schema accepts only 'none' for
    // signal rules.
    recovery_strategy: 'none',
    no_data_strategy: 'none',
    schedule: {
      every: props.schedule.interval,
      ...(props.schedule.lookback !== undefined ? { lookback: props.schedule.lookback } : {}),
    },
    metadata: {
      name: props.name,
      description: props.description,
      ...(props.rule_id !== undefined ? { signature_id: props.rule_id } : {}),
      ...(metadataTags !== undefined ? { tags: metadataTags } : {}),
      builder_type: builderTypeId,
      builder_fields: extractBuilderFields(props),
      source: { type: 'internal', version: props.version },
    },
  } as CreateRuleData;
}

/**
 * Convert a detection rule update (PUT) request into the framework's
 * `UpdateRuleData`.
 *
 * PUT is a full replacement: omitted defaultable fields reset and omitted
 * optional fields clear.  The converter mirrors this by sending explicit `null`
 * for cleared framework-level optionals instead of omitting them, because
 * `updateRule`'s merge logic treats `undefined` as "keep the stored value"
 * while `null` clears it.
 *
 * Differences from `toFrameworkCreate`:
 *   - Does NOT send `kind` — `kind` is in `IMMUTABLE_RULE_FIELDS` and the
 *     `updateRuleDataSchema` is strict, so sending it causes a 400.
 *   - Sends `tags: null` (not omit) when tags is empty — omission would keep
 *     the stored tags instead of clearing them.
 *   - Sends `schedule.lookback: null` (not omit) when absent — omission would
 *     keep the stored lookback.
 *
 * The stored source is restated with the caller's new `version` number.
 * `type` and `id` are immutable and come from the stored source; only
 * `version` is caller-writable.
 *
 * Ref: rule-domain-model.md "How public fields map onto the stored rule"
 *      rule-source.md "The v2 source object"
 *      rule-crud-api.md "Replace a rule with PUT"
 */
export function toFrameworkReplace(
  props: DetectionRuleCreateInput,
  storedSource: RuleSource
): UpdateRuleData {
  const builderTypeId = ALIAS_TO_BUILDER_TYPE_ID[props.type];

  // Restate the stored source with the caller's new version.  `type` and `id`
  // are immutable; only `version` is owner-writable.
  const updatedSource: RuleSource = { ...storedSource, version: props.version };

  // Empty tags: send null so the framework clears the stored value.
  // Omitting the field would preserve the old tags (framework treats undefined
  // as "no change"), violating PUT's full-replacement semantics.
  const metadataTags: string[] | null = props.tags.length > 0 ? props.tags : null;

  // lookback: send null when absent so the framework clears any stored lookback.
  // Same reasoning as tags — omission means "keep stored value".
  const schedulePayload: { every: string; lookback?: string | null } = {
    every: props.schedule.interval,
    lookback: props.schedule.lookback !== undefined ? props.schedule.lookback : null,
  };

  return {
    schedule: schedulePayload,
    metadata: {
      name: props.name,
      description: props.description,
      ...(props.rule_id !== undefined ? { signature_id: props.rule_id } : {}),
      tags: metadataTags,
      builder_type: builderTypeId,
      builder_fields: extractBuilderFields(props),
      source: updatedSource,
    },
  };
}

/**
 * Merged detection rule state after PATCH read-modify-write.  All fields are
 * present and fully resolved; the client replaces nulled-out fields with the
 * correct empty/default value before calling here.
 *
 * `schedule.lookback` is `string | null | undefined`:
 *   - `string`    — the current lookback value (from stored or patch)
 *   - `null`      — the patch explicitly cleared the stored lookback
 *   - `undefined` — no stored lookback and the patch did not touch it
 */
export interface DetectionRulePatchedInput {
  name: string;
  description: string;
  version: number;
  tags: string[];
  severity: string;
  risk_score: number;
  max_signals?: number;
  threat?: unknown[];
  setup?: string;
  note?: string;
  references?: string[];
  false_positives?: string[];
  author?: string[];
  license?: string;
  related_integrations?: unknown[];
  required_fields?: unknown[];
  schedule: {
    interval: string;
    /** null means "clear the stored lookback". */
    lookback?: string | null;
  };
  language: string;
  index: string[];
  query: string;
  threshold?: unknown;
  /** The full stored source with updated version if the caller changed version. */
  source: RuleSource;
}

/**
 * Convert a merged PATCH result into the framework's `UpdateRuleData` (partial
 * update payload).
 *
 * The client performs the read-modify-write and calls this function with the
 * fully-resolved merged state.  The whole `builder_fields` is always sent so
 * the framework stores the complete merged detection fields.
 *
 * Empty tags: send explicit `null` so the framework clears the stored value.
 * Omitting `metadata.tags` on a partial update would keep the stored tags,
 * which is the wrong behaviour when the merged state has no tags.
 *
 * The saved-object concurrency token belongs in `UpdateRuleParams.options.version`,
 * NOT in the update data body.  The framework's `updateRuleDataSchema` is strict
 * and rejects any top-level `version` key.  The caller (DetectionRulesClient) is
 * responsible for passing the token via `options.version`.
 *
 * Ref: rule-domain-model.md "How public fields map onto the stored rule" (off-table rules)
 *      rule-crud-api.md "Patch a rule with PATCH" (concurrency token via options)
 */
export function toFrameworkPatch(merged: DetectionRulePatchedInput): UpdateRuleData {
  // Empty tags: for a partial update, null explicitly clears the stored value;
  // omission would keep the stored value unchanged.
  const metadataTags: string[] | null = merged.tags.length > 0 ? merged.tags : null;

  // Schedule: always send `every`; send `lookback` only when it is set (a
  // string value) or explicitly cleared (null).  Omit it when undefined so
  // the framework does not touch the stored lookback.
  const schedulePayload: { every: string; lookback?: string | null } = {
    every: merged.schedule.interval,
  };
  if (merged.schedule.lookback !== undefined) {
    schedulePayload.lookback = merged.schedule.lookback;
  }

  const updateData: UpdateRuleData = {
    metadata: {
      name: merged.name,
      description: merged.description,
      tags: metadataTags,
      builder_fields: extractBuilderFields(merged),
      source: merged.source,
    },
    schedule: schedulePayload,
  };

  return updateData;
}

// ---------------------------------------------------------------------------
// Out direction: framework → public
// ---------------------------------------------------------------------------

/**
 * Convert a framework `RuleResponse` to the public `DetectionRuleResponse`.
 *
 * Requires that `rule.metadata.builder_type` resolves to a known public alias.
 * If it does not (deployment mismatch — API older than the stored rule), the
 * caller must handle the unknown-type case before calling here.
 *
 * Internal fields never surfaced:
 *   - `kind`, `time_field`, `grouping`, `recovery_strategy`, `no_data_strategy`,
 *     `state_transition`, `artifacts` — constant or meaningless for signal rules.
 *   - `metadata.owner`, `metadata.ownership` — internal machinery.
 *   - `metadata.version` — the mutation sequence, not the content version.
 *   - The saved-object concurrency token (`rule.version`).
 *
 * Ref: rule-domain-model.md "How public fields map onto the stored rule"
 */
export function toPublicResponse(rule: RuleResponse): DetectionRuleResponse {
  const { metadata } = rule;

  // Resolve the public type alias from the stored builder type id.
  const publicType = BUILDER_TYPE_ID_TO_ALIAS[metadata.builder_type ?? ''];
  if (!publicType) {
    throw new Error(
      `Cannot convert rule ${rule.id} to public response: ` +
        `unknown or missing builder type '${metadata.builder_type ?? '(absent)'}'`
    );
  }

  // The public `source` is metadata.source minus `version`.
  // `version` becomes the top-level public field `version`.
  const storedSource = metadata.source;
  // Reconstruct the discriminated public source shape.  Each branch must use
  // `as const` on `type` so TypeScript can resolve the discriminated union.
  let publicSource: DetectionRuleResponseBase['source'];
  if (storedSource.type === 'template') {
    publicSource = { type: 'template', id: storedSource.id };
  } else if (storedSource.type === 'external') {
    publicSource =
      storedSource.id !== undefined
        ? { type: 'external', id: storedSource.id }
        : { type: 'external' };
  } else {
    publicSource = { type: 'internal' };
  }

  // Extract detection fields from the builder_fields container.
  const bf = (metadata.builder_fields ?? {}) as Record<string, unknown>;

  const base: DetectionRuleResponseBase = {
    // Identity and audit — server-set, never writable.
    id: rule.id,
    rule_id: metadata.signature_id,
    revision: metadata.revision,
    version: storedSource.version,
    source: publicSource,
    enabled: rule.enabled,
    created_at: rule.created_at,
    created_by: rule.created_by,
    updated_at: rule.updated_at,
    updated_by: rule.updated_by,

    // Common detection fields — same key names as builder_fields keys.
    name: metadata.name,
    description: (metadata.description ?? '') as string,
    // Empty tags: read absence back as [] so the caller always gets an array.
    tags: (metadata.tags ?? []) as string[],
    severity: bf.severity as DetectionRuleResponseBase['severity'],
    risk_score: bf.risk_score as number,
    max_signals: (bf.max_signals ?? RULE_DEFAULTS.max_signals) as number,
    threat: (bf.threat ?? []) as DetectionRuleResponseBase['threat'],
    setup: (bf.setup ?? RULE_DEFAULTS.setup) as string,
    note: bf.note as string | undefined,
    references: (bf.references ?? []) as string[],
    false_positives: (bf.false_positives ?? []) as string[],
    author: (bf.author ?? []) as string[],
    license: bf.license as string | undefined,
    related_integrations: (bf.related_integrations ??
      []) as DetectionRuleResponseBase['related_integrations'],
    required_fields: (bf.required_fields ?? []) as DetectionRuleResponseBase['required_fields'],

    // Schedule: map framework field names back to public names.
    schedule: {
      interval: rule.schedule.every,
      ...(rule.schedule.lookback !== undefined ? { lookback: rule.schedule.lookback } : {}),
    },
  };

  if (publicType === 'threshold') {
    const thresholdResponse: DetectionRuleResponseBase & ThresholdRuleTypeFields = {
      ...base,
      type: 'threshold',
      index: bf.index as string[],
      query: bf.query as string,
      language: bf.language as 'kuery' | 'lucene',
      threshold: bf.threshold as ThresholdRuleTypeFields['threshold'],
    };
    return thresholdResponse;
  }

  const queryResponse: DetectionRuleResponseBase & CustomQueryRuleTypeFields = {
    ...base,
    type: 'query',
    index: bf.index as string[],
    query: bf.query as string,
    language: bf.language as 'kuery' | 'lucene',
  };
  return queryResponse;
}
