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
import { ProtectionSettingCardSwitch } from '../protection_setting_card_switch';
import {
  PolicyOperatingSystem,
  type Immutable,
} from '../../../../../../../../common/endpoint/types';
import type { RansomwareProtectionOSes } from '../../../../types';

export type UsbDeviceProtectionProps = PolicyFormComponentCommonProps;

export const DEVICE_CONTROL_CARD_TITLE = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.deviceControl',
  {
    defaultMessage: 'Device Control',
  }
);

const protectionLabel = i18n.translate(
  'xpack.securitySolution.endpoint.policy.protections.deviceControl',
  {
    defaultMessage: 'Device Control',
  }
);

const DEVICE_CONTROL_OS_VALUES: Immutable<RansomwareProtectionOSes[]> = [
  PolicyOperatingSystem.windows,
  // PolicyOperatingSystem.mac,
];

/**
 * The Malware Protections form for policy details
 * which will configure for all relevant OSes.
 */
export const DeviceControlCard = React.memo<UsbDeviceProtectionProps>(
  ({ policy, onChange, mode = 'edit', 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const isEnterprise = useLicense().isEnterprise();

    // const shouldRenderComponent = isProtectionsAllowed && isTrustedDevicesAllowed && isEnterprise;
    // const selected = (policy && policy.windows[protection].mode) !== ProtectionModes.off;

    // const protectionLabel = i18n.translate(
    //   'xpack.securitySolution.endpoint.policy.protections.malware',
    //   {
    //     defaultMessage: 'Malware protections',
    //   }
    // );

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
        // selected={selected}
        selected
        mode={mode}
        rightCorner={
          <ProtectionSettingCardSwitch
            // selected={selected}
            selected
            policy={policy}
            onChange={onChange}
            mode={mode}
            protection={'malware'}
            protectionLabel={protectionLabel}
            osList={DEVICE_CONTROL_OS_VALUES}
            data-test-subj={getTestId('enableDisableSwitch')}
          />
        }
      >
        {/* <DetectPreventProtectionLevel
          protection={protection}
          osList={RANSOMEWARE_OS_VALUES}
          onChange={onChange}
          policy={policy}
          mode={mode}
          data-test-subj={getTestId('protectionLevel')}
        />

        <NotifyUserOption
          policy={policy}
          onChange={onChange}
          mode={mode}
          protection={protection}
          osList={RANSOMEWARE_OS_VALUES}
          data-test-subj={getTestId('notifyUser')}
        /> */}

        <EuiSpacer size="m" />
      </SettingCard>
    );
  }
);
DeviceControlCard.displayName = 'DeviceControlCard';
