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
import { createPopupBranch, createProtectionBranch } from './create_protection_branch';

interface ProtectionOperatingSystems {
  malware: MalwareProtectionOSes;
  memory_protection: MemoryProtectionOSes;
  behavior_protection: BehaviorProtectionOSes;
  ransomware: RansomwareProtectionOSes;
}

// `supported` is optional only because `malware` has no such field; `createProtectionBranch` owns
// which protections get one. It is declared here so a write cannot silently drop it.
type ProtectionPolicyBranch<Protection extends PolicyProtection> = {
  [Key in Protection]: ProtectionFields & { supported?: boolean };
} & {
  popup: { [Key in Protection]: { enabled: boolean; message: string } };
};

export interface PerOsProtectionModeChangeSideEffectOptions<Protection extends PolicyProtection> {
  previousMode: ProtectionModes;
  nextMode: ProtectionModes;
  osPolicy: PolicyConfig[ProtectionOperatingSystems[Protection]];
}

export const useProtectionModeChangeHandler = <Protection extends PolicyProtection>(
  accessor: PerOsPolicyAccessor<ProtectionOperatingSystems[Protection]>,
  protection: Protection,
  onChange: PolicyFormComponentCommonProps['onChange'],
  additionalOnModeChange?: (options: PerOsProtectionModeChangeSideEffectOptions<Protection>) => void
): ((nextMode: ProtectionModes) => void) => {
  const isPlatinumPlus = useLicense().isPlatinumPlus();

  return useCallback(
    (nextMode: ProtectionModes) => {
      const updatedPolicy = accessor.update((currentOsPolicy) => {
        const protectionPolicy =
          currentOsPolicy as PolicyConfig[ProtectionOperatingSystems[Protection]] &
            ProtectionPolicyBranch<Protection>;
        const previousMode = protectionPolicy[protection]?.mode ?? ProtectionModes.off;
        // Spread rather than assign into the branch: a policy stored before the protection
        // existed has no object there, and any sibling field it does carry must survive. The
        // seeded branch supplies `supported`, which the server's license check rejects when absent.
        protectionPolicy[protection] = {
          ...createProtectionBranch(protection, nextMode, isPlatinumPlus),
          ...protectionPolicy[protection],
          mode: nextMode,
        };
        // An active mode always writes popup.enabled from the new mode, true only for prevent.
        // off is the only mode that leaves popup.enabled untouched.
        if (isPlatinumPlus && nextMode !== ProtectionModes.off) {
          protectionPolicy.popup[protection] = {
            ...createPopupBranch(protection, nextMode === ProtectionModes.prevent),
            ...protectionPolicy.popup[protection],
            enabled: nextMode === ProtectionModes.prevent,
          };
        }

        additionalOnModeChange?.({ previousMode, nextMode, osPolicy: currentOsPolicy });
      });
      onChange({ isValid: true, updatedPolicy });
    },
    [accessor, additionalOnModeChange, isPlatinumPlus, onChange, protection]
  );
};
