/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { cloneDeep } from 'lodash';
import { set } from '@kbn/safer-lodash-set';
import { FleetPackagePolicyGenerator } from '../../../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import { ProtectionModes } from '../../../../../../../common/endpoint/types';
import { useProtectionSectionSelected } from './use_protection_section_selected';

const MALWARE_OS_LIST = ['windows', 'mac', 'linux'] as const;

describe('useProtectionSectionSelected', () => {
  const basePolicy = () =>
    new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy().inputs[0].config.policy
      .value;

  it('returns sectionSelected=true when all OSes are in prevent mode', () => {
    const policy = basePolicy();
    // Default generated policy has prevent for all OSes
    const { result } = renderHook(() =>
      useProtectionSectionSelected(policy, 'malware', MALWARE_OS_LIST)
    );
    expect(result.current.sectionSelected).toBe(true);
  });

  it('returns sectionSelected=true when only one OS is in detect mode and others are off', () => {
    const policy = basePolicy();
    set(policy, 'windows.malware.mode', ProtectionModes.off);
    set(policy, 'mac.malware.mode', ProtectionModes.detect);
    set(policy, 'linux.malware.mode', ProtectionModes.off);
    const { result } = renderHook(() =>
      useProtectionSectionSelected(policy, 'malware', MALWARE_OS_LIST)
    );
    expect(result.current.sectionSelected).toBe(true);
  });

  it('returns sectionSelected=false when all OSes are off and no explicit intent', () => {
    const policy = basePolicy();
    set(policy, 'windows.malware.mode', ProtectionModes.off);
    set(policy, 'mac.malware.mode', ProtectionModes.off);
    set(policy, 'linux.malware.mode', ProtectionModes.off);
    const { result } = renderHook(() =>
      useProtectionSectionSelected(policy, 'malware', MALWARE_OS_LIST)
    );
    expect(result.current.sectionSelected).toBe(false);
  });

  it('returns sectionSelected=true after onSectionActiveChange(true) even when all OSes are off', () => {
    const policy = basePolicy();
    set(policy, 'windows.malware.mode', ProtectionModes.off);
    set(policy, 'mac.malware.mode', ProtectionModes.off);
    set(policy, 'linux.malware.mode', ProtectionModes.off);
    const { result } = renderHook(() =>
      useProtectionSectionSelected(policy, 'malware', MALWARE_OS_LIST)
    );
    expect(result.current.sectionSelected).toBe(false);

    act(() => {
      result.current.onSectionActiveChange(true);
    });

    expect(result.current.sectionSelected).toBe(true);
  });

  it('returns sectionSelected=false after onSectionActiveChange(false) when all OSes are off', () => {
    const policy = basePolicy();
    set(policy, 'windows.malware.mode', ProtectionModes.off);
    set(policy, 'mac.malware.mode', ProtectionModes.off);
    set(policy, 'linux.malware.mode', ProtectionModes.off);
    const { result } = renderHook(() =>
      useProtectionSectionSelected(policy, 'malware', MALWARE_OS_LIST)
    );

    act(() => {
      result.current.onSectionActiveChange(true);
    });
    expect(result.current.sectionSelected).toBe(true);

    act(() => {
      result.current.onSectionActiveChange(false);
    });
    expect(result.current.sectionSelected).toBe(false);
  });

  it('re-derives sectionSelected from policy when policy is updated with a non-off mode', () => {
    const policy = basePolicy();
    set(policy, 'windows.malware.mode', ProtectionModes.off);
    set(policy, 'mac.malware.mode', ProtectionModes.off);
    set(policy, 'linux.malware.mode', ProtectionModes.off);

    const { result, rerender } = renderHook(
      ({ p }: { p: typeof policy }) => useProtectionSectionSelected(p, 'malware', MALWARE_OS_LIST),
      { initialProps: { p: policy } }
    );
    expect(result.current.sectionSelected).toBe(false);

    const updatedPolicy = cloneDeep(policy);
    set(updatedPolicy, 'windows.malware.mode', ProtectionModes.detect);
    rerender({ p: updatedPolicy });

    expect(result.current.sectionSelected).toBe(true);
  });
});
