/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiDescribedFormGroup,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux-v7';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import { isEqual } from 'lodash';
import {
  DYNAMIC_SETTINGS_DEFAULTS,
  MIN_PRIVATE_LOCATIONS_SYNC_INTERVAL,
  MAX_PRIVATE_LOCATIONS_SYNC_INTERVAL,
} from '../../../../../../common/constants';
import { selectDynamicSettings } from '../../../state/settings/selectors';
import {
  getDynamicSettingsAction,
  setDynamicSettingsAction,
} from '../../../state/settings/actions';
import type { DynamicSettings } from '../../../../../../common/runtime_types';

export const AdvancedSettingsForm = () => {
  const dispatch = useDispatch();

  const { settings, loading } = useSelector(selectDynamicSettings);

  const [syncInterval, setSyncInterval] = useState<number>(
    DYNAMIC_SETTINGS_DEFAULTS.privateLocationsSyncInterval
  );

  const [rebalanceShardsEnabled, setRebalanceShardsEnabled] = useState<boolean>(
    DYNAMIC_SETTINGS_DEFAULTS.rebalancePrivateLocationShardsEnabled ?? true
  );

  const canEdit: boolean =
    !!useKibana().services?.application?.capabilities.uptime.configureSettings || false;

  const isDisabled = !canEdit;

  useEffect(() => {
    dispatch(getDynamicSettingsAction.get());
  }, [dispatch]);

  useEffect(() => {
    if (settings?.privateLocationsSyncInterval !== undefined) {
      setSyncInterval(settings.privateLocationsSyncInterval);
    }
  }, [settings]);

  useEffect(() => {
    if (settings?.rebalancePrivateLocationShardsEnabled !== undefined) {
      setRebalanceShardsEnabled(settings.rebalancePrivateLocationShardsEnabled);
    }
  }, [settings]);

  const onApply = () => {
    if (settings) {
      dispatch(
        setDynamicSettingsAction.get({
          ...settings,
          privateLocationsSyncInterval: syncInterval,
          rebalancePrivateLocationShardsEnabled: rebalanceShardsEnabled,
        } as DynamicSettings)
      );
    }
  };

  const isFormDirty =
    !isEqual(syncInterval, settings?.privateLocationsSyncInterval) ||
    !isEqual(rebalanceShardsEnabled, settings?.rebalancePrivateLocationShardsEnabled ?? true);
  const isFormValid =
    syncInterval >= MIN_PRIVATE_LOCATIONS_SYNC_INTERVAL &&
    syncInterval <= MAX_PRIVATE_LOCATIONS_SYNC_INTERVAL &&
    Number.isInteger(syncInterval);

  return (
    <EuiForm>
      <EuiSpacer size="m" />
      {!canEdit && (
        <>
          <EuiCallOut
            announceOnMount
            title={i18n.translate('xpack.synthetics.settings.advanced.readOnly', {
              defaultMessage:
                'You do not have sufficient permissions to edit these settings. Contact your administrator.',
            })}
            iconType="lock"
            size="s"
          />
          <EuiSpacer size="m" />
        </>
      )}
      <EuiDescribedFormGroup
        title={
          <h4>
            <FormattedMessage
              id="xpack.synthetics.settings.advanced.syncInterval.title"
              defaultMessage="Maintenance windows sync interval"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.synthetics.settings.advanced.syncInterval.description"
            defaultMessage="Configure how frequently private location monitors are synced to apply maintenance window changes."
          />
        }
      >
        <EuiFormRow
          label={i18n.translate('xpack.synthetics.settings.advanced.syncInterval.label', {
            defaultMessage: 'Sync interval (minutes)',
          })}
          isInvalid={!isFormValid}
          error={
            !isFormValid
              ? i18n.translate('xpack.synthetics.settings.advanced.syncInterval.error', {
                  defaultMessage:
                    'Sync interval must be a whole number between {min} and {max} minutes.',
                  values: {
                    min: MIN_PRIVATE_LOCATIONS_SYNC_INTERVAL,
                    max: MAX_PRIVATE_LOCATIONS_SYNC_INTERVAL,
                  },
                })
              : undefined
          }
        >
          <EuiFieldNumber
            isInvalid={!isFormValid}
            data-test-subj="syntheticsSyncIntervalField"
            value={syncInterval}
            min={MIN_PRIVATE_LOCATIONS_SYNC_INTERVAL}
            max={MAX_PRIVATE_LOCATIONS_SYNC_INTERVAL}
            step={1}
            disabled={isDisabled}
            isLoading={loading}
            onChange={(e) => {
              setSyncInterval(Number(e.target.value));
            }}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
      <EuiSpacer size="m" />
      <EuiDescribedFormGroup
        title={
          <h4>
            <FormattedMessage
              id="xpack.synthetics.settings.advanced.rebalanceShards.title"
              defaultMessage="Private location shard rebalancing"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.synthetics.settings.advanced.rebalanceShards.description"
            defaultMessage="Reassign monitors across the healthy agents of scalable private locations. Applies to all Kibana spaces. Disabling this pauses rebalancing and removes agent pins from existing monitors in the background."
          />
        }
      >
        <EuiSwitch
          data-test-subj="syntheticsRebalanceShardsEnabledSwitch"
          label={i18n.translate('xpack.synthetics.settings.advanced.rebalanceShards.label', {
            defaultMessage: 'Rebalance private location shards',
          })}
          checked={rebalanceShardsEnabled}
          onChange={(e) => {
            setRebalanceShardsEnabled(e.target.checked);
          }}
          disabled={isDisabled}
        />
      </EuiDescribedFormGroup>
      <EuiSpacer />
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="syntheticsAdvancedSettingsDiscardButton"
            iconType="cross"
            onClick={() => {
              setSyncInterval(
                settings?.privateLocationsSyncInterval ??
                  DYNAMIC_SETTINGS_DEFAULTS.privateLocationsSyncInterval
              );
              setRebalanceShardsEnabled(
                settings?.rebalancePrivateLocationShardsEnabled ??
                  DYNAMIC_SETTINGS_DEFAULTS.rebalancePrivateLocationShardsEnabled ??
                  true
              );
            }}
            flush="left"
            isDisabled={!isFormDirty}
            isLoading={loading}
          >
            {DISCARD_CHANGES}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="syntheticsAdvancedSettingsApplyButton"
            onClick={(evt: React.FormEvent) => {
              evt.preventDefault();
              onApply();
            }}
            fill
            isLoading={loading}
            isDisabled={!isFormDirty || isDisabled || !isFormValid}
          >
            {APPLY_CHANGES}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiForm>
  );
};

const DISCARD_CHANGES = i18n.translate('xpack.synthetics.settings.advanced.discardChanges', {
  defaultMessage: 'Discard changes',
});

const APPLY_CHANGES = i18n.translate('xpack.synthetics.settings.advanced.applyChanges', {
  defaultMessage: 'Apply changes',
});
