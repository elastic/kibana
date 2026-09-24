/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { cloneDeep } from 'lodash';
import { FleetPackagePolicyGenerator } from '../../../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import type { PolicyConfig } from '../../../../../../../common/endpoint/types';
import { ProtectionModes } from '../../../../../../../common/endpoint/types';
import { createMemoryProtectionPolicyAccessor } from './policy_accessor';
import type { PerOsProtectionModeChangeSideEffectOptions } from './use_protection_mode_change_handler';
import { useProtectionModeChangeHandler } from './use_protection_mode_change_handler';

jest.mock('../../../../../../common/hooks/use_license');

describe('useProtectionModeChangeHandler', () => {
  let policy: PolicyConfig;
  let onChange: jest.Mock;

  const getUpdatedPolicy = (): PolicyConfig =>
    onChange.mock.calls[onChange.mock.calls.length - 1][0].updatedPolicy;

  const renderMacModeChangeHandler = (
    additionalOnModeChange?: (
      options: PerOsProtectionModeChangeSideEffectOptions<'memory_protection'>
    ) => void
  ) =>
    renderHook(() =>
      useProtectionModeChangeHandler(
        createMemoryProtectionPolicyAccessor(policy, 'mac'),
        'memory_protection',
        onChange,
        additionalOnModeChange
      )
    ).result.current;

  beforeEach(() => {
    policy = new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy().inputs[0]
      .config.policy.value;
    onChange = jest.fn();
  });

  it('passes the stored mode and the selected mode to the side effect', () => {
    policy.mac.memory_protection.mode = ProtectionModes.detect;
    const additionalOnModeChange = jest.fn();
    const handleModeChange = renderMacModeChangeHandler(additionalOnModeChange);

    handleModeChange(ProtectionModes.off);

    expect(additionalOnModeChange).toHaveBeenCalledTimes(1);
    expect(additionalOnModeChange).toHaveBeenCalledWith(
      expect.objectContaining({
        previousMode: ProtectionModes.detect,
        nextMode: ProtectionModes.off,
      })
    );
  });

  it('reports a missing protection branch as off', () => {
    // @ts-expect-error reproducing a policy stored before the protection existed
    delete policy.mac.memory_protection;
    const additionalOnModeChange = jest.fn();
    const handleModeChange = renderMacModeChangeHandler(additionalOnModeChange);

    handleModeChange(ProtectionModes.prevent);

    expect(additionalOnModeChange).toHaveBeenCalledWith(
      expect.objectContaining({
        previousMode: ProtectionModes.off,
        nextMode: ProtectionModes.prevent,
      })
    );
  });

  it("keeps the side effect's writes to that OS on updatedPolicy without mutating the input", () => {
    const policyBefore = cloneDeep(policy);
    const handleModeChange = renderMacModeChangeHandler(({ osPolicy }) => {
      osPolicy.memory_protection.custom_yara_signatures = false;
    });

    handleModeChange(ProtectionModes.detect);

    const updatedPolicy = getUpdatedPolicy();
    expect(updatedPolicy.mac.memory_protection.mode).toBe(ProtectionModes.detect);
    expect(updatedPolicy.mac.memory_protection.custom_yara_signatures).toBe(false);
    expect(updatedPolicy.windows).toEqual(policyBefore.windows);
    expect(updatedPolicy.linux).toEqual(policyBefore.linux);
    expect(policy).toEqual(policyBefore);
  });
});
