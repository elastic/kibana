/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import { notifyProtectionFeatureUsage } from './notify_protection_feature_usage';
import { policyFactory } from '../../common/endpoint/models/policy_config';
import { ProtectionModes } from '../../common/endpoint/types';
import type { PolicyConfig, PolicyData } from '../../common/endpoint/types';
import { createFeatureUsageServiceMock } from '../endpoint/services/feature_usage/mocks';

const buildPolicyData = (policy: PolicyConfig): PolicyData =>
  ({
    inputs: [{ config: { policy: { value: policy } } }],
  } as unknown as PolicyData);

const buildNewPackagePolicy = (policy: PolicyConfig): NewPackagePolicy =>
  ({
    id: 'policy-id',
    inputs: [{ config: { policy: { value: policy } } }],
  } as unknown as NewPackagePolicy);

describe('notifyProtectionFeatureUsage ransomware notifications', () => {
  it('notifies once when ransomware becomes newly enabled on Linux', async () => {
    const current = policyFactory();
    current.windows.ransomware.mode = ProtectionModes.off;
    current.mac.ransomware.mode = ProtectionModes.off;
    current.linux.ransomware = { mode: ProtectionModes.off, supported: true };

    const next = policyFactory();
    next.windows.ransomware.mode = ProtectionModes.off;
    next.mac.ransomware.mode = ProtectionModes.off;
    next.linux.ransomware = { mode: ProtectionModes.prevent, supported: true };

    const featureUsageService = createFeatureUsageServiceMock();

    await notifyProtectionFeatureUsage(
      buildNewPackagePolicy(next),
      buildPolicyData(current),
      featureUsageService
    );

    expect(featureUsageService.notifyUsage).toHaveBeenCalledWith('RANSOMWARE_PROTECTION');
    expect(featureUsageService.notifyUsage).toHaveBeenCalledTimes(1);
  });

  it('notifies ransomware only once when several OSes newly enable it at the same time', async () => {
    const current = policyFactory();
    current.windows.ransomware.mode = ProtectionModes.off;
    current.mac.ransomware.mode = ProtectionModes.off;
    current.linux.ransomware = { mode: ProtectionModes.off, supported: true };

    const next = policyFactory();
    next.windows.ransomware.mode = ProtectionModes.prevent;
    next.mac.ransomware.mode = ProtectionModes.prevent;
    next.linux.ransomware = { mode: ProtectionModes.prevent, supported: true };

    const featureUsageService = createFeatureUsageServiceMock();

    await notifyProtectionFeatureUsage(
      buildNewPackagePolicy(next),
      buildPolicyData(current),
      featureUsageService
    );

    expect(featureUsageService.notifyUsage).toHaveBeenCalledWith('RANSOMWARE_PROTECTION');
    expect(featureUsageService.notifyUsage).toHaveBeenCalledTimes(1);
  });

  it('treats an absent Linux ransomware branch as off, so enabling it counts as newly enabled', async () => {
    const current = policyFactory();
    current.windows.ransomware.mode = ProtectionModes.off;
    current.mac.ransomware.mode = ProtectionModes.off;
    delete current.linux.ransomware;

    const next = policyFactory();
    next.windows.ransomware.mode = ProtectionModes.off;
    next.mac.ransomware.mode = ProtectionModes.off;
    next.linux.ransomware = { mode: ProtectionModes.prevent, supported: true };

    const featureUsageService = createFeatureUsageServiceMock();

    await notifyProtectionFeatureUsage(
      buildNewPackagePolicy(next),
      buildPolicyData(current),
      featureUsageService
    );

    expect(featureUsageService.notifyUsage).toHaveBeenCalledWith('RANSOMWARE_PROTECTION');
    expect(featureUsageService.notifyUsage).toHaveBeenCalledTimes(1);
  });

  it('does not notify when ransomware changes mode without newly enabling (prevent -> detect)', async () => {
    const current = policyFactory();
    current.windows.ransomware.mode = ProtectionModes.off;
    current.mac.ransomware.mode = ProtectionModes.off;
    current.linux.ransomware = { mode: ProtectionModes.prevent, supported: true };

    const next = policyFactory();
    next.windows.ransomware.mode = ProtectionModes.off;
    next.mac.ransomware.mode = ProtectionModes.off;
    next.linux.ransomware = { mode: ProtectionModes.detect, supported: true };

    const featureUsageService = createFeatureUsageServiceMock();

    await notifyProtectionFeatureUsage(
      buildNewPackagePolicy(next),
      buildPolicyData(current),
      featureUsageService
    );

    expect(featureUsageService.notifyUsage).not.toHaveBeenCalledWith('RANSOMWARE_PROTECTION');
  });

  it('does not notify when Linux ransomware is absent on both sides', async () => {
    const current = policyFactory();
    current.windows.ransomware.mode = ProtectionModes.off;
    current.mac.ransomware.mode = ProtectionModes.off;
    delete current.linux.ransomware;

    const next = policyFactory();
    next.windows.ransomware.mode = ProtectionModes.off;
    next.mac.ransomware.mode = ProtectionModes.off;
    delete next.linux.ransomware;

    const featureUsageService = createFeatureUsageServiceMock();

    await notifyProtectionFeatureUsage(
      buildNewPackagePolicy(next),
      buildPolicyData(current),
      featureUsageService
    );

    expect(featureUsageService.notifyUsage).not.toHaveBeenCalledWith('RANSOMWARE_PROTECTION');
  });
});
