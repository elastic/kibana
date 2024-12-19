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
import { useTestIdGenerator } from '../../../../../../hooks/use_test_id_generator';
import { ProtectionSettingCardSwitch } from '../protection_setting_card_switch';
import { NotifyUserOption } from '../notify_user_option';
import { DetectPreventProtectionLevel } from '../detect_prevent_protection_level';
import { SettingCard } from '../setting_card';
import type { PolicyFormComponentCommonProps } from '../../types';
import type { Immutable } from '../../../../../../../../common/endpoint/types';
import {
  PolicyOperatingSystem,
  ProtectionModes,
} from '../../../../../../../../common/endpoint/types';
import type { RansomwareProtectionOSes } from '../../../../types';
import { useLicense } from '../../../../../../../common/hooks/use_license';
import { SettingLockedCard } from '../setting_locked_card';
import { useGetProtectionsUnavailableComponent } from '../../hooks/use_get_protections_unavailable_component';

const RANSOMEWARE_OS_VALUES: Immutable<RansomwareProtectionOSes[]> = [
  PolicyOperatingSystem.windows,
];

export const LOCKED_CARD_RAMSOMWARE_TITLE = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.ransomware',
  {
    defaultMessage: 'Ransomware',
  }
);

export type RansomwareProtectionCardProps = PolicyFormComponentCommonProps;

export const RansomwareProtectionCard = React.memo<RansomwareProtectionCardProps>(
  ({ policy, onChange, mode, 'data-test-subj': dataTestSubj }) => {
    const isPlatinumPlus = useLicense().isPlatinumPlus();
    const isProtectionsAllowed = !useGetProtectionsUnavailableComponent();
    const getTestId = useTestIdGenerator(dataTestSubj);
    const protection = 'ransomware';
    const selected = (policy && policy.windows[protection].mode) !== ProtectionModes.off;

    const protectionLabel = i18n.translate(
      'xpack.securitySolution.endpoint.policy.protections.ransomware',
      {
        defaultMessage: 'Ransomware protections',
      }
    );

    if (!isProtectionsAllowed) {
      return null;
    }

    if (!isPlatinumPlus) {
      return (
        <SettingLockedCard
          title={LOCKED_CARD_RAMSOMWARE_TITLE}
          data-test-subj={getTestId('locked')}
        />
      );
    }

    return (
      <SettingCard
        type={i18n.translate('xpack.securitySolution.endpoint.policy.details.ransomware', {
          defaultMessage: 'Ransomware',
        })}
        supportedOss={[OperatingSystem.WINDOWS]}
        dataTestSubj={getTestId()}
        selected={selected}
        mode={mode}
        rightCorner={
          <ProtectionSettingCardSwitch
            selected={selected}
            policy={policy}
            onChange={onChange}
            mode={mode}
            protection={protection}
            protectionLabel={protectionLabel}
            osList={RANSOMEWARE_OS_VALUES}
            data-test-subj={getTestId('enableDisableSwitch')}
          />
        }
      >
        <DetectPreventProtectionLevel
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
        />
        <EuiSpacer size="m" />
      </SettingCard>
    );
  }
);
RansomwareProtectionCard.displayName = 'RansomwareProtectionCard';
