/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { PolicyConfig, ProtectionFields } from '../../../../../../../common/endpoint/types';
import { ProtectionModes } from '../../../../../../../common/endpoint/types';
import { useLicense } from '../../../../../../common/hooks/use_license';
import type {
  BehaviorProtectionOSes,
  MalwareProtectionOSes,
  MemoryProtectionOSes,
  PolicyProtection,
  RansomwareProtectionOSes,
} from '../../../types';
import type { PolicyFormComponentCommonProps } from '../types';
import type { PerOsPolicyAccessor } from './policy_accessor';

interface ProtectionOperatingSystems {
  malware: MalwareProtectionOSes;
  memory_protection: MemoryProtectionOSes;
  behavior_protection: BehaviorProtectionOSes;
  ransomware: RansomwareProtectionOSes;
}

type ProtectionPolicyBranch<Protection extends PolicyProtection> = {
  [Key in Protection]: ProtectionFields;
} & {
  popup: { [Key in Protection]: { enabled: boolean } };
};

export const useProtectionModeChangeHandler = <Protection extends PolicyProtection>(
  accessor: PerOsPolicyAccessor<ProtectionOperatingSystems[Protection]>,
  protection: Protection,
  onChange: PolicyFormComponentCommonProps['onChange']
): ((nextMode: ProtectionModes) => void) => {
  const isPlatinumPlus = useLicense().isPlatinumPlus();

  return useCallback(
    (nextMode: ProtectionModes) => {
      const updatedPolicy = accessor.update((currentOsPolicy) => {
        const protectionPolicy =
          currentOsPolicy as PolicyConfig[ProtectionOperatingSystems[Protection]] &
            ProtectionPolicyBranch<Protection>;
        // Spread rather than assign into the branch: a policy stored before the protection
        // existed has no object there, and any sibling field it does carry must survive.
        protectionPolicy[protection] = { ...protectionPolicy[protection], mode: nextMode };
        // An active mode always writes popup.enabled from the new mode, true only for prevent.
        // off is the only mode that leaves popup.enabled untouched.
        if (isPlatinumPlus && nextMode !== ProtectionModes.off) {
          protectionPolicy.popup[protection] = {
            ...protectionPolicy.popup[protection],
            enabled: nextMode === ProtectionModes.prevent,
          };
        }
      });
      onChange({ isValid: true, updatedPolicy });
    },
    [accessor, isPlatinumPlus, onChange, protection]
  );
};
