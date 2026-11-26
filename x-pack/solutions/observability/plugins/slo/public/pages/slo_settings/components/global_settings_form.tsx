/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiDescribedFormGroup,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SLI_RETENTION_MAX_PERIOD_DAYS, SLI_RETENTION_MIN_PERIOD_DAYS } from '@kbn/slo-constants';
import type { GetSLOGlobalSettingsResponse } from '@kbn/slo-schema';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { usePutGlobalSettings } from '../hooks/use_put_global_settings';
import { GlobalSettingsOverrideCallout } from './global_settings_override_callout';
import type { SliRetentionValue } from './needs_sli_retention_confirmation';
import { needsSliRetentionConfirmation } from './needs_sli_retention_confirmation';
import { SliRetentionConfirmModal } from './sli_retention_confirm_modal';

interface Props {
  settings: GetSLOGlobalSettingsResponse;
}

export function GlobalSettingsForm({ settings }: Props) {
  const { sliRetention } = settings;
  const isOverridden = sliRetention.effective.source === 'config';

  const { mutate: updateGlobalSettings, isLoading: isUpdating } = usePutGlobalSettings();
  const [pendingValue, setPendingValue] = useState<SliRetentionValue | undefined>();

  const {
    control,
    reset,
    handleSubmit,
    formState: { isDirty, isValid },
    watch,
  } = useForm<SliRetentionValue>({
    values: { enabled: sliRetention.enabled, periodDays: sliRetention.periodDays },
    mode: 'all',
  });

  const isRetentionEnabled = watch('enabled');

  const save = (value: SliRetentionValue) => {
    updateGlobalSettings({ sliRetention: value });
  };

  const onSubmit = handleSubmit((next) => {
    if (needsSliRetentionConfirmation({ stored: sliRetention, next })) {
      setPendingValue(next);
      return;
    }
    save(next);
  });

  const enableLabel = i18n.translate('xpack.slo.globalSettings.retentionSwitchLabel', {
    defaultMessage: 'Enable SLI retention',
  });

  return (
    <>
      {isOverridden && (
        <>
          <GlobalSettingsOverrideCallout sliRetention={sliRetention} />
          <EuiSpacer size="m" />
        </>
      )}
      <EuiForm component="form" onSubmit={onSubmit} data-test-subj="sloGlobalSettingsForm">
        <EuiDescribedFormGroup
          title={
            <h3>
              {i18n.translate('xpack.slo.globalSettings.sliRetentionTitle', {
                defaultMessage: 'SLI retention',
              })}
            </h3>
          }
          description={
            <p>
              {i18n.translate('xpack.slo.globalSettings.sliRetentionDescription', {
                defaultMessage:
                  'Delete SLI data older than the retention period. Summary data is not affected.',
              })}
            </p>
          }
        >
          <EuiFormRow label={enableLabel}>
            <Controller
              name="enabled"
              control={control}
              render={({ field: { ref, onChange, value, ...field } }) => (
                <EuiSwitch
                  {...field}
                  label={enableLabel}
                  checked={value}
                  data-test-subj="sloGlobalSettingsRetentionSwitch"
                  onChange={(e) => onChange(e.target.checked)}
                />
              )}
            />
          </EuiFormRow>
          <Controller
            name="periodDays"
            control={control}
            rules={{
              required: true,
              min: SLI_RETENTION_MIN_PERIOD_DAYS,
              max: SLI_RETENTION_MAX_PERIOD_DAYS,
              validate: Number.isInteger,
            }}
            render={({ field: { ref, onChange, value, ...field }, fieldState }) => (
              <EuiFormRow
                label={i18n.translate('xpack.slo.globalSettings.retentionPeriodLabel', {
                  defaultMessage: 'Retention period',
                })}
                helpText={i18n.translate('xpack.slo.globalSettings.retentionPeriodHelpText', {
                  defaultMessage: 'Between {min} and {max} days.',
                  values: {
                    min: SLI_RETENTION_MIN_PERIOD_DAYS,
                    max: SLI_RETENTION_MAX_PERIOD_DAYS,
                  },
                })}
                isInvalid={fieldState.invalid}
                error={i18n.translate('xpack.slo.globalSettings.retentionPeriodError', {
                  defaultMessage: 'Enter a whole number of days between {min} and {max}.',
                  values: {
                    min: SLI_RETENTION_MIN_PERIOD_DAYS,
                    max: SLI_RETENTION_MAX_PERIOD_DAYS,
                  },
                })}
              >
                <EuiFieldNumber
                  {...field}
                  value={value}
                  min={SLI_RETENTION_MIN_PERIOD_DAYS}
                  max={SLI_RETENTION_MAX_PERIOD_DAYS}
                  step={1}
                  isInvalid={fieldState.invalid}
                  disabled={!isRetentionEnabled}
                  data-test-subj="sloGlobalSettingsRetentionPeriod"
                  onChange={(e) => onChange(Number(e.target.value))}
                  append={i18n.translate('xpack.slo.globalSettings.retentionPeriodUnit', {
                    defaultMessage: 'days',
                  })}
                />
              </EuiFormRow>
            )}
          />
        </EuiDescribedFormGroup>

        <EuiSpacer size="m" />
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              isLoading={isUpdating}
              data-test-subj="sloGlobalSettingsCancelButton"
              onClick={() => reset()}
              isDisabled={!isDirty}
            >
              {i18n.translate('xpack.slo.globalSettings.cancelButtonLabel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              isLoading={isUpdating}
              data-test-subj="sloGlobalSettingsSaveButton"
              color="primary"
              fill
              type="submit"
              isDisabled={!isDirty || !isValid}
            >
              {i18n.translate('xpack.slo.globalSettings.applyButtonLabel', {
                defaultMessage: 'Apply',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiForm>
      {pendingValue && (
        <SliRetentionConfirmModal
          periodDays={pendingValue.periodDays}
          onCancel={() => setPendingValue(undefined)}
          onConfirm={() => {
            save(pendingValue);
            setPendingValue(undefined);
          }}
        />
      )}
    </>
  );
}
