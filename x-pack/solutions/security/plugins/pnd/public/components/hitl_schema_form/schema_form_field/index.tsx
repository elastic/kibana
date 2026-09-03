/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiComboBox,
  EuiFieldNumber,
  EuiFieldText,
  EuiFormRow,
  EuiScreenReaderOnly,
  EuiSelect,
  EuiSwitch,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { css } from '@emotion/react';

import { resolveFieldControl } from '../helpers/resolve_field_control';
import * as i18n from '../translations';
import type { PndSchemaFormEnumMember, PndSchemaFormFieldSchema } from '../types';

/**
 * `_respond` bounds `rationale` at 2000 characters
 * (`respond_to_proposal_route.gen.ts`), and `rationale` is a schema-driven field
 * now rather than a bespoke textarea — so the bound moves here with it. Applied
 * to every string field, because a value this form cannot submit is a value it
 * should not have let the analyst type.
 */
export const MAX_SCHEMA_STRING_LENGTH = 2000;

export interface SchemaFormFieldProps {
  disabled?: boolean;
  /** A validation message for this field, rendered in place. */
  error?: string;
  field: PndSchemaFormFieldSchema;
  isRequired?: boolean;
  /** The property name, which is also the key the answer is reported under. */
  name: string;
  /** Reports the new value, or `undefined` once the field is emptied. */
  onChange: (next: unknown) => void;
  value: unknown;
}

const toComboBoxOption = (choice: PndSchemaFormEnumMember): EuiComboBoxOptionOption<string> => ({
  label: String(choice),
  value: String(choice),
});

/**
 * One row of the schema-driven HITL form: a label, a help text, a control
 * chosen by {@link resolveFieldControl}, and an inline validation message.
 *
 * Emptying a control reports `undefined` rather than `''` or `NaN`, so the form
 * above can drop the key entirely and send `_respond` a body with the field
 * absent instead of a body with the field present and meaningless.
 */
export const SchemaFormField: React.FC<SchemaFormFieldProps> = ({
  disabled = false,
  error,
  field,
  isRequired = false,
  name,
  onChange,
  value,
}) => {
  const { euiTheme } = useEuiTheme();
  const control = resolveFieldControl(field);
  const isInvalid = error != null;
  const label = field.title ?? name;
  const controlTestSubj = `pndSchemaFormControl-${name}`;
  // `EuiSelect` and `EuiComboBox` are required to name themselves, so they
  // cannot pick the required marker up from the form row's label the way the
  // text and number fields do.
  const controlAriaLabel = isRequired ? i18n.requiredFieldAriaLabel(label) : label;

  // EuiFormRow has no `isRequired`, so the marker is drawn here. The asterisk is
  // decorative and the word beside it is what a screen reader announces.
  const labelNode = isRequired ? (
    <>
      {label}{' '}
      <span
        aria-hidden={true}
        css={css`
          color: ${euiTheme.colors.textDanger};
        `}
        data-test-subj={`pndSchemaFormRequired-${name}`}
      >
        {'*'}
      </span>
      <EuiScreenReaderOnly>
        <span>{i18n.REQUIRED_FIELD}</span>
      </EuiScreenReaderOnly>
    </>
  ) : (
    label
  );

  const renderControl = (): React.ReactElement => {
    if (control === 'select') {
      return (
        <EuiSelect
          aria-label={controlAriaLabel}
          data-test-subj={controlTestSubj}
          disabled={disabled}
          fullWidth
          isInvalid={isInvalid}
          onChange={(event) => {
            const raw = event.target.value;

            if (raw === '') {
              onChange(undefined);
              return;
            }

            onChange(field.type === 'number' ? Number(raw) : raw);
          }}
          options={[
            { text: i18n.SELECT_PLACEHOLDER, value: '' },
            ...(field.enum ?? []).map((choice) => ({
              text: String(choice),
              value: String(choice),
            })),
          ]}
          value={value == null ? '' : String(value)}
        />
      );
    }

    if (control === 'switch') {
      return (
        <EuiSwitch
          checked={value === true}
          data-test-subj={controlTestSubj}
          disabled={disabled}
          label={labelNode}
          onChange={(event) => onChange(event.target.checked)}
        />
      );
    }

    if (control === 'fieldNumber') {
      return (
        <EuiFieldNumber
          data-test-subj={controlTestSubj}
          disabled={disabled}
          fullWidth
          isInvalid={isInvalid}
          onChange={(event) => {
            const raw = event.target.value;

            onChange(raw === '' ? undefined : Number(raw));
          }}
          value={typeof value === 'number' ? value : ''}
        />
      );
    }

    if (control === 'comboBox') {
      return (
        <EuiComboBox<string>
          aria-label={controlAriaLabel}
          data-test-subj={controlTestSubj}
          fullWidth
          isDisabled={disabled}
          isInvalid={isInvalid}
          onChange={(next) => onChange(next.map((option) => option.value ?? option.label))}
          options={(field.items?.enum ?? []).map(toComboBoxOption)}
          selectedOptions={Array.isArray(value) ? value.map(toComboBoxOption) : []}
        />
      );
    }

    return (
      <EuiFieldText
        data-test-subj={controlTestSubj}
        disabled={disabled}
        fullWidth
        isInvalid={isInvalid}
        maxLength={MAX_SCHEMA_STRING_LENGTH}
        onChange={(event) => {
          const raw = event.target.value;

          onChange(raw === '' ? undefined : raw);
        }}
        value={typeof value === 'string' ? value : ''}
      />
    );
  };

  // A switch carries its own label, so repeating it on the row would render the
  // text twice and associate the control with neither copy.
  const isSwitch = control === 'switch';

  return (
    <EuiFormRow
      error={error}
      fullWidth
      hasChildLabel={!isSwitch}
      helpText={field.description}
      isInvalid={isInvalid}
      label={isSwitch ? undefined : labelNode}
    >
      {renderControl()}
    </EuiFormRow>
  );
};
