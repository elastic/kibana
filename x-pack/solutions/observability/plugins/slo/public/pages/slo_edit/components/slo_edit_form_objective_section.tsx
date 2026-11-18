/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFieldNumber,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiPanel,
  EuiSelect,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { KbnInfoCallout, KbnWarningCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { Controller, useFormContext, useFormState, useWatch } from 'react-hook-form';
import { BUDGETING_METHOD_OPTIONS, TIMEWINDOW_TYPE_OPTIONS } from '../constants';
import {
  getTimeWindowDurationOptions,
  pickTimeWindowDuration,
} from '../helpers/time_window_duration';
import type { CreateSLOForm } from '../types';
import { MAX_WIDTH } from '../constants';
import { AdvancedSettings } from './indicator_section/advanced_settings/advanced_settings';
import { SloEditFormObjectiveSectionTimeslices } from './slo_edit_form_objective_section_timeslices';
import { usePluginContext } from '../../../hooks/use_plugin_context';

export function SloEditFormObjectiveSection() {
  const {
    control,
    getFieldState,
    setValue,
    formState: { defaultValues },
  } = useFormContext<CreateSLOForm>();
  const formState = useFormState({ control, name: 'objective.target' });
  const { isServerless } = usePluginContext();

  const budgetingSelect = useGeneratedHtmlId({ prefix: 'budgetingSelect' });
  const timeWindowTypeSelect = useGeneratedHtmlId({ prefix: 'timeWindowTypeSelect' });
  const timeWindowSelect = useGeneratedHtmlId({ prefix: 'timeWindowSelect' });
  const timeWindowType = useWatch({ control, name: 'timeWindow.type' });
  const indicator = useWatch({ control, name: 'indicator.type' });
  const budgetingMethod = useWatch({ control, name: 'budgetingMethod' });

  return (
    <EuiPanel
      hasBorder={false}
      hasShadow={false}
      paddingSize="none"
      style={{ maxWidth: MAX_WIDTH }}
      data-test-subj="sloEditFormObjectiveSection"
    >
      <EuiFlexGroup direction="column" gutterSize="m">
        {isServerless && (
          <KbnInfoCallout
            announceOnMount
            title={i18n.translate('xpack.slo.sloEdit.timeWindow.serverlessWarning', {
              defaultMessage: 'Initial data backfill is limited to the past 7 days',
            })}
          />
        )}
        <EuiFlexGrid columns={3} gutterSize="m">
          <EuiFlexItem>
            <EuiFormRow
              label={
                <span>
                  {i18n.translate('xpack.slo.sloEdit.timeWindowType.label', {
                    defaultMessage: 'Time window',
                  })}{' '}
                  <EuiIconTip
                    content={i18n.translate('xpack.slo.sloEdit.timeWindowType.tooltip', {
                      defaultMessage: 'Choose between a rolling or a calendar aligned window.',
                    })}
                    position="top"
                  />
                </span>
              }
            >
              <Controller
                name="timeWindow.type"
                control={control}
                rules={{ required: true }}
                render={({ field: { ref, ...field } }) => (
                  <EuiSelect
                    {...field}
                    required
                    id={timeWindowTypeSelect}
                    data-test-subj="sloFormTimeWindowTypeSelect"
                    options={TIMEWINDOW_TYPE_OPTIONS}
                    value={field.value}
                    aria-label={i18n.translate('xpack.slo.sloEdit.timeWindowType.ariaLabel', {
                      defaultMessage: 'Time window',
                    })}
                    onChange={(event) => {
                      const selectedOption = TIMEWINDOW_TYPE_OPTIONS.find(
                        ({ value }) => value === event.target.value
                      );
                      if (!selectedOption) {
                        return;
                      }
                      field.onChange(selectedOption.value);
                      setValue(
                        'timeWindow.duration',
                        pickTimeWindowDuration(
                          selectedOption.value,
                          defaultValues?.timeWindow?.duration
                        )
                      );
                    }}
                  />
                )}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow
              label={
                <span>
                  {i18n.translate('xpack.slo.sloEdit.timeWindowDuration.label', {
                    defaultMessage: 'Duration',
                  })}{' '}
                  <EuiIconTip
                    content={i18n.translate('xpack.slo.sloEdit.timeWindowDuration.tooltip', {
                      defaultMessage: 'The time window duration used to compute the SLO over.',
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
                    data-test-subj="sloFormTimeWindowDurationSelect"
                    options={getTimeWindowDurationOptions(timeWindowType)}
                    value={field.value}
                    aria-label={i18n.translate('xpack.slo.sloEdit.timeWindowDuration.ariaLabel', {
                      defaultMessage: 'Duration',
                    })}
                  />
                )}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGrid>

        {indicator === 'sli.metric.timeslice' && (
          <EuiFlexItem>
            <KbnWarningCallout
              announceOnMount
              title={i18n.translate('xpack.slo.sloEdit.sliType.timesliceMetric.objectiveTitle', {
                defaultMessage:
                  "The timeslice metric requires the budgeting method to be set to 'Timeslices' due to the nature of the statistical aggregations.",
              })}
              text={
                <FormattedMessage
                  id="xpack.slo.sloEdit.sliType.timesliceMetric.objectiveMessage"
                  defaultMessage="The 'timeslice target' is also ignored in favor of the 'threshold' set in the metric definition above. The 'timeslice window' will set the size of the window the aggregation is performed on."
                />
              }
            />
          </EuiFlexItem>
        )}

        {indicator === 'sli.synthetics.availability' && budgetingMethod === 'timeslices' && (
          <EuiFlexItem>
            <KbnWarningCallout
              announceOnMount
              title={i18n.translate(
                'xpack.slo.sloEdit.sliType.syntheticsAvailability.timeslicesWindowTitle',
                {
                  defaultMessage: 'Match the timeslice window to the monitor interval',
                }
              )}
              text={
                <FormattedMessage
                  id="xpack.slo.sloEdit.sliType.syntheticsAvailability.timeslicesWindowDescription"
                  defaultMessage="Set the timeslice window to at least the monitor run interval. A shorter window can cause periods without monitor executions to inflate the calculated SLI and reduce burn rates."
                />
              }
            />
          </EuiFlexItem>
        )}

        <EuiFlexGrid columns={3} gutterSize="m">
          <EuiFlexItem>
            <EuiFormRow
              label={
                <span>
                  {i18n.translate('xpack.slo.sloEdit.budgetingMethod.label', {
                    defaultMessage: 'Budgeting method',
                  })}{' '}
                  <EuiIconTip
                    content={i18n.translate('xpack.slo.sloEdit.budgetingMethod.tooltip', {
                      defaultMessage:
                        'Occurrences-based SLO uses the ratio of good events over the total events during the time window. Timeslices-based SLO uses the ratio of good time slices over the total time slices during the time window.',
                    })}
                    position="top"
                  />
                </span>
              }
            >
              <Controller
                name="budgetingMethod"
                control={control}
                rules={{ required: true }}
                render={({ field: { ref, ...field } }) => (
                  <EuiSelect
                    {...field}
                    disabled={indicator === 'sli.metric.timeslice'}
                    required
                    id={budgetingSelect}
                    data-test-subj="sloFormBudgetingMethodSelect"
                    options={BUDGETING_METHOD_OPTIONS}
                    aria-label={i18n.translate('xpack.slo.sloEdit.budgetingMethod.ariaLabel', {
                      defaultMessage: 'Budgeting method',
                    })}
                  />
                )}
              />
            </EuiFormRow>
          </EuiFlexItem>

          {budgetingMethod === 'timeslices' ? <SloEditFormObjectiveSectionTimeslices /> : null}
        </EuiFlexGrid>

        <EuiFlexGrid columns={3} gutterSize="m">
          <EuiFlexItem>
            <EuiFormRow
              isInvalid={getFieldState('objective.target', formState).invalid}
              label={
                <span>
                  {i18n.translate('xpack.slo.sloEdit.targetSlo.label', {
                    defaultMessage: 'Target / SLO (%)',
                  })}{' '}
                  <EuiIconTip
                    content={i18n.translate('xpack.slo.sloEdit.targetSlo.tooltip', {
                      defaultMessage: 'The target objective in percentage for the SLO.',
                    })}
                    position="top"
                  />
                </span>
              }
            >
              <Controller
                name="objective.target"
                control={control}
                rules={{
                  required: true,
                  min: 0.001,
                  max: 99.999,
                }}
                render={({ field: { ref, onChange, ...field }, fieldState }) => (
                  <EuiFieldNumber
                    {...field}
                    required
                    isInvalid={fieldState.invalid}
                    data-test-subj="sloFormObjectiveTargetInput"
                    value={field.value}
                    min={0.001}
                    max={99.999}
                    step={0.001}
                    aria-label={i18n.translate('xpack.slo.sloEdit.targetSlo.ariaLabel', {
                      defaultMessage: 'Target / SLO (%)',
                    })}
                    onChange={(event) => onChange(event.target.value)}
                  />
                )}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGrid>

        <AdvancedSettings />
      </EuiFlexGroup>
    </EuiPanel>
  );
}
