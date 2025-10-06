/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import { EuiSpacer } from '@elastic/eui';
import type { PolicyFormComponentCommonProps } from '../../types';
import { useTestIdGenerator } from '../../../../../../hooks/use_test_id_generator';
import { useLicense } from '../../../../../../../common/hooks/use_license';
import { SettingLockedCard } from '../setting_locked_card';
import { SettingCard } from '../setting_card';
import { DeviceControlSettingCardSwitch } from '../device_control_setting_card_switch';
import { DeviceControlProtectionLevel } from '../device_control_protection_level';
import { DeviceControlNotifyUserOption } from '../device_control_notify_user_option';
import {
  PolicyOperatingSystem,
  DeviceControlAccessLevel,
  type Immutable,
} from '../../../../../../../../common/endpoint/types';
import type { DeviceControlOSes } from '../../../../types';
import type { DeviceControlSettingCardSwitchProps } from '../device_control_setting_card_switch';

export type DeviceControlProps = PolicyFormComponentCommonProps;

export const DEVICE_CONTROL_CARD_TITLE = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.deviceControl',
  {
    defaultMessage: 'Device Control',
  }
);

const DEVICE_CONTROL_OS_VALUES: Immutable<DeviceControlOSes[]> = [
  PolicyOperatingSystem.windows,
  PolicyOperatingSystem.mac,
];

type AdjustSubfeatureOnProtectionSwitch = NonNullable<
  DeviceControlSettingCardSwitchProps['additionalOnSwitchChange']
>;

// NOTE: it mutates `policyConfigData` passed on input
const adjustDeviceControlSubfeaturesOnProtectionSwitch: AdjustSubfeatureOnProtectionSwitch = ({
  value,
  policyConfigData,
  protectionOsList,
}) => {
  for (const os of protectionOsList) {
    if (!value) {
      // When disabling device control, ensure all related settings are properly reset
      if (policyConfigData[os].device_control) {
        policyConfigData[os].device_control = {
          enabled: false,
          usb_storage:
            policyConfigData[os].device_control?.usb_storage || DeviceControlAccessLevel.audit,
        };
      }
      if (policyConfigData[os].popup?.device_control) {
        policyConfigData[os].popup.device_control = {
          enabled: false,
          message: policyConfigData[os].popup.device_control?.message || '',
        };
      }
    } else {
      // When enabling device control, restore to default values to ensure consistency
      policyConfigData[os].device_control = {
        enabled: true,
        usb_storage: DeviceControlAccessLevel.deny_all,
      };
      policyConfigData[os].popup = policyConfigData[os].popup || {};
      policyConfigData[os].popup.device_control = {
        enabled: true,
        message: policyConfigData[os].popup.device_control?.message || '',
      };
    }
  }

  return policyConfigData;
};

export const DeviceControlCard = React.memo<DeviceControlProps>(
  ({ policy, onChange, mode = 'edit', 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const isEnterprise = useLicense().isEnterprise();

    // Check if device_control exists in policy (backward compatibility)
    const deviceControlExists =
      policy.windows.device_control !== undefined && policy.mac.device_control !== undefined;
    const selected = Boolean(
      deviceControlExists &&
        (policy.windows.device_control?.enabled || policy.mac.device_control?.enabled)
    );

    const protectionLabel = i18n.translate(
      'xpack.securitySolution.endpoint.policy.protections.deviceControl',
      {
        defaultMessage: 'Device Control',
      }
    );

    if (!isEnterprise) {
      return (
        <SettingLockedCard
          title={DEVICE_CONTROL_CARD_TITLE}
          licenseType="enterprise"
          data-test-subj={getTestId('locked')}
        />
      );
    }

    return (
      <SettingCard
        type={i18n.translate('xpack.securitySolution.endpoint.policy.details.deviceControl', {
          defaultMessage: 'Device Control',
        })}
        supportedOss={[OperatingSystem.WINDOWS, OperatingSystem.MAC]}
        dataTestSubj={getTestId()}
        selected={selected}
        mode={mode}
        rightCorner={
          <DeviceControlSettingCardSwitch
            selected={selected}
            policy={policy}
            onChange={onChange}
            mode={mode}
            protectionLabel={protectionLabel}
            osList={DEVICE_CONTROL_OS_VALUES}
            additionalOnSwitchChange={adjustDeviceControlSubfeaturesOnProtectionSwitch}
            data-test-subj={getTestId('enableDisableSwitch')}
          />
        }
      >
        <DeviceControlProtectionLevel
          osList={DEVICE_CONTROL_OS_VALUES}
          onChange={onChange}
          policy={policy}
          mode={mode}
          data-test-subj={getTestId('protectionLevel')}
        />

        <DeviceControlNotifyUserOption
          onChange={onChange}
          policy={policy}
          mode={mode}
          data-test-subj={getTestId('notifyUser')}
        />

        <EuiSpacer size="m" />
      </SettingCard>
    );
  }
);
DeviceControlCard.displayName = 'DeviceControlCard';
