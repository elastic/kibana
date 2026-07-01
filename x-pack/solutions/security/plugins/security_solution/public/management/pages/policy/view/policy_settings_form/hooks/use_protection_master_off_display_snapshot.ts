/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { ProtectionModes } from '../../../../../../../common/endpoint/types';

/** Per-OS protection modes captured when the section master switch turns off (for read-only UI). */
export type ProtectionMasterOffDisplaySnapshot = Partial<
  Record<'windows' | 'mac' | 'linux', ProtectionModes>
>;

/**
 * When the master switch turns off, policy modes become `off` but we keep a snapshot so the UI
 * can still show the prior detect/prevent selection (disabled). Cleared when the section is on again.
 */
export const useProtectionMasterOffDisplaySnapshot = (sectionSelected: boolean) => {
  const [masterOffDisplayModes, setMasterOffDisplayModes] =
    useState<ProtectionMasterOffDisplaySnapshot>();

  useEffect(() => {
    if (sectionSelected) {
      setMasterOffDisplayModes(undefined);
    }
  }, [sectionSelected]);

  return { masterOffDisplayModes, setMasterOffDisplayModes };
};
