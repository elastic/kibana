/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import type { PolicyConfig, PolicyData } from '../../common/endpoint/types';
import { PolicyOperatingSystem, ProtectionModes } from '../../common/endpoint/types';
import type { FeatureUsageService } from '../endpoint/services/feature_usage/service';

const OS_KEYS = Object.values(PolicyOperatingSystem);
const PROTECTION_KEYS = ['memory_protection', 'behavior_protection'] as const;

function isNewlyEnabled(current: ProtectionModes, next: ProtectionModes) {
  if (current === 'off' && (next === 'prevent' || next === 'detect')) {
    return true;
  }

  return false;
}

/**
 * Ransomware is optional on Linux (absent on legacy policies or wherever the feature is gated
 * off); an absent branch on either side of a comparison must read as `off`.
 */
function getRansomwareMode(
  policyConfig: PolicyConfig,
  osKey: PolicyOperatingSystem
): ProtectionModes {
  return policyConfig[osKey].ransomware?.mode ?? ProtectionModes.off;
}

function notifyProtection(type: string, featureUsageService: FeatureUsageService) {
  switch (type) {
    case 'ransomware':
      featureUsageService.notifyUsage('RANSOMWARE_PROTECTION');
      return;
    case 'memory_protection':
      featureUsageService.notifyUsage('MEMORY_THREAT_PROTECTION');
      return;
    case 'behavior_protection':
      featureUsageService.notifyUsage('BEHAVIOR_PROTECTION');
  }
}

export async function notifyProtectionFeatureUsage(
  newPackagePolicy: NewPackagePolicy,
  currentPackagePolicy: PolicyData,
  featureUsageService: FeatureUsageService
) {
  if (
    !newPackagePolicy?.id ||
    !newPackagePolicy?.inputs ||
    !newPackagePolicy.inputs[0]?.config?.policy?.value
  ) {
    return;
  }

  const newPolicyConfig = newPackagePolicy.inputs[0].config?.policy?.value as PolicyConfig;
  const currentPolicyConfig = currentPackagePolicy.inputs[0].config.policy.value;

  const ransomwareNewlyEnabled = OS_KEYS.some((osKey) =>
    isNewlyEnabled(
      getRansomwareMode(currentPolicyConfig, osKey),
      getRansomwareMode(newPolicyConfig, osKey)
    )
  );

  if (ransomwareNewlyEnabled) {
    notifyProtection('ransomware', featureUsageService);
  }

  PROTECTION_KEYS.forEach((protectionKey) => {
    // only notify once per protection since protection can't be configured per os
    let notified = false;

    OS_KEYS.forEach((osKey) => {
      if (
        !notified &&
        isNewlyEnabled(
          currentPolicyConfig[osKey][protectionKey].mode,
          newPolicyConfig[osKey][protectionKey].mode
        )
      ) {
        notifyProtection(protectionKey, featureUsageService);
        notified = true;
      }
    });
  });
}
