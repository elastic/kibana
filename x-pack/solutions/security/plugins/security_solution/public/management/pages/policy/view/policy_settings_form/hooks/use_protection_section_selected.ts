/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import {
  ProtectionModes,
  type ImmutableArray,
  type PolicyConfig,
  type UIPolicyConfig,
} from '../../../../../../../common/endpoint/types';
import type { PolicyProtection } from '../../../types';

/**
 * Derives whether the protection section master switch is on. Per-OS modes can all be `off`
 * (Disable) while the section stays on until the user turns the master switch off — we OR policy
 * with explicit master intent from `onSectionActiveChange` (same handler order as the switch).
 */
export function useProtectionSectionSelected(
  policy: PolicyConfig,
  protection: PolicyProtection,
  osList: ImmutableArray<Partial<keyof UIPolicyConfig>>
): {
  sectionSelected: boolean;
  onSectionActiveChange: (active: boolean) => void;
} {
  const policyAnyOsOn = useMemo(
    () =>
      osList.some((os) => {
        const osPolicy = policy[os as keyof PolicyConfig];
        const protectionBlock = osPolicy[protection as keyof typeof osPolicy] as {
          mode: ProtectionModes;
        };
        return protectionBlock.mode !== ProtectionModes.off;
      }),
    [policy, osList, protection]
  );

  const [masterSectionIntentOn, setMasterSectionIntentOn] = useState(false);

  const sectionSelected = policyAnyOsOn || masterSectionIntentOn;

  const onSectionActiveChange = useCallback((active: boolean) => {
    setMasterSectionIntentOn(active);
  }, []);

  return { sectionSelected, onSectionActiveChange };
}
