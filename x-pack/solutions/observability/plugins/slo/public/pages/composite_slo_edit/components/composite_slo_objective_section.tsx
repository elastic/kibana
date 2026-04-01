/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFieldNumber,
  EuiFlexGrid,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiPanel,
  EuiSelect,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { COMPOSITE_ROLLING_TIMEWINDOW_OPTIONS, MAX_WIDTH } from '../constants';
import type { CreateCompositeSLOForm } from '../types';

export function CompositeSloObjectiveSection() {
  const { control, getFieldState } = useFormContext<CreateCompositeSLOForm>();
  const timeWindowSelect = useGeneratedHtmlId({ prefix: 'compositeTimeWindowSelect' });

  return (
    <EuiPanel
      hasBorder={false}
      hasShadow={false}
      paddingSize="none"
      style={{ maxWidth: MAX_WIDTH }}
      data-test-subj="compositeSloObjectiveSection"
    >
      <EuiFlexGrid columns={3} gutterSize="m">
        <EuiFlexItem>
          <EuiFormRow
            label={
              <span>
                {i18n.translate('xpack.slo.compositeSloEdit.timeWindowDuration.label', {
                  defaultMessage: 'Time window',
                })}{' '}
                <EuiIconTip
                  content={i18n.translate('xpack.slo.compositeSloEdit.timeWindowDuration.tooltip', {
                    defaultMessage:
                      'Rolling time window duration used to compute the composite SLO. Only rolling windows are supported.',
                  })}
                  position="top"
                />
              </span>
            }
          >
            <Controller
              name="timeWindow.duration"
              control={control}
              rules={{ required: true }}
              render={({ field: { ref, ...field } }) => (
                <EuiSelect
                  {...field}
                  required
                  id={timeWindowSelect}
                  data-test-subj="compositeSloFormTimeWindowDurationSelect"
                  options={COMPOSITE_ROLLING_TIMEWINDOW_OPTIONS}
                  value={field.value}
                />
              )}
            />
          </EuiFormRow>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFormRow
            label={
              <span>
                {i18n.translate('xpack.slo.compositeSloEdit.budgetingMethod.label', {
                  defaultMessage: 'Budgeting method',
                })}{' '}
                <EuiIconTip
                  content={i18n.translate('xpack.slo.compositeSloEdit.budgetingMethod.tooltip', {
                    defaultMessage:
                      'Composite SLOs use occurrences-based budgeting: the ratio of good events over total events.',
                  })}
                  position="top"
                />
              </span>
            }
          >
            <EuiSelect
              disabled
              value="occurrences"
              options={[
                {
                  value: 'occurrences',
                  text: i18n.translate('xpack.slo.compositeSloEdit.budgetingMethod.occurrences', {
                    defaultMessage: 'Occurrences',
                  }),
                },
              ]}
              data-test-subj="compositeSloFormBudgetingMethodSelect"
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGrid>

      <EuiFlexGrid columns={3} gutterSize="m">
        <EuiFlexItem>
          <EuiFormRow
            isInvalid={getFieldState('objective.target').invalid}
            label={
              <span>
                {i18n.translate('xpack.slo.compositeSloEdit.targetSlo.label', {
                  defaultMessage: 'Target / SLO (%)',
                })}{' '}
                <EuiIconTip
                  content={i18n.translate('xpack.slo.compositeSloEdit.targetSlo.tooltip', {
                    defaultMessage: 'The target objective in percentage for the composite SLO.',
                  })}
                  position="top"
                />
              </span>
            }
          >
            <Controller
              name="objective.target"
              control={control}
              rules={{ required: true, min: 0.001, max: 99.999 }}
              render={({ field: { ref, onChange, ...field }, fieldState }) => (
                <EuiFieldNumber
                  {...field}
                  required
                  isInvalid={fieldState.invalid}
                  data-test-subj="compositeSloFormObjectiveTargetInput"
                  value={field.value}
                  min={0.001}
                  max={99.999}
                  step={0.001}
                  onChange={(e) => onChange(parseFloat(e.target.value))}
                />
              )}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGrid>
    </EuiPanel>
  );
}
