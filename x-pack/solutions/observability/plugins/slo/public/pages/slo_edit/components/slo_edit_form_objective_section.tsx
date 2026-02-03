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
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { TimeWindowType } from '@kbn/slo-schema';
import React, { useEffect, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import {
  BUDGETING_METHOD_OPTIONS,
  CALENDARALIGNED_TIMEWINDOW_OPTIONS,
  ROLLING_TIMEWINDOW_OPTIONS,
  TIMEWINDOW_TYPE_OPTIONS,
} from '../constants';
import type { CreateSLOForm, FormSettings } from '../types';
import { MAX_WIDTH } from '../constants';
import { AdvancedSettings } from './indicator_section/advanced_settings/advanced_settings';
import { SloEditFormObjectiveSectionTimeslices } from './slo_edit_form_objective_section_timeslices';
import { usePluginContext } from '../../../hooks/use_plugin_context';
import { DataPreviewChart } from './common/data_preview_chart';

const LABELS = {
  timeWindow: i18n.translate('xpack.slo.sloEdit.timeWindowType.label', {
    defaultMessage: 'Time window',
  }),
  timeWindowTooltip: i18n.translate('xpack.slo.sloEdit.timeWindowType.tooltip', {
    defaultMessage: 'Choose between a rolling or a calendar aligned window.',
  }),
  duration: i18n.translate('xpack.slo.sloEdit.timeWindowDuration.label', {
    defaultMessage: 'Duration',
  }),
  durationTooltip: i18n.translate('xpack.slo.sloEdit.timeWindowDuration.tooltip', {
    defaultMessage: 'The time window duration used to compute the SLO over.',
  }),
  budgetingMethod: i18n.translate('xpack.slo.sloEdit.budgetingMethod.label', {
    defaultMessage: 'Budgeting method',
  }),
  budgetingMethodTooltip: i18n.translate('xpack.slo.sloEdit.budgetingMethod.tooltip', {
    defaultMessage:
      'Occurrences-based SLO uses the ratio of good events over the total events during the time window. Timeslices-based SLO uses the ratio of good time slices over the total time slices during the time window.',
  }),
  targetSlo: i18n.translate('xpack.slo.sloEdit.targetSlo.label', {
    defaultMessage: 'Target / SLO (%)',
  }),
  targetSloTooltip: i18n.translate('xpack.slo.sloEdit.targetSlo.tooltip', {
    defaultMessage: 'The target objective in percentage for the SLO.',
  }),
  serverlessWarning: i18n.translate('xpack.slo.sloEdit.timeWindow.serverlessWarning', {
    defaultMessage: 'Initial data backfill is limited to the past 7 days',
  }),
};

function useObjectiveSectionFormData() {
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
  const budgetingMethod = watch('budgetingMethod');

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

  return {
    control,
    getFieldState,
    isServerless,
    budgetingSelect,
    timeWindowTypeSelect,
    timeWindowSelect,
    timeWindowType,
    indicator,
    budgetingMethod,
  };
}

interface TimeWindowFieldProps {
  fullWidth?: boolean;
  selectId: string;
}

function TimeWindowTypeField({ fullWidth, selectId }: TimeWindowFieldProps) {
  const { control } = useFormContext<CreateSLOForm>();

  return (
    <EuiFormRow
      fullWidth={fullWidth}
      label={
        <span>
          {LABELS.timeWindow} <EuiIconTip content={LABELS.timeWindowTooltip} position="top" />
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
            fullWidth={fullWidth}
            required
            id={selectId}
            data-test-subj="sloFormTimeWindowTypeSelect"
            options={TIMEWINDOW_TYPE_OPTIONS}
            value={field.value}
          />
        )}
      />
    </EuiFormRow>
  );
}

interface DurationFieldProps {
  fullWidth?: boolean;
  selectId: string;
  timeWindowType: TimeWindowType;
}

function DurationField({ fullWidth, selectId, timeWindowType }: DurationFieldProps) {
  const { control } = useFormContext<CreateSLOForm>();

  return (
    <EuiFormRow
      fullWidth={fullWidth}
      label={
        <span>
          {LABELS.duration} <EuiIconTip content={LABELS.durationTooltip} position="top" />
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
            fullWidth={fullWidth}
            required
            id={selectId}
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
  );
}

interface BudgetingMethodFieldProps {
  fullWidth?: boolean;
  selectId: string;
  indicator: string;
}

function BudgetingMethodField({ fullWidth, selectId, indicator }: BudgetingMethodFieldProps) {
  const { control } = useFormContext<CreateSLOForm>();

  return (
    <EuiFormRow
      fullWidth={fullWidth}
      label={
        <span>
          {LABELS.budgetingMethod}{' '}
          <EuiIconTip content={LABELS.budgetingMethodTooltip} position="top" />
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
            fullWidth={fullWidth}
            disabled={
              indicator === 'sli.metric.timeslice' || indicator === 'sli.synthetics.availability'
            }
            required
            id={selectId}
            data-test-subj="sloFormBudgetingMethodSelect"
            options={BUDGETING_METHOD_OPTIONS}
          />
        )}
      />
    </EuiFormRow>
  );
}

interface TargetFieldProps {
  fullWidth?: boolean;
}

function TargetField({ fullWidth }: TargetFieldProps) {
  const { control, getFieldState } = useFormContext<CreateSLOForm>();

  return (
    <EuiFormRow
      fullWidth={fullWidth}
      isInvalid={getFieldState('objective.target').invalid}
      label={
        <span>
          {LABELS.targetSlo} <EuiIconTip content={LABELS.targetSloTooltip} position="top" />
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
            fullWidth={fullWidth}
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
  );
}

function ServerlessWarningCallout() {
  return (
    <EuiFlexItem grow={false}>
      <EuiCallOut announceOnMount>{LABELS.serverlessWarning}</EuiCallOut>
    </EuiFlexItem>
  );
}

function TimesliceMetricCallout() {
  return (
    <EuiFlexItem grow={false}>
      <EuiCallOut announceOnMount color="warning">
        <p>
          <FormattedMessage
            id="xpack.slo.sloEdit.sliType.timesliceMetric.objectiveMessage"
            defaultMessage="The timeslice metric requires the budgeting method to be set to 'Timeslices' due to the nature of the statistical aggregations. The 'timeslice target' is also ignored in favor of the 'threshold' set in the metric definition above. The 'timeslice window' will set the size of the window the aggregation is performed on."
          />
        </p>
      </EuiCallOut>
    </EuiFlexItem>
  );
}

function SyntheticsAvailabilityCallout() {
  return (
    <EuiFlexItem grow={false}>
      <EuiCallOut announceOnMount color="warning">
        <p>
          <FormattedMessage
            id="xpack.slo.sloEdit.sliType.syntheticAvailability.objectiveMessage"
            defaultMessage="The Synthetics availability indicator requires the budgeting method to be set to 'Occurrences'."
          />
        </p>
      </EuiCallOut>
    </EuiFlexItem>
  );
}

function ObjectiveSectionFlyout() {
  const {
    isServerless,
    budgetingSelect,
    timeWindowTypeSelect,
    timeWindowSelect,
    timeWindowType,
    indicator,
    budgetingMethod,
  } = useObjectiveSectionFormData();

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="m"
      data-test-subj="sloEditFormObjectiveSection"
    >
      <EuiFlexGroup direction="column" gutterSize="m">
        {isServerless && <ServerlessWarningCallout />}

        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem grow={false}>
            <TimeWindowTypeField fullWidth selectId={timeWindowTypeSelect} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <DurationField fullWidth selectId={timeWindowSelect} timeWindowType={timeWindowType} />
          </EuiFlexItem>
        </EuiFlexGroup>

        {indicator === 'sli.metric.timeslice' && <TimesliceMetricCallout />}
        {indicator === 'sli.synthetics.availability' && <SyntheticsAvailabilityCallout />}

        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem grow={false}>
            <BudgetingMethodField fullWidth selectId={budgetingSelect} indicator={indicator} />
          </EuiFlexItem>
          {budgetingMethod === 'timeslices' && <SloEditFormObjectiveSectionTimeslices isFlyout />}
        </EuiFlexGroup>

        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem grow={false}>
            <TargetField fullWidth />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="xs" />
        <AdvancedSettings isFlyout />
        <EuiSpacer size="xs" />

        <DataPreviewChart />
      </EuiFlexGroup>
    </EuiPanel>
  );
}

function ObjectiveSectionFullPage() {
  const {
    isServerless,
    budgetingSelect,
    timeWindowTypeSelect,
    timeWindowSelect,
    timeWindowType,
    indicator,
    budgetingMethod,
  } = useObjectiveSectionFormData();

  return (
    <EuiPanel
      hasBorder={false}
      hasShadow={false}
      paddingSize="none"
      style={{ maxWidth: MAX_WIDTH }}
      data-test-subj="sloEditFormObjectiveSection"
    >
      <EuiFlexGroup direction="column" gutterSize="m">
        {isServerless && <ServerlessWarningCallout />}

        <EuiFlexGrid columns={3} gutterSize="m">
          <EuiFlexItem grow={false}>
            <TimeWindowTypeField selectId={timeWindowTypeSelect} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <DurationField selectId={timeWindowSelect} timeWindowType={timeWindowType} />
          </EuiFlexItem>
        </EuiFlexGrid>

        {indicator === 'sli.metric.timeslice' && <TimesliceMetricCallout />}
        {indicator === 'sli.synthetics.availability' && <SyntheticsAvailabilityCallout />}

        <EuiFlexGrid columns={3} gutterSize="m">
          <EuiFlexItem grow={false}>
            <BudgetingMethodField selectId={budgetingSelect} indicator={indicator} />
          </EuiFlexItem>
          {budgetingMethod === 'timeslices' && <SloEditFormObjectiveSectionTimeslices />}
        </EuiFlexGrid>

        <EuiFlexGrid columns={3} gutterSize="m">
          <EuiFlexItem grow={false}>
            <TargetField />
          </EuiFlexItem>
        </EuiFlexGrid>

        <AdvancedSettings />
      </EuiFlexGroup>
    </EuiPanel>
  );
}

interface SloEditFormObjectiveSectionProps {
  formSettings?: FormSettings;
}

export function SloEditFormObjectiveSection({ formSettings }: SloEditFormObjectiveSectionProps) {
  const isFlyout = formSettings?.isFlyout ?? false;
  return isFlyout ? <ObjectiveSectionFlyout /> : <ObjectiveSectionFullPage />;
}
