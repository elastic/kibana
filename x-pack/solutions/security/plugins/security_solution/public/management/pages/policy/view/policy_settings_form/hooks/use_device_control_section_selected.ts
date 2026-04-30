/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { ImmutableArray, PolicyConfig } from '../../../../../../../common/endpoint/types';
import type { DeviceControlOSes } from '../../../types';

/**
 * Derives whether the device control section master switch is on. All OSes can have
 * `device_control.enabled` false while the section stays on until the user turns the master switch
 * off — we OR policy with explicit master intent from `onSectionActiveChange`.
 */
export function useDeviceControlSectionSelected(
  policy: PolicyConfig,
  osList: ImmutableArray<DeviceControlOSes>
): {
  sectionSelected: boolean;
  onSectionActiveChange: (active: boolean) => void;
} {
  const policyAnyOsOn = useMemo(
    () =>
      osList.some((os) => {
        const dc = policy[os].device_control;
        return Boolean(dc?.enabled);
      }),
    [policy, osList]
  );

  const [masterSectionIntentOn, setMasterSectionIntentOn] = useState(false);

  const sectionSelected = policyAnyOsOn || masterSectionIntentOn;

  const onSectionActiveChange = useCallback((active: boolean) => {
    setMasterSectionIntentOn(active);
  }, []);

  return { sectionSelected, onSectionActiveChange };
}
