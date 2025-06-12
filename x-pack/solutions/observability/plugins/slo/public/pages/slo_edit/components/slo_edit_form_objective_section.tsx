/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCallOut,
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
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { TimeWindowType } from '@kbn/slo-schema';
import React, { useEffect, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import {
  BUDGETING_METHOD_OPTIONS,
  CALENDARALIGNED_TIMEWINDOW_OPTIONS,
  ROLLING_TIMEWINDOW_OPTIONS,
  TIMEWINDOW_TYPE_OPTIONS,
} from '../constants';
import { CreateSLOForm } from '../types';
import { MAX_WIDTH } from '../constants';
import { AdvancedSettings } from './indicator_section/advanced_settings/advanced_settings';
import { SloEditFormObjectiveSectionTimeslices } from './slo_edit_form_objective_section_timeslices';
import { usePluginContext } from '../../../hooks/use_plugin_context';

export function SloEditFormObjectiveSection() {
  const {
    control,
    watch,
    getFieldState,
    setValue,
    formState: { defaultValues },
  } = useFormContext<CreateSLOForm>();
  const { isServerless } = usePluginContext();

  const budgetingSelect = useGeneratedHtmlId({ prefix: 'budgetingSelect' });
  const timeWindowTypeSelect = useGeneratedHtmlId({ prefix: 'timeWindowTypeSelect' });
  const timeWindowSelect = useGeneratedHtmlId({ prefix: 'timeWindowSelect' });
  const timeWindowType = watch('timeWindow.type');
  const indicator = watch('indicator.type');

  const [timeWindowTypeState, setTimeWindowTypeState] = useState<TimeWindowType | undefined>(
    defaultValues?.timeWindow?.type
  );

  /**
   * Two flow to handle: Create and Edit
   * On create: the default value is set to rolling & 30d (useForm)
   * When we change the window type (from rolling to calendar for example), we want to select a default duration (picking item 1 in the options)
   * If we don't, the select will show the option as selected, but the value is still the one from the previous window type, until the user manually changes the value
   *
   * On edit: the default value is set with the slo value
   * When we change the window type, we want to change the selected value as we do in the create flow, but we also want to fallback on the initial default value
   *
   */
  useEffect(() => {
    if (timeWindowType === 'calendarAligned' && timeWindowTypeState !== timeWindowType) {
      setTimeWindowTypeState(timeWindowType);
      const exists = CALENDARALIGNED_TIMEWINDOW_OPTIONS.map((opt) => opt.value).includes(
        defaultValues?.timeWindow?.duration ?? ''
      );
      setValue(
        'timeWindow.duration',
        // @ts-ignore
        exists ? defaultValues?.timeWindow?.duration : CALENDARALIGNED_TIMEWINDOW_OPTIONS[1].value
      );
    } else if (timeWindowType === 'rolling' && timeWindowTypeState !== timeWindowType) {
      const exists = ROLLING_TIMEWINDOW_OPTIONS.map((opt) => opt.value).includes(
        defaultValues?.timeWindow?.duration ?? ''
      );
      setTimeWindowTypeState(timeWindowType);
      setValue(
        'timeWindow.duration',
        // @ts-ignore
        exists ? defaultValues?.timeWindow?.duration : ROLLING_TIMEWINDOW_OPTIONS[1].value
      );
    }
  }, [timeWindowType, setValue, defaultValues, timeWindowTypeState]);

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
          <EuiCallOut>
            {i18n.translate('xpack.slo.sloEdit.timeWindow.serverlessWarning', {
              defaultMessage: 'Initial data backfill is limited to the past 7 days',
            })}
          </EuiCallOut>
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
                    options={
                      timeWindowType === 'calendarAligned'
                        ? CALENDARALIGNED_TIMEWINDOW_OPTIONS
                        : ROLLING_TIMEWINDOW_OPTIONS
                    }
                    value={field.value}
                  />
                )}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGrid>

        {indicator === 'sli.metric.timeslice' && (
          <EuiFlexItem>
            <EuiCallOut color="warning">
              <p>
                <FormattedMessage
                  id="xpack.slo.sloEdit.sliType.timesliceMetric.objectiveMessage"
                  defaultMessage="The timeslice metric requires the budgeting method to be set to 'Timeslices' due to the nature of the statistical aggregations. The 'timeslice target' is also ignored in favor of the 'threshold' set in the metric definition above. The 'timeslice window' will set the size of the window the aggregation is performed on."
                />
              </p>
            </EuiCallOut>
          </EuiFlexItem>
        )}

        {indicator === 'sli.synthetics.availability' && (
          <EuiFlexItem>
            <EuiCallOut color="warning">
              <p>
                <FormattedMessage
                  id="xpack.slo.sloEdit.sliType.syntheticAvailability.objectiveMessage"
                  defaultMessage="The Synthetics availability indicator requires the budgeting method to be set to 'Occurrences'."
                />
              </p>
            </EuiCallOut>
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
                    disabled={
                      indicator === 'sli.metric.timeslice' ||
                      indicator === 'sli.synthetics.availability'
                    }
                    required
                    id={budgetingSelect}
                    data-test-subj="sloFormBudgetingMethodSelect"
                    options={BUDGETING_METHOD_OPTIONS}
                  />
                )}
              />
            </EuiFormRow>
          </EuiFlexItem>

          {watch('budgetingMethod') === 'timeslices' ? (
            <SloEditFormObjectiveSectionTimeslices />
          ) : null}
        </EuiFlexGrid>

        <EuiFlexGrid columns={3} gutterSize="m">
          <EuiFlexItem>
            <EuiFormRow
              isInvalid={getFieldState('objective.target').invalid}
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
