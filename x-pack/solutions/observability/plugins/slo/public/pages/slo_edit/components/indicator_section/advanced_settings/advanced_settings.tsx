/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiCheckbox,
  EuiFieldNumber,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiIconTip,
  EuiSpacer,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import type { CreateSLOForm } from '../../../types';
import { SyncFieldSelector } from './sync_field_selector';
import { useSloFormContext } from '../../slo_form_context';

const LABELS = {
  advancedSettings: i18n.translate('xpack.slo.sloEdit.settings.advancedSettingsLabel', {
    defaultMessage: 'Advanced settings',
  }),
  syncDelay: i18n.translate('xpack.slo.sloEdit.settings.syncDelay.label', {
    defaultMessage: 'Sync delay (in minutes)',
  }),
  syncDelayTooltip: i18n.translate('xpack.slo.sloEdit.settings.syncDelay.tooltip', {
    defaultMessage:
      'The time delay in minutes between the current time and the latest source data time. Increasing the value will delay any alerting. The default value is 1 minute. The minimum value is 1m and the maximum is 359m. It should always be greater then source index refresh interval.',
  }),
  frequency: i18n.translate('xpack.slo.sloEdit.settings.frequency.label', {
    defaultMessage: 'Frequency (in minutes)',
  }),
  frequencyTooltip: i18n.translate('xpack.slo.sloEdit.settings.frequency.tooltip', {
    defaultMessage:
      'The interval between checks for changes in the source data. The minimum value is 1m and the maximum is 59m. The default value is 1 minute.',
  }),
  preventBackfill: i18n.translate('xpack.slo.sloEdit.settings.preventInitialBackfill.label', {
    defaultMessage: 'Prevent initial backfill of data',
  }),
  preventBackfillTooltip: i18n.translate(
    'xpack.slo.sloEdit.settings.preventInitialBackfill.tooltip',
    {
      defaultMessage:
        'Start aggregating data from the time the SLO is created, instead of backfilling data from the beginning of the time window.',
    }
  ),
};
interface SyncDelayFieldProps {
  fullWidth?: boolean;
}

function SyncDelayField({ fullWidth }: SyncDelayFieldProps) {
  const { control, getFieldState } = useFormContext<CreateSLOForm>();

  return (
    <EuiFormRow
      fullWidth={fullWidth}
      isInvalid={getFieldState('settings.syncDelay').invalid}
      label={
        <span>
          {LABELS.syncDelay} <EuiIconTip content={LABELS.syncDelayTooltip} position="top" />
        </span>
      }
    >
      <Controller
        name="settings.syncDelay"
        defaultValue={1}
        control={control}
        rules={{ required: true, min: 1, max: 359 }}
        render={({ field: { ref, onChange, ...field }, fieldState }) => (
          <EuiFieldNumber
            {...field}
            fullWidth={fullWidth}
            data-test-subj="sloAdvancedSettingsSyncDelay"
            isInvalid={fieldState.invalid}
            required
            value={field.value}
            min={1}
            max={359}
            step={1}
            onChange={(event) => onChange(event.target.value)}
          />
        )}
      />
    </EuiFormRow>
  );
}

interface FrequencyFieldProps {
  fullWidth?: boolean;
}

function FrequencyField({ fullWidth }: FrequencyFieldProps) {
  const { control, getFieldState } = useFormContext<CreateSLOForm>();

  return (
    <EuiFormRow
      fullWidth={fullWidth}
      isInvalid={getFieldState('settings.frequency').invalid}
      label={
        <span>
          {LABELS.frequency} <EuiIconTip content={LABELS.frequencyTooltip} position="top" />
        </span>
      }
    >
      <Controller
        name="settings.frequency"
        defaultValue={1}
        control={control}
        rules={{ required: true, min: 1, max: 59 }}
        render={({ field: { ref, onChange, ...field }, fieldState }) => (
          <EuiFieldNumber
            {...field}
            fullWidth={fullWidth}
            data-test-subj="sloAdvancedSettingsFrequency"
            isInvalid={fieldState.invalid}
            required
            value={field.value}
            min={1}
            max={59}
            step={1}
            onChange={(event) => onChange(event.target.value)}
          />
        )}
      />
    </EuiFormRow>
  );
}

interface PreventBackfillFieldProps {
  checkboxId: string;
  fullWidth?: boolean;
}

function PreventBackfillField({ checkboxId, fullWidth }: PreventBackfillFieldProps) {
  const { control, getFieldState } = useFormContext<CreateSLOForm>();

  return (
    <EuiFormRow
      fullWidth={fullWidth}
      isInvalid={getFieldState('settings.preventInitialBackfill').invalid}
    >
      <Controller
        name="settings.preventInitialBackfill"
        control={control}
        render={({ field: { ref, onChange, ...field } }) => (
          <EuiCheckbox
            id={checkboxId}
            label={
              <span>
                {LABELS.preventBackfill}{' '}
                <EuiIconTip content={LABELS.preventBackfillTooltip} position="top" />
              </span>
            }
            checked={Boolean(field.value)}
            onChange={(event: any) => onChange(event.target.checked)}
          />
        )}
      />
    </EuiFormRow>
  );
}

function AdvancedSettingsFlyout() {
  const preventBackfillCheckbox = useGeneratedHtmlId({ prefix: 'preventBackfill' });
  const advancedSettingsAccordion = useGeneratedHtmlId({ prefix: 'advancedSettingsAccordion' });

  return (
    <EuiAccordion
      paddingSize="none"
      id={advancedSettingsAccordion}
      buttonContent={LABELS.advancedSettings}
    >
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <SyncFieldSelector fullWidth />
        </EuiFlexItem>
        <EuiFlexItem>
          <SyncDelayField fullWidth />
        </EuiFlexItem>
        <EuiFlexItem>
          <FrequencyField fullWidth />
        </EuiFlexItem>
        <EuiFlexItem>
          <PreventBackfillField checkboxId={preventBackfillCheckbox} fullWidth />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiAccordion>
  );
}

function AdvancedSettingsFullPage() {
  const preventBackfillCheckbox = useGeneratedHtmlId({ prefix: 'preventBackfill' });
  const advancedSettingsAccordion = useGeneratedHtmlId({ prefix: 'advancedSettingsAccordion' });

  const accordionButtonContent = (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type="controlsVertical" size="m" />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiTitle size="xxs">
          <h3>{LABELS.advancedSettings}</h3>
        </EuiTitle>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <EuiAccordion
      paddingSize="s"
      id={advancedSettingsAccordion}
      buttonContent={accordionButtonContent}
    >
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexGrid columns={3} gutterSize="m">
          <EuiFlexItem>
            <SyncFieldSelector />
          </EuiFlexItem>
          <EuiFlexItem>
            <SyncDelayField />
          </EuiFlexItem>
          <EuiFlexItem>
            <FrequencyField />
          </EuiFlexItem>
        </EuiFlexGrid>
        <PreventBackfillField checkboxId={preventBackfillCheckbox} />
      </EuiFlexGroup>
    </EuiAccordion>
  );
}

export function AdvancedSettings() {
  const { isFlyout } = useSloFormContext();
  return isFlyout ? <AdvancedSettingsFlyout /> : <AdvancedSettingsFullPage />;
}
