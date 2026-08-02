/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiForm, EuiFormRow, EuiSelect, EuiTextArea } from '@elastic/eui';

import { MAX_SCHEMA_STRING_LENGTH } from '../../hitl_schema_form';
import {
  FIXED_DECISION_NAME,
  FIXED_RATIONALE_NAME,
} from '../helpers/validate_fixed_decision_values';
import * as i18n from '../translations';

const DECISION_OPTIONS = [
  { text: i18n.SELECT_PLACEHOLDER, value: '' },
  { text: i18n.APPROVE, value: 'approve' },
  { text: i18n.DISMISS, value: 'dismiss' },
];

export interface FixedDecisionFormProps {
  disabled?: boolean;
  /** Validation messages keyed by field name. @see validateFixedDecisionValues */
  errors?: Record<string, string | undefined>;
  /** Reports the whole answer set, so the caller owns the values. */
  onChange: (values: Record<string, unknown>) => void;
  values: Record<string, unknown>;
}

/**
 * The gate's answer when its `inputSchema` cannot drive the form.
 *
 * This is not a theoretical branch: `canRenderWithSchemaForm` is fail-closed
 * and answers `false` for the `{}` that every PND row carries whenever its gate
 * declared no schema, so on a dev stack this is often the branch on screen.
 *
 * It draws by hand exactly what `_respond` requires — the closed decision enum
 * and a rationale — and it reports its answers in the same shape `SchemaForm`
 * does, including dropping a key when its field is emptied, so the card can
 * submit either branch's values without knowing which one it rendered.
 */
export const FixedDecisionForm: React.FC<FixedDecisionFormProps> = ({
  disabled = false,
  errors = {},
  onChange,
  values,
}) => {
  const decisionError = errors[FIXED_DECISION_NAME];
  const rationaleError = errors[FIXED_RATIONALE_NAME];

  const report = (name: string, next: unknown) => {
    const { [name]: removed, ...rest } = values;

    onChange(next === undefined ? rest : { ...rest, [name]: next });
  };

  return (
    <EuiForm component="div" data-test-subj="pndFixedDecisionForm">
      <EuiFormRow
        error={decisionError}
        fullWidth
        isInvalid={decisionError != null}
        label={i18n.DECISION_LABEL}
      >
        <EuiSelect
          // `EuiSelect` is required to name itself; the form row's label does
          // not satisfy `@elastic/eui/no-unnamed-interactive-element`.
          aria-label={i18n.DECISION_LABEL}
          data-test-subj={`pndFixedDecisionFormControl-${FIXED_DECISION_NAME}`}
          disabled={disabled}
          fullWidth
          isInvalid={decisionError != null}
          onChange={(event) => {
            const raw = event.target.value;

            report(FIXED_DECISION_NAME, raw === '' ? undefined : raw);
          }}
          options={DECISION_OPTIONS}
          value={
            typeof values[FIXED_DECISION_NAME] === 'string'
              ? String(values[FIXED_DECISION_NAME])
              : ''
          }
        />
      </EuiFormRow>
      <EuiFormRow
        error={rationaleError}
        fullWidth
        helpText={i18n.RATIONALE_HELP}
        isInvalid={rationaleError != null}
        label={i18n.RATIONALE_LABEL}
      >
        <EuiTextArea
          data-test-subj={`pndFixedDecisionFormControl-${FIXED_RATIONALE_NAME}`}
          disabled={disabled}
          fullWidth
          isInvalid={rationaleError != null}
          maxLength={MAX_SCHEMA_STRING_LENGTH}
          onChange={(event) => {
            const raw = event.target.value;

            report(FIXED_RATIONALE_NAME, raw === '' ? undefined : raw);
          }}
          value={
            typeof values[FIXED_RATIONALE_NAME] === 'string'
              ? String(values[FIXED_RATIONALE_NAME])
              : ''
          }
        />
      </EuiFormRow>
    </EuiForm>
  );
};
