/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Detection rule create / edit form.
 *
 * Handles both create (POST) and edit (PUT) for all known detection rule types.
 *
 * --- Alias-map-driven design ---
 *
 * The type selector iterates `ALIAS_MAP` entries so it never hardcodes a list
 * of types. The alias map's per-entry `createSchema` drives client-side
 * validation: on submit, the form assembles the payload and passes it through
 * the entry's schema; errors are surfaced field-by-field.
 *
 * To detect threshold-specific fields (which require a nested sub-form), the
 * form checks `'threshold' in entry.createSchema.shape` — this is the alias-map
 * shape check, not a hardcoded type string comparison.  The threshold sub-form
 * itself is special-cased because the nested {field, value, cardinality} object
 * has no natural generic-field rendering and the alias map carries no metadata
 * about it.  See the report for the full special-case inventory.
 *
 * --- PUT is full replacement ---
 *
 * The edit form populates every writable field from the loaded rule and
 * re-submits them all. Omitting a field on PUT resets it to its default or
 * clears it. `enabled` is excluded from PUT — the enable/disable endpoints own
 * it.
 *
 * --- Skipped fields ---
 *
 * `threat`, `related_integrations`, and `required_fields` are skipped.  Each
 * requires a nested-array-of-objects editor that would be disproportionate for
 * a POC. Values present on a loaded rule are preserved in the PUT payload.
 *
 * Ref: poc-requirements.md "Step 9.2"
 *      rule-domain-model.md "The request shapes"
 *      rule-crud-api.md "Create a rule", "Replace a rule with PUT"
 */

import React, { useMemo, useCallback } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { z } from '@kbn/zod/v4';
import {
  ALIAS_MAP,
  detectionRuleCreatePropsSchema,
  detectionRuleUpdatePropsSchema,
} from '../../../common/api';
import type { DetectionRuleResponse, DetectionRuleType } from '../../../common/api';

// ---------------------------------------------------------------------------
// Local form state
// ---------------------------------------------------------------------------

/**
 * Internal string-based form state.
 *
 * All numeric and array fields are stored as strings so controlled inputs stay
 * simple. The assembler converts them to the right types before validation.
 */
export interface DetectionRuleFormState {
  /** Rule type alias (query | threshold). Locked in edit mode. */
  type: DetectionRuleType;
  // --- Common required fields ---
  name: string;
  description: string;
  severity: string;
  risk_score: string;
  // --- Common optional fields ---
  license: string;
  note: string;
  rule_id: string;
  // --- Common defaultable fields ---
  tags: string; // comma-separated
  max_signals: string;
  setup: string;
  references: string; // comma-separated
  false_positives: string; // comma-separated
  author: string; // comma-separated
  // --- Schedule ---
  schedule_interval: string;
  schedule_lookback: string; // empty string = absent
  // --- Shared type fields (both types) ---
  index: string; // comma-separated
  query: string;
  language: string;
  // --- Threshold-specific ---
  threshold_field: string; // comma-separated; empty = no grouping
  threshold_value: string;
  threshold_cardinality_field: string; // empty = no cardinality condition
  threshold_cardinality_value: string;
  // --- Create only (not sent on PUT) ---
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// Initializers
// ---------------------------------------------------------------------------

/** Default empty state for a new rule (create mode, type = 'query'). */
export const defaultFormState = (type: DetectionRuleType = 'query'): DetectionRuleFormState => ({
  type,
  name: '',
  description: '',
  severity: 'low',
  risk_score: '21',
  license: '',
  note: '',
  rule_id: '',
  tags: '',
  max_signals: '100',
  setup: '',
  references: '',
  false_positives: '',
  author: '',
  schedule_interval: '5m',
  schedule_lookback: '',
  index: '',
  query: '',
  language: 'kuery',
  threshold_field: '',
  threshold_value: '1',
  threshold_cardinality_field: '',
  threshold_cardinality_value: '',
  enabled: false,
});

/**
 * Populate form state from a loaded rule for edit mode.
 *
 * Every writable field is set from the rule's current state so the PUT payload
 * contains the complete current picture, even for fields the user does not
 * touch. Skipped fields (threat, related_integrations, required_fields) are
 * excluded from the state but re-injected into the PUT payload at submit time.
 */
export const formStateFromRule = (rule: DetectionRuleResponse): DetectionRuleFormState => {
  const base: DetectionRuleFormState = {
    type: rule.type,
    name: rule.name,
    description: rule.description,
    severity: rule.severity,
    risk_score: String(rule.risk_score),
    license: rule.license ?? '',
    note: rule.note ?? '',
    rule_id: rule.rule_id,
    tags: rule.tags.join(', '),
    max_signals: String(rule.max_signals),
    setup: rule.setup,
    references: rule.references.join(', '),
    false_positives: rule.false_positives.join(', '),
    author: rule.author.join(', '),
    schedule_interval: rule.schedule.interval,
    schedule_lookback: rule.schedule.lookback ?? '',
    index: rule.index.join(', '),
    query: rule.query,
    language: rule.language,
    threshold_field: '',
    threshold_value: '1',
    threshold_cardinality_field: '',
    threshold_cardinality_value: '',
    enabled: rule.enabled, // present in state but never sent on PUT
  };

  if (rule.type === 'threshold') {
    base.threshold_field = rule.threshold.field.join(', ');
    base.threshold_value = String(rule.threshold.value);
    if (rule.threshold.cardinality && rule.threshold.cardinality.length > 0) {
      base.threshold_cardinality_field = rule.threshold.cardinality[0].field;
      base.threshold_cardinality_value = String(rule.threshold.cardinality[0].value);
    }
  }

  return base;
};

// ---------------------------------------------------------------------------
// Payload assemblers
// ---------------------------------------------------------------------------

const parseCommaList = (s: string): string[] =>
  s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

/** Assemble a create request from form state. */
export const assembleCreatePayload = (state: DetectionRuleFormState): unknown => {
  const base = {
    type: state.type,
    name: state.name,
    description: state.description,
    severity: state.severity,
    risk_score: Number(state.risk_score),
    index: parseCommaList(state.index),
    query: state.query,
    language: state.language,
    tags: parseCommaList(state.tags),
    max_signals: Number(state.max_signals) || undefined,
    setup: state.setup || undefined,
    references: parseCommaList(state.references),
    false_positives: parseCommaList(state.false_positives),
    author: parseCommaList(state.author),
    license: state.license || undefined,
    note: state.note || undefined,
    rule_id: state.rule_id || undefined,
    schedule: {
      interval: state.schedule_interval,
      ...(state.schedule_lookback ? { lookback: state.schedule_lookback } : {}),
    },
    enabled: state.enabled,
  };

  if (state.type === 'threshold') {
    const cardinality = state.threshold_cardinality_field
      ? [
          {
            field: state.threshold_cardinality_field,
            value: Number(state.threshold_cardinality_value) || 0,
          },
        ]
      : undefined;

    return {
      ...base,
      threshold: {
        field: parseCommaList(state.threshold_field),
        value: Number(state.threshold_value) || 1,
        ...(cardinality ? { cardinality } : {}),
      },
    };
  }

  return base;
};

/**
 * Assemble a PUT (full replacement) request from form state.
 *
 * `enabled` is excluded — the enable/disable endpoints own it.
 * Skipped fields (threat, related_integrations, required_fields) are re-injected
 * from the original rule so the PUT does not wipe them.
 */
export const assembleUpdatePayload = (
  state: DetectionRuleFormState,
  originalRule: DetectionRuleResponse
): unknown => {
  const base = {
    type: state.type,
    name: state.name,
    description: state.description,
    severity: state.severity,
    risk_score: Number(state.risk_score),
    index: parseCommaList(state.index),
    query: state.query,
    language: state.language,
    tags: parseCommaList(state.tags),
    max_signals: Number(state.max_signals) || undefined,
    setup: state.setup || undefined,
    references: parseCommaList(state.references),
    false_positives: parseCommaList(state.false_positives),
    author: parseCommaList(state.author),
    license: state.license || undefined,
    note: state.note || undefined,
    rule_id: state.rule_id || undefined,
    version: originalRule.version,
    // Re-inject skipped fields from the original to avoid silently wiping them.
    threat: originalRule.threat,
    related_integrations: originalRule.related_integrations,
    required_fields: originalRule.required_fields,
    schedule: {
      interval: state.schedule_interval,
      ...(state.schedule_lookback ? { lookback: state.schedule_lookback } : {}),
    },
  };

  if (state.type === 'threshold') {
    const cardinality = state.threshold_cardinality_field
      ? [
          {
            field: state.threshold_cardinality_field,
            value: Number(state.threshold_cardinality_value) || 0,
          },
        ]
      : undefined;

    return {
      ...base,
      threshold: {
        field: parseCommaList(state.threshold_field),
        value: Number(state.threshold_value) || 1,
        ...(cardinality ? { cardinality } : {}),
      },
    };
  }

  return base;
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type FieldErrors = Record<string, string[]>;

/** Run the appropriate Zod schema against the assembled payload. */
export const validatePayload = (payload: unknown, mode: 'create' | 'edit'): FieldErrors => {
  const schema: z.ZodType =
    mode === 'create' ? detectionRuleCreatePropsSchema : detectionRuleUpdatePropsSchema;
  const result = schema.safeParse(payload);
  if (result.success) {
    return {};
  }

  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.') || '_root';
    if (!errors[path]) errors[path] = [];
    errors[path].push(issue.message);
  }
  return errors;
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DetectionRuleFormProps {
  /** Present in edit mode — the rule to populate from. */
  ruleToEdit?: DetectionRuleResponse;
  /** Form state from the parent component. */
  formState: DetectionRuleFormState;
  /** Field-level errors from the last validation run. */
  errors: FieldErrors;
  /** Whether the form submit is in progress. */
  isSubmitting: boolean;
  /** Whether the form submit errored. */
  submitError: string | null;
  /** Called with the next state on any field change. */
  onChange: (next: DetectionRuleFormState) => void;
  /** Called when the user confirms the form. Assembles and validates internally. */
  onSubmit: () => void;
  /** Called when the user cancels. */
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Form component
// ---------------------------------------------------------------------------

/**
 * Renders the create/edit form.
 *
 * Create mode: type selector, all fields, `enabled` toggle.
 * Edit mode: type fixed (shown as label), all fields, no `enabled`.
 */
export const DetectionRuleForm: React.FC<DetectionRuleFormProps> = ({
  ruleToEdit,
  formState,
  errors,
  isSubmitting,
  submitError,
  onChange,
  onSubmit,
  onCancel,
}) => {
  const isEditMode = Boolean(ruleToEdit);

  // Look up the alias map entry for the current type.
  // The shape check `'threshold' in entry.createSchema.shape` decides whether
  // to render threshold-specific fields — the form reads this from the map, not
  // from a hardcoded alias string, so a new type with a `threshold` field in
  // its createSchema would automatically get the threshold sub-form.
  const aliasEntry = useMemo(
    () => ALIAS_MAP.find((e) => e.alias === formState.type) ?? ALIAS_MAP[0],
    [formState.type]
  );

  const isThresholdType = useMemo(() => {
    const schema = aliasEntry.createSchema as z.ZodObject<Record<string, z.ZodType>>;
    return 'threshold' in (schema.shape ?? {});
  }, [aliasEntry]);

  const set = useCallback(
    <K extends keyof DetectionRuleFormState>(key: K, value: DetectionRuleFormState[K]) => {
      onChange({ ...formState, [key]: value });
    },
    [formState, onChange]
  );

  const fieldError = (path: string): string | undefined => errors[path]?.[0];

  return (
    <div data-test-subj="detectionRuleForm">
      {/* Submit error callout */}
      {submitError && (
        <>
          <EuiCallOut
            announceOnMount
            title={i18n.translate('xpack.securityDetections.ruleForm.submitError', {
              defaultMessage: 'Failed to save rule',
            })}
            color="danger"
            iconType="warning"
            data-test-subj="ruleFormSubmitError"
          >
            <p>{submitError}</p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}

      {/* Type selector / display */}
      {isEditMode ? (
        <EuiFormRow
          label={i18n.translate('xpack.securityDetections.ruleForm.field.type', {
            defaultMessage: 'Rule type',
          })}
        >
          <EuiFieldText value={formState.type} readOnly data-test-subj="ruleFormTypeDisplay" />
        </EuiFormRow>
      ) : (
        <EuiFormRow
          label={i18n.translate('xpack.securityDetections.ruleForm.field.type', {
            defaultMessage: 'Rule type',
          })}
        >
          <EuiSelect
            options={ALIAS_MAP.map((e) => ({ value: e.alias, text: e.alias }))}
            value={formState.type}
            onChange={(ev) => set('type', ev.target.value as DetectionRuleType)}
            data-test-subj="ruleFormTypeSelect"
          />
        </EuiFormRow>
      )}

      <EuiSpacer size="m" />

      {/* Common required fields */}
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.securityDetections.ruleForm.section.common', {
            defaultMessage: 'Common fields',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      <EuiFormRow
        label={i18n.translate('xpack.securityDetections.ruleForm.field.name', {
          defaultMessage: 'Name',
        })}
        isInvalid={Boolean(fieldError('name'))}
        error={fieldError('name')}
      >
        <EuiFieldText
          value={formState.name}
          onChange={(ev) => set('name', ev.target.value)}
          isInvalid={Boolean(fieldError('name'))}
          data-test-subj="ruleFormName"
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('xpack.securityDetections.ruleForm.field.description', {
          defaultMessage: 'Description',
        })}
        isInvalid={Boolean(fieldError('description'))}
        error={fieldError('description')}
      >
        <EuiTextArea
          value={formState.description}
          onChange={(ev) => set('description', ev.target.value)}
          isInvalid={Boolean(fieldError('description'))}
          rows={3}
          data-test-subj="ruleFormDescription"
        />
      </EuiFormRow>

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate('xpack.securityDetections.ruleForm.field.severity', {
              defaultMessage: 'Severity',
            })}
            isInvalid={Boolean(fieldError('severity'))}
            error={fieldError('severity')}
          >
            <EuiSelect
              options={[
                { value: 'low', text: 'Low' },
                { value: 'medium', text: 'Medium' },
                { value: 'high', text: 'High' },
                { value: 'critical', text: 'Critical' },
              ]}
              value={formState.severity}
              onChange={(ev) => set('severity', ev.target.value)}
              isInvalid={Boolean(fieldError('severity'))}
              data-test-subj="ruleFormSeverity"
            />
          </EuiFormRow>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate('xpack.securityDetections.ruleForm.field.riskScore', {
              defaultMessage: 'Risk score (0–100)',
            })}
            isInvalid={Boolean(fieldError('risk_score'))}
            error={fieldError('risk_score')}
          >
            <EuiFieldNumber
              value={formState.risk_score}
              onChange={(ev) => set('risk_score', ev.target.value)}
              min={0}
              max={100}
              isInvalid={Boolean(fieldError('risk_score'))}
              data-test-subj="ruleFormRiskScore"
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      {/* Common defaultable fields */}
      <EuiFormRow
        label={i18n.translate('xpack.securityDetections.ruleForm.field.tags', {
          defaultMessage: 'Tags (comma-separated)',
        })}
        isInvalid={Boolean(fieldError('tags'))}
        error={fieldError('tags')}
      >
        <EuiFieldText
          value={formState.tags}
          onChange={(ev) => set('tags', ev.target.value)}
          placeholder="prod, linux, endpoint"
          isInvalid={Boolean(fieldError('tags'))}
          data-test-subj="ruleFormTags"
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('xpack.securityDetections.ruleForm.field.maxSignals', {
          defaultMessage: 'Max signals',
        })}
        isInvalid={Boolean(fieldError('max_signals'))}
        error={fieldError('max_signals')}
      >
        <EuiFieldNumber
          value={formState.max_signals}
          onChange={(ev) => set('max_signals', ev.target.value)}
          min={1}
          isInvalid={Boolean(fieldError('max_signals'))}
          data-test-subj="ruleFormMaxSignals"
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('xpack.securityDetections.ruleForm.field.references', {
          defaultMessage: 'References (comma-separated URLs)',
        })}
        isInvalid={Boolean(fieldError('references'))}
        error={fieldError('references')}
      >
        <EuiFieldText
          value={formState.references}
          onChange={(ev) => set('references', ev.target.value)}
          placeholder="https://example.com/ref1, https://example.com/ref2"
          isInvalid={Boolean(fieldError('references'))}
          data-test-subj="ruleFormReferences"
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('xpack.securityDetections.ruleForm.field.falsePotives', {
          defaultMessage: 'False positives (comma-separated)',
        })}
        isInvalid={Boolean(fieldError('false_positives'))}
        error={fieldError('false_positives')}
      >
        <EuiFieldText
          value={formState.false_positives}
          onChange={(ev) => set('false_positives', ev.target.value)}
          isInvalid={Boolean(fieldError('false_positives'))}
          data-test-subj="ruleFormFalsePositives"
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('xpack.securityDetections.ruleForm.field.author', {
          defaultMessage: 'Author (comma-separated)',
        })}
        isInvalid={Boolean(fieldError('author'))}
        error={fieldError('author')}
      >
        <EuiFieldText
          value={formState.author}
          onChange={(ev) => set('author', ev.target.value)}
          isInvalid={Boolean(fieldError('author'))}
          data-test-subj="ruleFormAuthor"
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('xpack.securityDetections.ruleForm.field.license', {
          defaultMessage: 'License',
        })}
        isInvalid={Boolean(fieldError('license'))}
        error={fieldError('license')}
      >
        <EuiFieldText
          value={formState.license}
          onChange={(ev) => set('license', ev.target.value)}
          placeholder="Elastic License 2.0"
          isInvalid={Boolean(fieldError('license'))}
          data-test-subj="ruleFormLicense"
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('xpack.securityDetections.ruleForm.field.note', {
          defaultMessage: 'Investigation guide (note)',
        })}
        isInvalid={Boolean(fieldError('note'))}
        error={fieldError('note')}
      >
        <EuiTextArea
          value={formState.note}
          onChange={(ev) => set('note', ev.target.value)}
          rows={2}
          isInvalid={Boolean(fieldError('note'))}
          data-test-subj="ruleFormNote"
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('xpack.securityDetections.ruleForm.field.setup', {
          defaultMessage: 'Setup guide',
        })}
        isInvalid={Boolean(fieldError('setup'))}
        error={fieldError('setup')}
      >
        <EuiTextArea
          value={formState.setup}
          onChange={(ev) => set('setup', ev.target.value)}
          rows={2}
          isInvalid={Boolean(fieldError('setup'))}
          data-test-subj="ruleFormSetup"
        />
      </EuiFormRow>

      {/* Schedule */}
      <EuiSpacer size="m" />
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.securityDetections.ruleForm.section.schedule', {
            defaultMessage: 'Schedule',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate('xpack.securityDetections.ruleForm.field.interval', {
              defaultMessage: 'Interval (e.g. 5m, 1h)',
            })}
            isInvalid={Boolean(fieldError('schedule.interval'))}
            error={fieldError('schedule.interval')}
          >
            <EuiFieldText
              value={formState.schedule_interval}
              onChange={(ev) => set('schedule_interval', ev.target.value)}
              isInvalid={Boolean(fieldError('schedule.interval'))}
              data-test-subj="ruleFormScheduleInterval"
            />
          </EuiFormRow>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate('xpack.securityDetections.ruleForm.field.lookback', {
              defaultMessage: 'Lookback (optional, e.g. 6m)',
            })}
            isInvalid={Boolean(fieldError('schedule.lookback'))}
            error={fieldError('schedule.lookback')}
          >
            <EuiFieldText
              value={formState.schedule_lookback}
              onChange={(ev) => set('schedule_lookback', ev.target.value)}
              placeholder="6m"
              isInvalid={Boolean(fieldError('schedule.lookback'))}
              data-test-subj="ruleFormScheduleLookback"
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      {/* Type-specific fields */}
      <EuiSpacer size="m" />
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.securityDetections.ruleForm.section.typeSpecific', {
            defaultMessage: 'Detection query',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      <EuiFormRow
        label={i18n.translate('xpack.securityDetections.ruleForm.field.index', {
          defaultMessage: 'Index patterns (comma-separated)',
        })}
        isInvalid={Boolean(fieldError('index'))}
        error={fieldError('index')}
      >
        <EuiFieldText
          value={formState.index}
          onChange={(ev) => set('index', ev.target.value)}
          placeholder="logs-*, metrics-*"
          isInvalid={Boolean(fieldError('index'))}
          data-test-subj="ruleFormIndex"
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('xpack.securityDetections.ruleForm.field.query', {
          defaultMessage: 'Query',
        })}
        isInvalid={Boolean(fieldError('query'))}
        error={fieldError('query')}
        helpText={
          formState.type === 'threshold'
            ? i18n.translate('xpack.securityDetections.ruleForm.field.queryHelp.threshold', {
                defaultMessage: 'Optional pre-filter (empty = match all).',
              })
            : i18n.translate('xpack.securityDetections.ruleForm.field.queryHelp.query', {
                defaultMessage: 'Required. KQL or Lucene query.',
              })
        }
      >
        <EuiTextArea
          value={formState.query}
          onChange={(ev) => set('query', ev.target.value)}
          rows={3}
          isInvalid={Boolean(fieldError('query'))}
          data-test-subj="ruleFormQuery"
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('xpack.securityDetections.ruleForm.field.language', {
          defaultMessage: 'Query language',
        })}
        isInvalid={Boolean(fieldError('language'))}
        error={fieldError('language')}
      >
        <EuiSelect
          options={[
            { value: 'kuery', text: 'KQL' },
            { value: 'lucene', text: 'Lucene' },
          ]}
          value={formState.language}
          onChange={(ev) => set('language', ev.target.value)}
          isInvalid={Boolean(fieldError('language'))}
          data-test-subj="ruleFormLanguage"
        />
      </EuiFormRow>

      {/* Threshold-specific fields — detected from alias map shape, rendered specially */}
      {isThresholdType && (
        <>
          <EuiSpacer size="m" />
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.securityDetections.ruleForm.section.threshold', {
                defaultMessage: 'Threshold',
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />

          <EuiFormRow
            label={i18n.translate('xpack.securityDetections.ruleForm.field.thresholdField', {
              defaultMessage: 'Group-by fields (comma-separated, empty = no grouping)',
            })}
            isInvalid={Boolean(fieldError('threshold.field'))}
            error={fieldError('threshold.field')}
          >
            <EuiFieldText
              value={formState.threshold_field}
              onChange={(ev) => set('threshold_field', ev.target.value)}
              placeholder="source.ip, destination.port"
              isInvalid={Boolean(fieldError('threshold.field'))}
              data-test-subj="ruleFormThresholdField"
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.securityDetections.ruleForm.field.thresholdValue', {
              defaultMessage: 'Threshold count (minimum occurrences)',
            })}
            isInvalid={Boolean(fieldError('threshold.value'))}
            error={fieldError('threshold.value')}
          >
            <EuiFieldNumber
              value={formState.threshold_value}
              onChange={(ev) => set('threshold_value', ev.target.value)}
              min={1}
              isInvalid={Boolean(fieldError('threshold.value'))}
              data-test-subj="ruleFormThresholdValue"
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate(
              'xpack.securityDetections.ruleForm.field.thresholdCardinalityField',
              {
                defaultMessage: 'Cardinality field (optional)',
              }
            )}
            isInvalid={Boolean(fieldError('threshold.cardinality.0.field'))}
            error={fieldError('threshold.cardinality.0.field')}
            helpText={i18n.translate(
              'xpack.securityDetections.ruleForm.field.thresholdCardinalityHelp',
              {
                defaultMessage: 'Leave empty to skip the distinct-count condition.',
              }
            )}
          >
            <EuiFieldText
              value={formState.threshold_cardinality_field}
              onChange={(ev) => set('threshold_cardinality_field', ev.target.value)}
              placeholder="user.name"
              isInvalid={Boolean(fieldError('threshold.cardinality.0.field'))}
              data-test-subj="ruleFormThresholdCardinalityField"
            />
          </EuiFormRow>

          {formState.threshold_cardinality_field && (
            <EuiFormRow
              label={i18n.translate(
                'xpack.securityDetections.ruleForm.field.thresholdCardinalityValue',
                {
                  defaultMessage: 'Cardinality minimum (distinct count)',
                }
              )}
              isInvalid={Boolean(fieldError('threshold.cardinality.0.value'))}
              error={fieldError('threshold.cardinality.0.value')}
            >
              <EuiFieldNumber
                value={formState.threshold_cardinality_value}
                onChange={(ev) => set('threshold_cardinality_value', ev.target.value)}
                min={0}
                isInvalid={Boolean(fieldError('threshold.cardinality.0.value'))}
                data-test-subj="ruleFormThresholdCardinalityValue"
              />
            </EuiFormRow>
          )}
        </>
      )}

      {/* Create-only: enabled toggle */}
      {!isEditMode && (
        <>
          <EuiSpacer size="m" />
          <EuiFormRow
            label={i18n.translate('xpack.securityDetections.ruleForm.field.enabled', {
              defaultMessage: 'Enable rule after creation',
            })}
          >
            <EuiSwitch
              label={
                formState.enabled
                  ? i18n.translate('xpack.securityDetections.ruleForm.field.enabled.on', {
                      defaultMessage: 'Enabled',
                    })
                  : i18n.translate('xpack.securityDetections.ruleForm.field.enabled.off', {
                      defaultMessage: 'Disabled',
                    })
              }
              checked={formState.enabled}
              onChange={(ev) => set('enabled', ev.target.checked)}
              data-test-subj="ruleFormEnabled"
            />
          </EuiFormRow>
        </>
      )}

      {/* Actions */}
      <EuiSpacer size="l" />
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={onCancel} data-test-subj="ruleFormCancel">
            {i18n.translate('xpack.securityDetections.ruleForm.cancel', {
              defaultMessage: 'Cancel',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            isLoading={isSubmitting}
            onClick={onSubmit}
            data-test-subj="ruleFormSubmit"
          >
            {isEditMode
              ? i18n.translate('xpack.securityDetections.ruleForm.save', {
                  defaultMessage: 'Save changes',
                })
              : i18n.translate('xpack.securityDetections.ruleForm.create', {
                  defaultMessage: 'Create rule',
                })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
