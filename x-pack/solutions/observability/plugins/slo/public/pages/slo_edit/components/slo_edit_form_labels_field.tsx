/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';
import type { CreateSLOForm } from '../types';
import { OptionalText } from './common/optional_text';

export function SloEditFormLabelsField() {
  const { control } = useFormContext<CreateSLOForm>();
  const { fields, append, remove } = useFieldArray({ control, name: 'labels' });

  return (
    <EuiFormRow
      fullWidth
      label={i18n.translate('xpack.slo.sloEdit.labels.label', {
        defaultMessage: 'Labels',
      })}
      labelAppend={<OptionalText />}
      helpText={i18n.translate('xpack.slo.sloEdit.labels.helpText', {
        defaultMessage:
          'Add structured key/value pairs to enrich this SLO with business context (e.g. team, cost_center).',
      })}
    >
      <div>
        {fields.map((field, index) => (
          <React.Fragment key={field.id}>
            <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
              <EuiFlexItem>
                <Controller
                  name={`labels.${index}.key`}
                  control={control}
                  defaultValue={field.key}
                  rules={{ required: true }}
                  render={({ field: { ref, ...keyField }, fieldState }) => (
                    <EuiFieldText
                      {...keyField}
                      fullWidth
                      isInvalid={fieldState.invalid}
                      data-test-subj={`sloEditLabelsKeyInput${index}`}
                      aria-label={i18n.translate('xpack.slo.sloEdit.labels.keyAriaLabel', {
                        defaultMessage: 'Label key',
                      })}
                      placeholder={i18n.translate('xpack.slo.sloEdit.labels.keyPlaceholder', {
                        defaultMessage: 'Key',
                      })}
                    />
                  )}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <Controller
                  name={`labels.${index}.value`}
                  control={control}
                  defaultValue={field.value}
                  render={({ field: { ref, ...valueField } }) => (
                    <EuiFieldText
                      {...valueField}
                      fullWidth
                      data-test-subj={`sloEditLabelsValueInput${index}`}
                      aria-label={i18n.translate('xpack.slo.sloEdit.labels.valueAriaLabel', {
                        defaultMessage: 'Label value',
                      })}
                      placeholder={i18n.translate('xpack.slo.sloEdit.labels.valuePlaceholder', {
                        defaultMessage: 'Value',
                      })}
                    />
                  )}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="trash"
                  color="danger"
                  display="base"
                  size="m"
                  data-test-subj={`sloEditLabelsRemoveButton${index}`}
                  aria-label={i18n.translate('xpack.slo.sloEdit.labels.removeAriaLabel', {
                    defaultMessage: 'Remove label entry',
                  })}
                  onClick={() => remove(index)}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="xs" />
          </React.Fragment>
        ))}
        <EuiButtonEmpty
          iconType="plusInCircle"
          size="s"
          flush="left"
          data-test-subj="sloEditLabelsAddButton"
          onClick={() => append({ key: '', value: '' })}
        >
          {i18n.translate('xpack.slo.sloEdit.labels.addButtonLabel', {
            defaultMessage: 'Add label',
          })}
        </EuiButtonEmpty>
      </div>
    </EuiFormRow>
  );
}
