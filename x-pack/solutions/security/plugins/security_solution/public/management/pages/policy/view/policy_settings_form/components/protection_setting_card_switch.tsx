/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { EuiSwitchProps } from '@elastic/eui';
import { EuiSwitch } from '@elastic/eui';
import { cloneDeep } from 'lodash';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import type { PolicyFormComponentCommonProps } from '../types';
import { useLicense } from '../../../../../../common/hooks/use_license';
import type {
  ImmutableArray,
  PolicyConfig,
  UIPolicyConfig,
} from '../../../../../../../common/endpoint/types';
import { ProtectionModes } from '../../../../../../../common/endpoint/types';
import type { LinuxPolicyProtection, MacPolicyProtection, PolicyProtection } from '../../../types';

export interface ProtectionSettingCardSwitchProps extends PolicyFormComponentCommonProps {
  protection: PolicyProtection;
  selected: boolean;
  protectionLabel?: string;
  osList: ImmutableArray<Partial<keyof UIPolicyConfig>>;
  additionalOnSwitchChange?: ({
    value,
    policyConfigData,
    protectionOsList,
  }: {
    value: boolean;
    policyConfigData: PolicyConfig;
    protectionOsList: ImmutableArray<Partial<keyof UIPolicyConfig>>;
  }) => PolicyConfig;
}

export const ProtectionSettingCardSwitch = React.memo(
  ({
    protection,
    protectionLabel,
    osList,
    additionalOnSwitchChange,
    onChange,
    policy,
    mode,
    selected,
    'data-test-subj': dataTestSubj,
  }: ProtectionSettingCardSwitchProps) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const isPlatinumPlus = useLicense().isPlatinumPlus();
    const isEditMode = mode === 'edit';

    const handleSwitchChange = useCallback<EuiSwitchProps['onChange']>(
      (event) => {
        const newPayload = cloneDeep(policy);

        if (event.target.checked === false) {
          for (const os of osList) {
            if (os === 'windows') {
              newPayload[os][protection].mode = ProtectionModes.off;
            } else if (os === 'mac') {
              newPayload[os][protection as MacPolicyProtection].mode = ProtectionModes.off;
            } else if (os === 'linux') {
              newPayload[os][protection as LinuxPolicyProtection].mode = ProtectionModes.off;
            }
            if (isPlatinumPlus) {
              if (os === 'windows') {
                newPayload[os].popup[protection].enabled = event.target.checked;
              } else if (os === 'mac') {
                newPayload[os].popup[protection as MacPolicyProtection].enabled =
                  event.target.checked;
              } else if (os === 'linux') {
                newPayload[os].popup[protection as LinuxPolicyProtection].enabled =
                  event.target.checked;
              }
              if (protection === 'behavior_protection') {
                newPayload.windows.behavior_protection.reputation_service = false;
                newPayload.mac.behavior_protection.reputation_service = false;
                newPayload.linux.behavior_protection.reputation_service = false;
              }
            }
          }
        } else {
          for (const os of osList) {
            if (os === 'windows') {
              newPayload[os][protection].mode = ProtectionModes.prevent;
            } else if (os === 'mac') {
              newPayload[os][protection as MacPolicyProtection].mode = ProtectionModes.prevent;
            } else if (os === 'linux') {
              newPayload[os][protection as LinuxPolicyProtection].mode = ProtectionModes.prevent;
            }
            if (isPlatinumPlus) {
              if (protection === 'behavior_protection') {
                newPayload.windows.behavior_protection.reputation_service = true;
                newPayload.mac.behavior_protection.reputation_service = true;
                newPayload.linux.behavior_protection.reputation_service = true;
              }
              if (os === 'windows') {
                newPayload[os].popup[protection].enabled = event.target.checked;
              } else if (os === 'mac') {
                newPayload[os].popup[protection as MacPolicyProtection].enabled =
                  event.target.checked;
              } else if (os === 'linux') {
                newPayload[os].popup[protection as LinuxPolicyProtection].enabled =
                  event.target.checked;
              }
            }
          }
        }

        onChange({
          isValid: true,
          updatedPolicy: additionalOnSwitchChange
            ? additionalOnSwitchChange({
                value: event.target.checked,
                policyConfigData: newPayload,
                protectionOsList: osList,
              })
            : newPayload,
        });
      },
      [policy, onChange, additionalOnSwitchChange, osList, isPlatinumPlus, protection]
    );

    return (
      <EuiSwitch
        label={protectionLabel}
        labelProps={{ 'data-test-subj': getTestId('label') }}
        checked={selected}
        disabled={!isEditMode}
        onChange={handleSwitchChange}
        data-test-subj={getTestId()}
      />
    );
  }
);

ProtectionSettingCardSwitch.displayName = 'ProtectionSettingCardSwitch';
