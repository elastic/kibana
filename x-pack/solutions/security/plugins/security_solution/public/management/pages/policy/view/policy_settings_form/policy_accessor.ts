/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import type { Immutable, PolicyConfig } from '../../../../../../common/endpoint/types';
import type {
  AiDataCollectionOSes,
  BehaviorProtectionOSes,
  DeviceControlOSes,
  MalwareProtectionOSes,
  MemoryProtectionOSes,
  RansomwareProtectionOSes,
} from '../../types';

type PolicyAccessorOperatingSystem =
  | MalwareProtectionOSes
  | MemoryProtectionOSes
  | BehaviorProtectionOSes
  | RansomwareProtectionOSes
  | DeviceControlOSes
  | AiDataCollectionOSes;

/**
 * `OS` is invariant because `update` takes an `OS`-typed callback. Callers therefore use the
 * protection's full OS union rather than a narrow literal.
 */
export interface PolicyAccessor<OS extends PolicyAccessorOperatingSystem> {
  read: () => Immutable<PolicyConfig[OS]>;
  update: (updater: (osPolicy: PolicyConfig[OS]) => void) => PolicyConfig;
}

const createPolicyAccessor = <OS extends PolicyAccessorOperatingSystem>(
  policy: PolicyConfig,
  os: OS
): PolicyAccessor<OS> => {
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
): PolicyAccessor<MalwareProtectionOSes> => createPolicyAccessor(policy, os);

export const createMemoryProtectionPolicyAccessor = (
  policy: PolicyConfig,
  os: MemoryProtectionOSes
): PolicyAccessor<MemoryProtectionOSes> => createPolicyAccessor(policy, os);

export const createBehaviorProtectionPolicyAccessor = (
  policy: PolicyConfig,
  os: BehaviorProtectionOSes
): PolicyAccessor<BehaviorProtectionOSes> => createPolicyAccessor(policy, os);

export const createRansomwarePolicyAccessor = (
  policy: PolicyConfig,
  os: RansomwareProtectionOSes
): PolicyAccessor<RansomwareProtectionOSes> => createPolicyAccessor(policy, os);

export const createDeviceControlPolicyAccessor = (
  policy: PolicyConfig,
  os: DeviceControlOSes
): PolicyAccessor<DeviceControlOSes> => createPolicyAccessor(policy, os);

export const createAiDataCollectionPolicyAccessor = (
  policy: PolicyConfig,
  os: AiDataCollectionOSes
): PolicyAccessor<AiDataCollectionOSes> => createPolicyAccessor(policy, os);
