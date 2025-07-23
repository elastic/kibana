/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { PolicyFormComponentCommonProps } from '../../types';
import { useTestIdGenerator } from '../../../../../../hooks/use_test_id_generator';
import { useLicense } from '../../../../../../../common/hooks/use_license';
import { SettingLockedCard } from '../setting_locked_card';

export type UsbDeviceProtectionProps = PolicyFormComponentCommonProps;

export const DEVICE_CONTROL_CARD_TITLE = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.deviceControl',
  {
    defaultMessage: 'USB device protection',
  }
);

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

    return <div>{'Hello'}</div>;
  }
);
DeviceControlCard.displayName = 'DeviceControlCard';
