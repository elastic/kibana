/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import type { EuiSwitchProps } from '@elastic/eui';
import { EuiSwitch } from '@elastic/eui';
import { cloneDeep } from 'lodash';
import type { ImmutableArray, PolicyConfig } from '../../../../../../../common/endpoint/types';
import { ProtectionModes } from '../../../../../../../common/endpoint/types';
import { DefaultPolicyNotificationMessage } from '../../../../../../../common/endpoint/models/policy_config';
import { useLicense } from '../../../../../../common/hooks/use_license';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import type {
  BehaviorProtectionOSes,
  LinuxPolicyProtection,
  MalwareProtectionOSes,
  MacPolicyProtection,
  MemoryProtectionOSes,
  PolicyProtection,
  RansomwareProtectionOSes,
} from '../../../types';

type PerOsProtectionOperatingSystem =
  | MalwareProtectionOSes
  | MemoryProtectionOSes
  | BehaviorProtectionOSes
  | RansomwareProtectionOSes;

/**
 * The subset of an OS branch this toggle writes. Protections are optional because a policy stored
 * before one of them shipped does not carry it.
 */
type MutableOsProtectionBranches = Partial<
  Record<PolicyProtection, { mode: ProtectionModes; reputation_service?: boolean }>
> & {
  popup: Partial<Record<PolicyProtection, { enabled: boolean; message: string }>>;
};

export interface PerOsProtectionSideEffectOptions {
  value: boolean;
  os: PerOsProtectionOperatingSystem;
  osPolicy: PolicyConfig[PerOsProtectionOperatingSystem];
}

export interface PerOsProtectionMasterToggleProps {
  policy: PolicyConfig;
  onChange: (options: { isValid: boolean; updatedPolicy: PolicyConfig }) => void;
  mode?: 'edit' | 'view';
  protection: PolicyProtection;
  protectionLabel?: string;
  osList: ImmutableArray<PerOsProtectionOperatingSystem>;
  additionalOnOsSwitchChange?: (options: PerOsProtectionSideEffectOptions) => void;
  'data-test-subj'?: string;
}

export const PerOsProtectionMasterToggle = memo(
  ({
    policy,
    onChange,
    mode = 'edit',
    protection,
    protectionLabel,
    osList,
    additionalOnOsSwitchChange,
    'data-test-subj': dataTestSubj,
  }: PerOsProtectionMasterToggleProps) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const isPlatinumPlus = useLicense().isPlatinumPlus();
    // A missing mode, or a missing branch on a policy older than it, is treated as off so the
    // switch agrees with the rows.
    const selected = osList.some((os) => {
      if (os === 'windows') {
        return (policy.windows[protection]?.mode ?? ProtectionModes.off) !== ProtectionModes.off;
      }
      if (os === 'mac') {
        return (
          (policy.mac[protection as MacPolicyProtection]?.mode ?? ProtectionModes.off) !==
          ProtectionModes.off
        );
      }
      return (
        (policy.linux[protection as LinuxPolicyProtection]?.mode ?? ProtectionModes.off) !==
        ProtectionModes.off
      );
    });

    const handleSwitchChange = useCallback<EuiSwitchProps['onChange']>(
      (event) => {
        const value = event.target.checked;
        const nextMode = value ? ProtectionModes.prevent : ProtectionModes.off;
        const updatedPolicy = cloneDeep(policy);

        // The three OS branches take identical writes, and TypeScript rejects a union-indexed
        // write unless the value satisfies every protection at once. This view narrows each OS to
        // the fields the toggle owns: the branches stay optional, so a policy stored before one of
        // them existed gains it here instead of throwing, and nothing the license check reads is
        // ever written.
        for (const os of osList) {
          const osPolicy = updatedPolicy[os] as MutableOsProtectionBranches;

          const protectionBranch = osPolicy[protection] ?? { mode: nextMode };
          protectionBranch.mode = nextMode;
          osPolicy[protection] = protectionBranch;

          if (isPlatinumPlus) {
            const popupBranch = osPolicy.popup[protection] ?? {
              enabled: value,
              message: DefaultPolicyNotificationMessage,
            };
            popupBranch.enabled = value;
            osPolicy.popup[protection] = popupBranch;

            if (protection === 'behavior_protection') {
              protectionBranch.reputation_service = value;
            }
          }

          additionalOnOsSwitchChange?.({
            value,
            os,
            osPolicy: updatedPolicy[os] as PolicyConfig[PerOsProtectionOperatingSystem],
          });
        }

        onChange({ isValid: true, updatedPolicy });
      },
      [additionalOnOsSwitchChange, isPlatinumPlus, onChange, osList, policy, protection]
    );

    return (
      <EuiSwitch
        label={protectionLabel}
        showLabel={false}
        labelProps={{ 'data-test-subj': getTestId('label') }}
        checked={selected}
        disabled={mode !== 'edit'}
        onChange={handleSwitchChange}
        data-test-subj={getTestId()}
      />
    );
  }
);
PerOsProtectionMasterToggle.displayName = 'PerOsProtectionMasterToggle';
