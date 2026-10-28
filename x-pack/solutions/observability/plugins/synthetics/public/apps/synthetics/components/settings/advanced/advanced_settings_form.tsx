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
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiSpacer,
  EuiSwitch,
  EuiToolTip,
} from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux-v7';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import { KbnInfoCallout } from '@kbn/ui-callout';
import { isEqual } from 'lodash';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../../../../common/constants';
import { selectDynamicSettings } from '../../../state/settings/selectors';
import {
  getDynamicSettingsAction,
  setDynamicSettingsAction,
} from '../../../state/settings/actions';
import type { DynamicSettings } from '../../../../../../common/runtime_types';
import { useCanManageClusterSettings } from './use_can_manage_cluster_settings';

export const AdvancedSettingsForm = () => {
  const dispatch = useDispatch();

  const { settings, loading } = useSelector(selectDynamicSettings);

  const [rebalanceShardsEnabled, setRebalanceShardsEnabled] = useState<boolean>(
    DYNAMIC_SETTINGS_DEFAULTS.rebalancePrivateLocationShardsEnabled ?? true
  );

  const canEdit: boolean =
    !!useKibana().services?.application?.capabilities.uptime.configureSettings || false;

  const { canManage: canManageClusterSettings, loading: privilegesLoading } =
    useCanManageClusterSettings();

  const isDisabled = !canEdit || !canManageClusterSettings;
  const lacksClusterPrivilege = canEdit && !canManageClusterSettings && !privilegesLoading;

  const withClusterPrivilegeTooltip = (control: React.ReactElement) =>
    lacksClusterPrivilege ? (
      <EuiToolTip content={CLUSTER_PRIVILEGE_REQUIRED}>{control}</EuiToolTip>
    ) : (
      control
    );

  useEffect(() => {
    dispatch(getDynamicSettingsAction.get());
  }, [dispatch]);

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
          rebalancePrivateLocationShardsEnabled: rebalanceShardsEnabled,
        } as DynamicSettings)
      );
    }
  };

  const isFormDirty = !isEqual(
    rebalanceShardsEnabled,
    settings?.rebalancePrivateLocationShardsEnabled ?? true
  );

  return (
    <EuiForm>
      <EuiSpacer size="m" />
      {!canEdit && (
        <>
          <KbnInfoCallout
            announceOnMount
            title={i18n.translate('xpack.synthetics.settings.advanced.readOnly', {
              defaultMessage:
                'You do not have sufficient permissions to edit these settings. Contact your administrator.',
            })}
            size="s"
          />
          <EuiSpacer size="m" />
        </>
      )}
      {lacksClusterPrivilege && (
        <>
          <KbnInfoCallout
            announceOnMount
            data-test-subj="syntheticsAdvancedSettingsClusterPrivilegeCallout"
            title={i18n.translate('xpack.synthetics.settings.advanced.clusterPrivilegeRequired', {
              defaultMessage:
                'These settings apply to private locations in all spaces. Editing them requires the "Can manage private locations" privilege in all spaces.',
            })}
            size="s"
          />
          <EuiSpacer size="m" />
        </>
      )}
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
        {withClusterPrivilegeTooltip(
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
        )}
      </EuiDescribedFormGroup>
      <EuiSpacer />
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="syntheticsAdvancedSettingsDiscardButton"
            iconType="cross"
            onClick={() => {
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
            isDisabled={!isFormDirty || isDisabled}
          >
            {APPLY_CHANGES}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiForm>
  );
};

const CLUSTER_PRIVILEGE_REQUIRED = i18n.translate(
  'xpack.synthetics.settings.advanced.clusterPrivilegeTooltip',
  {
    defaultMessage:
      'Applies to all spaces. Requires the "Can manage private locations" privilege in all spaces.',
  }
);

const DISCARD_CHANGES = i18n.translate('xpack.synthetics.settings.advanced.discardChanges', {
  defaultMessage: 'Discard changes',
});

const APPLY_CHANGES = i18n.translate('xpack.synthetics.settings.advanced.applyChanges', {
  defaultMessage: 'Apply changes',
});
