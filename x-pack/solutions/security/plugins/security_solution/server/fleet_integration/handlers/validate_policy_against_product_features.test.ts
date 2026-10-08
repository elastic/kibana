/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewPackagePolicyInput } from '@kbn/fleet-plugin/common';
import {
  ALL_PRODUCT_FEATURE_KEYS,
  ProductFeatureSecurityKey,
} from '@kbn/security-solution-features/keys';
import { createProductFeaturesServiceMock } from '../../lib/product_features_service/mocks';
import { validatePolicyAgainstProductFeatures } from './validate_policy_against_product_features';
import {
  DefaultPolicyNotificationMessage,
  DefaultPolicyRuleNotificationMessage,
  policyFactory,
} from '../../../common/endpoint/models/policy_config';
import { removeDeviceControl } from '../../../common/endpoint/models/policy_config_helpers';
import { set } from '@kbn/safer-lodash-set';

const ESSENTIALS_KEYS = ALL_PRODUCT_FEATURE_KEYS.filter(
  (key) =>
    key !== ProductFeatureSecurityKey.endpointTrustedDevices &&
    key !== ProductFeatureSecurityKey.endpointCustomNotification
);

const makeInput = (policyValue: object): NewPackagePolicyInput[] => [
  {
    type: 'endpoint',
    enabled: true,
    streams: [],
    vars: {},
    config: {
      policy: {
        value: policyValue,
      },
    },
  },
];

describe('validatePolicyAgainstProductFeatures', () => {
  describe('Essentials tier (endpointCustomNotification disabled)', () => {
    const productFeaturesService = createProductFeaturesServiceMock(ESSENTIALS_KEYS);

    it('passes when policy has no endpoint input', () => {
      expect(() => validatePolicyAgainstProductFeatures([], productFeaturesService)).not.toThrow();
    });

    it('passes for a stripped policy (removeDeviceControl applied, device_control absent)', () => {
      const stripped = removeDeviceControl(policyFactory());
      expect(() =>
        validatePolicyAgainstProductFeatures(makeInput(stripped), productFeaturesService)
      ).not.toThrow();
    });

    it('passes for a UI-shaped payload (memory/behavior = {rule}, malware/ransomware = {filename}, no device_control)', () => {
      const policy = removeDeviceControl(policyFactory());
      for (const os of ['windows', 'mac', 'linux'] as const) {
        set(policy, `${os}.popup.malware.message`, DefaultPolicyNotificationMessage);
        set(policy, `${os}.popup.memory_protection.message`, DefaultPolicyRuleNotificationMessage);
        set(
          policy,
          `${os}.popup.behavior_protection.message`,
          DefaultPolicyRuleNotificationMessage
        );
      }
      set(policy, 'windows.popup.ransomware.message', DefaultPolicyNotificationMessage);
      set(policy, 'mac.popup.ransomware.message', DefaultPolicyNotificationMessage);

      expect(() =>
        validatePolicyAgainstProductFeatures(makeInput(policy), productFeaturesService)
      ).not.toThrow();
    });

    it('throws 403 with apiPassThrough when malware message is custom', () => {
      const policy = removeDeviceControl(policyFactory());
      set(policy, 'windows.popup.malware.message', 'Block it');

      let thrown: (Error & { statusCode?: number; apiPassThrough?: boolean }) | undefined;
      try {
        validatePolicyAgainstProductFeatures(makeInput(policy), productFeaturesService);
      } catch (e) {
        thrown = e;
      }

      expect(thrown?.message).toBe(
        'To customize the user notification, you must add Endpoint Protection Complete to your project.'
      );
      expect(thrown?.statusCode).toBe(403);
      expect(thrown?.apiPassThrough).toBe(true);
    });
  });

  describe('Complete tier (all features enabled)', () => {
    it('passes when a custom malware message is set', () => {
      const productFeaturesService = createProductFeaturesServiceMock([...ALL_PRODUCT_FEATURE_KEYS]);
      const policy = policyFactory();
      set(policy, 'windows.popup.malware.message', 'Block it');

      expect(() =>
        validatePolicyAgainstProductFeatures(makeInput(policy), productFeaturesService)
      ).not.toThrow();
    });
  });

  describe('global_manifest_version gating', () => {
    const makeInputWithManifestVersion = (version: string): NewPackagePolicyInput[] => [
      {
        type: 'endpoint',
        enabled: true,
        streams: [],
        vars: {},
        config: {
          policy: {
            value: { ...policyFactory(), global_manifest_version: version },
          },
        },
      },
    ];

    it('passes for "latest" global_manifest_version even when endpointProtectionUpdates is disabled', () => {
      const keysWithoutUpdates = ALL_PRODUCT_FEATURE_KEYS.filter(
        (k) => k !== ProductFeatureSecurityKey.endpointProtectionUpdates
      );
      const productFeaturesService = createProductFeaturesServiceMock(keysWithoutUpdates);

      expect(() =>
        validatePolicyAgainstProductFeatures(
          makeInputWithManifestVersion('latest'),
          productFeaturesService
        )
      ).not.toThrow();
    });

    it('throws 403 for a pinned date when endpointProtectionUpdates is disabled', () => {
      const keysWithoutUpdates = ALL_PRODUCT_FEATURE_KEYS.filter(
        (k) => k !== ProductFeatureSecurityKey.endpointProtectionUpdates
      );
      const productFeaturesService = createProductFeaturesServiceMock(keysWithoutUpdates);

      let thrown: (Error & { statusCode?: number; apiPassThrough?: boolean }) | undefined;
      try {
        validatePolicyAgainstProductFeatures(
          makeInputWithManifestVersion('2024-01-01'),
          productFeaturesService
        );
      } catch (e) {
        thrown = e;
      }

      expect(thrown?.message).toBe(
        'To modify protection updates, you must add Endpoint Complete to your project.'
      );
      expect(thrown?.statusCode).toBe(403);
      expect(thrown?.apiPassThrough).toBe(true);
    });
  });
});
