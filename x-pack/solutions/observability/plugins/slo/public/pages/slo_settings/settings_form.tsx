/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiDescribedFormGroup,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { DEFAULT_STALE_SLO_THRESHOLD_HOURS } from '../../../common/constants';
import { useGetSettings } from './hooks/use_get_settings';
import { usePutSloSettings } from './hooks/use_put_slo_settings';
import { usePluginContext } from '../../hooks/use_plugin_context';

interface SloSettingsForm {
  useAllRemoteClusters: boolean;
  selectedRemoteClusters: string[];
  staleThresholdInHours: number;
  staleInstancesCleanupEnabled: boolean;
}

export function SettingsForm() {
  const { http } = useKibana().services;
  const { isServerless } = usePluginContext();

  const { data, loading: loadingRemoteClusters } = useFetcher(() => {
    return http?.get<Array<{ name: string }>>('/api/remote_clusters');
  }, [http]);
  const { data: currentSettings, isLoading: isLoadingSettings } = useGetSettings();
  const { mutate: updateSettings, isLoading: isUpdatingSettings } = usePutSloSettings();

  const loading = loadingRemoteClusters || isLoadingSettings;

  const { control, reset, handleSubmit, formState, watch } = useForm<SloSettingsForm>({
    defaultValues: {
      useAllRemoteClusters: false,
      selectedRemoteClusters: [],
      staleThresholdInHours: DEFAULT_STALE_SLO_THRESHOLD_HOURS,
      staleInstancesCleanupEnabled: false,
    },
    values: currentSettings,
    mode: 'all',
  });

  const useAllRemoteClustersValue = watch('useAllRemoteClusters');

  const onSubmit = handleSubmit((formValues) => {
    updateSettings({
      settings: {
        ...(!isServerless
          ? {
              useAllRemoteClusters: formValues.useAllRemoteClusters,
              selectedRemoteClusters: formValues.selectedRemoteClusters,
            }
          : {}),
        staleThresholdInHours: formValues.staleThresholdInHours,
        staleInstancesCleanupEnabled: formValues.staleInstancesCleanupEnabled,
      },
    });
  });

  const remoteClustersSwitchLabel = i18n.translate(
    'xpack.slo.settingsForm.euiFormRow.useAllRemoteClustersLabel',
    { defaultMessage: 'Use all remote clusters' }
  );

  const staleInstancesCleanupLabel = i18n.translate(
    'xpack.slo.settingsForm.euiFormRow.staleInstancesCleanupLabel',
    { defaultMessage: 'Enable stale instances cleanup' }
  );

  return (
    <EuiForm component="form" onSubmit={onSubmit}>
      <EuiFlexGroup direction="column" gutterSize="s">
        {!isServerless && (
          <>
            <EuiDescribedFormGroup
              title={
                <h3>
                  {i18n.translate('xpack.slo.settingsForm.h3.sourceSettingsLabel', {
                    defaultMessage: 'Source settings',
                  })}
                </h3>
              }
              description={
                <p>
                  {i18n.translate('xpack.slo.settingsForm.p.fetchSlosFromAllLabel', {
                    defaultMessage: 'Fetch SLOs from all remote clusters.',
                  })}
                </p>
              }
            >
              <EuiFormRow label={remoteClustersSwitchLabel}>
                <Controller
                  name="useAllRemoteClusters"
                  control={control}
                  render={({ field: { ref, onChange, value, ...field } }) => (
                    <EuiSwitch
                      {...field}
                      label={remoteClustersSwitchLabel}
                      checked={value}
                      onChange={(e) => onChange(e.target.checked)}
                    />
                  )}
                />
              </EuiFormRow>
            </EuiDescribedFormGroup>
            <EuiDescribedFormGroup
              title={
                <h3>
                  {i18n.translate('xpack.slo.settingsForm.h3.remoteSettingsLabel', {
                    defaultMessage: 'Remote clusters',
                  })}
                </h3>
              }
              description={
                <p>
                  {i18n.translate('xpack.slo.settingsForm.select.fetchSlosFromAllLabel', {
                    defaultMessage: 'Select remote clusters to fetch SLOs from.',
                  })}
                </p>
              }
            >
              <EuiFormRow
                label={i18n.translate(
                  'xpack.slo.settingsForm.euiFormRow.select.selectRemoteClustersLabel',
                  { defaultMessage: 'Select remote clusters' }
                )}
              >
                <Controller
                  name="selectedRemoteClusters"
                  control={control}
                  render={({ field: { ref, onChange, value, ...field } }) => (
                    <EuiComboBox
                      {...field}
                      isLoading={loading}
                      options={
                        data?.map((cluster) => ({ label: cluster.name, value: cluster.name })) || []
                      }
                      selectedOptions={value.map((cluster) => ({
                        label: cluster,
                        value: cluster,
                      }))}
                      onChange={(selected: EuiComboBoxOptionOption[]) => {
                        onChange(selected.map((s) => s.value as string));
                      }}
                      isDisabled={useAllRemoteClustersValue}
                    />
                  )}
                />
              </EuiFormRow>
              <EuiSpacer size="m" />
            </EuiDescribedFormGroup>
          </>
        )}
        <EuiDescribedFormGroup
          title={
            <h3>
              {i18n.translate('xpack.slo.settingsForm.h3.staleThresholdLabel', {
                defaultMessage: 'Stale SLOs threshold',
              })}
            </h3>
          }
          description={
            <p>
              {i18n.translate('xpack.slo.settingsForm.select.staleThresholdLabel', {
                defaultMessage:
                  'SLOs not updated within the defined stale threshold will be hidden by default from the overview list.',
              })}
            </p>
          }
        >
          <EuiFormRow
            label={i18n.translate('xpack.slo.settingsForm.euiFormRow.select.selectThresholdLabel', {
              defaultMessage: 'Select threshold',
            })}
          >
            <Controller
              name="staleThresholdInHours"
              control={control}
              render={({ field: { ref, onChange, value, ...field } }) => (
                <EuiFieldNumber
                  {...field}
                  min={1}
                  data-test-subj="sloSettingsFormFieldNumber"
                  value={value}
                  onChange={(e) => onChange(Number(e.target.value))}
                  append={i18n.translate('xpack.slo.settingsForm.euiFormRow.select.hours', {
                    defaultMessage: 'Hours',
                  })}
                />
              )}
            />
          </EuiFormRow>
        </EuiDescribedFormGroup>
        <EuiDescribedFormGroup
          title={
            <h3>
              {i18n.translate('xpack.slo.settingsForm.h3.staleInstancesCleanupLabel', {
                defaultMessage: 'Stale instances cleanup',
              })}
            </h3>
          }
          description={
            <p>
              {i18n.translate('xpack.slo.settingsForm.p.staleInstancesCleanupDescription', {
                defaultMessage:
                  'Automatically cleanup stale SLO instances that have not been updated within the stale threshold.',
              })}
            </p>
          }
        >
          <EuiFormRow label={staleInstancesCleanupLabel}>
            <Controller
              name="staleInstancesCleanupEnabled"
              control={control}
              render={({ field: { ref, onChange, value, ...field } }) => (
                <EuiSwitch
                  {...field}
                  label={staleInstancesCleanupLabel}
                  checked={value}
                  onChange={(e) => onChange(e.target.checked)}
                />
              )}
            />
          </EuiFormRow>
        </EuiDescribedFormGroup>
      </EuiFlexGroup>

      <EuiSpacer size="m" />
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            isLoading={loading || isUpdatingSettings}
            data-test-subj="sloSettingsFormCancelButton"
            onClick={() => reset()}
            isDisabled={!formState.isDirty}
          >
            {i18n.translate('xpack.slo.settingsForm.euiButtonEmpty.cancelLabel', {
              defaultMessage: 'Cancel',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            isLoading={loading || isUpdatingSettings}
            data-test-subj="sloSettingsFormSaveButton"
            color="primary"
            fill
            type="submit"
            isDisabled={!formState.isDirty}
          >
            {i18n.translate('xpack.slo.settingsForm.applyButtonEmptyLabel', {
              defaultMessage: 'Apply',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiForm>
  );
}
