/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import type { Immutable, PolicyConfig } from '../../../../../../../common/endpoint/types';
import type {
  BehaviorProtectionOSes,
  DeviceControlOSes,
  MalwareProtectionOSes,
  MemoryProtectionOSes,
  RansomwareProtectionOSes,
} from '../../../types';

type PerOsPolicyOperatingSystem =
  | MalwareProtectionOSes
  | MemoryProtectionOSes
  | BehaviorProtectionOSes
  | RansomwareProtectionOSes
  | DeviceControlOSes;

/**
 * `OS` is invariant because `update` takes an `OS`-typed callback. Callers therefore use the
 * protection's full OS union rather than a narrow literal.
 */
export interface PerOsPolicyAccessor<OS extends PerOsPolicyOperatingSystem> {
  read: () => Immutable<PolicyConfig[OS]>;
  update: (updater: (osPolicy: PolicyConfig[OS]) => void) => PolicyConfig;
}

const createPerOsPolicyAccessor = <OS extends PerOsPolicyOperatingSystem>(
  policy: PolicyConfig,
  os: OS
): PerOsPolicyAccessor<OS> => {
  return {
    read: () => policy[os] as Immutable<PolicyConfig[OS]>,
    update: (updater) => {
      const updatedPolicy = cloneDeep(policy);
      updater(updatedPolicy[os]);
      return updatedPolicy;
    },
  };
};

export const createMalwarePolicyAccessor = (
  policy: PolicyConfig,
  os: MalwareProtectionOSes
): PerOsPolicyAccessor<MalwareProtectionOSes> => createPerOsPolicyAccessor(policy, os);

export const createMemoryProtectionPolicyAccessor = (
  policy: PolicyConfig,
  os: MemoryProtectionOSes
): PerOsPolicyAccessor<MemoryProtectionOSes> => createPerOsPolicyAccessor(policy, os);

export const createBehaviorProtectionPolicyAccessor = (
  policy: PolicyConfig,
  os: BehaviorProtectionOSes
): PerOsPolicyAccessor<BehaviorProtectionOSes> => createPerOsPolicyAccessor(policy, os);

export const createRansomwarePolicyAccessor = (
  policy: PolicyConfig,
  os: RansomwareProtectionOSes
): PerOsPolicyAccessor<RansomwareProtectionOSes> => createPerOsPolicyAccessor(policy, os);

export const createDeviceControlPolicyAccessor = (
  policy: PolicyConfig,
  os: DeviceControlOSes
): PerOsPolicyAccessor<DeviceControlOSes> => createPerOsPolicyAccessor(policy, os);
