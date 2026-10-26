/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { LIMITS, type ValueType, type VariationValue } from '../../../common';

export const VariationSelect = ({
  variations,
  value,
  disabled,
  ariaLabel,
  onChange,
}: {
  variations: readonly VariationValue[];
  value: VariationValue;
  disabled: boolean;
  ariaLabel: string;
  onChange: (value: VariationValue) => void;
}) => (
  <EuiSelect
    data-ebt-action="changeSelection"
    data-ebt-element="featureFlagsManagement"
    data-test-subj="featureFlagsManagementVariationSelectSelect"
    fullWidth
    disabled={disabled}
    aria-label={ariaLabel}
    value={String(value)}
    options={variations.map((variation) => ({
      value: String(variation),
      text: String(variation),
    }))}
    onChange={(event) => {
      const next = variations.find((variation) => String(variation) === event.target.value);
      if (next !== undefined) {
        onChange(next);
      }
    }}
  />
);

export const VariationFields = ({
  valueType,
  variations,
  readOnly,
  onChange,
}: {
  valueType: ValueType;
  variations: VariationValue[];
  readOnly: boolean;
  onChange: (variations: VariationValue[]) => void;
}) => {
  if (valueType === 'boolean') {
    return (
      <EuiText size="s">
        <p>
          <FormattedMessage
            id="xpack.featureFlagsManagement.flags.editor.booleanVariationsDescription"
            defaultMessage="Boolean flags serve {trueValue} or {falseValue}."
            values={{ trueValue: 'true', falseValue: 'false' }}
          />
        </p>
      </EuiText>
    );
  }

  const update = (index: number, value: VariationValue) => {
    const next = [...variations];
    next[index] = value;
    onChange(next);
  };

  return (
    <>
      {variations.map((variation, index) => (
        <React.Fragment key={index}>
          {index > 0 && <EuiSpacer size="s" />}
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem>
              {valueType === 'number' ? (
                <EuiFieldNumber
                  data-test-subj="featureFlagsManagementVariationFieldsFieldNumber"
                  fullWidth
                  disabled={readOnly}
                  value={typeof variation === 'number' ? variation : 0}
                  aria-label={i18n.translate(
                    'xpack.featureFlagsManagement.flags.editor.numberVariationAriaLabel',
                    { defaultMessage: 'Variation {number}', values: { number: index + 1 } }
                  )}
                  onChange={(event) => {
                    if (event.target.value === '') {
                      return;
                    }
                    const parsed = Number(event.target.value);
                    if (!Number.isNaN(parsed)) {
                      update(index, parsed);
                    }
                  }}
                />
              ) : (
                <EuiFieldText
                  data-test-subj="featureFlagsManagementVariationFieldsFieldText"
                  fullWidth
                  disabled={readOnly}
                  value={typeof variation === 'string' ? variation : ''}
                  maxLength={LIMITS.stringValueMaxLength}
                  aria-label={i18n.translate(
                    'xpack.featureFlagsManagement.flags.editor.stringVariationAriaLabel',
                    { defaultMessage: 'Variation {number}', values: { number: index + 1 } }
                  )}
                  onChange={(event) => update(index, event.target.value)}
                />
              )}
            </EuiFlexItem>
            {!readOnly && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-ebt-action="deleteFlag"
                  data-ebt-element="featureFlagsManagement"
                  data-test-subj="featureFlagsManagementVariationFieldsRemoveButton"
                  color="danger"
                  iconType="trash"
                  disabled={variations.length <= LIMITS.minVariations}
                  aria-label={i18n.translate(
                    'xpack.featureFlagsManagement.flags.editor.removeVariationAriaLabel',
                    { defaultMessage: 'Remove variation {number}', values: { number: index + 1 } }
                  )}
                  onClick={() =>
                    onChange(variations.filter((_, variationIndex) => variationIndex !== index))
                  }
                >
                  <FormattedMessage
                    id="xpack.featureFlagsManagement.flags.editor.removeVariationButtonLabel"
                    defaultMessage="Remove"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </React.Fragment>
      ))}
      {!readOnly && (
        <>
          <EuiSpacer size="s" />
          <EuiButtonEmpty
            data-ebt-action="confirm"
            data-ebt-element="featureFlagsManagement"
            data-test-subj="featureFlagsManagementVariationFieldsAddVariationButton"
            size="s"
            iconType="plus"
            disabled={variations.length >= LIMITS.maxVariations}
            onClick={() => onChange([...variations, valueType === 'number' ? 0 : ''])}
          >
            <FormattedMessage
              id="xpack.featureFlagsManagement.flags.editor.addVariationButtonLabel"
              defaultMessage="Add variation"
            />
          </EuiButtonEmpty>
        </>
      )}
    </>
  );
};

export const VariationFormRow = ({
  label,
  variations,
  value,
  disabled,
  onChange,
}: {
  label: React.ReactNode;
  variations: readonly VariationValue[];
  value: VariationValue;
  disabled: boolean;
  onChange: (value: VariationValue) => void;
}) => (
  <EuiFormRow fullWidth label={label}>
    <VariationSelect
      variations={variations}
      value={value}
      disabled={disabled}
      ariaLabel={i18n.translate(
        'xpack.featureFlagsManagement.flags.editor.variationSelectAriaLabel',
        {
          defaultMessage: 'Variation',
        }
      )}
      onChange={onChange}
    />
  </EuiFormRow>
);
