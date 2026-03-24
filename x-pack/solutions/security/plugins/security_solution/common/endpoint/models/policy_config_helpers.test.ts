/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PolicyConfig } from '../types';
import { PolicyOperatingSystem, ProtectionModes, AntivirusRegistrationModes } from '../types';
import { DefaultPolicyNotificationMessage, policyFactory } from './policy_config';
import {
  disableProtections,
  isPolicySetToEventCollectionOnly,
  ensureOnlyEventCollectionIsAllowed,
  isBillablePolicy,
  getPolicyProtectionsReference,
  checkIfPopupMessagesContainCustomNotifications,
  resetCustomNotifications,
  removeDeviceControl,
  removeLinuxDnsEvents,
} from './policy_config_helpers';
import { get, merge } from 'lodash';
import { set } from '@kbn/safer-lodash-set';

describe('Policy Config helpers', () => {
  describe('disableProtections', () => {
    it('disables all the protections in the default policy', () => {
      expect(disableProtections(policyFactory())).toEqual<PolicyConfig>(eventsOnlyPolicy());
    });

    it('does not enable supported fields', () => {
      const defaultPolicy: PolicyConfig = policyFactory();

      const notSupported: PolicyConfig['windows']['memory_protection'] = {
        mode: ProtectionModes.off,
        supported: false,
      };

      const notSupportedBehaviorProtection: PolicyConfig['windows']['behavior_protection'] = {
        mode: ProtectionModes.off,
        supported: false,
        reputation_service: false,
      };

      const inputPolicyWithoutSupportedProtections: PolicyConfig = {
        ...defaultPolicy,
        windows: {
          ...defaultPolicy.windows,
          memory_protection: notSupported,
          behavior_protection: notSupportedBehaviorProtection,
          ransomware: notSupported,
        },
        mac: {
          ...defaultPolicy.mac,
          memory_protection: notSupported,
          behavior_protection: notSupportedBehaviorProtection,
        },
        linux: {
          ...defaultPolicy.linux,
          memory_protection: notSupported,
          behavior_protection: notSupportedBehaviorProtection,
        },
      };

      const expectedPolicyWithoutSupportedProtections: PolicyConfig = {
        ...eventsOnlyPolicy(),
        windows: {
          ...eventsOnlyPolicy().windows,
          memory_protection: notSupported,
          behavior_protection: notSupportedBehaviorProtection,
          ransomware: notSupported,
        },
        mac: {
          ...eventsOnlyPolicy().mac,
          memory_protection: notSupported,
          behavior_protection: notSupportedBehaviorProtection,
        },
        linux: {
          ...eventsOnlyPolicy().linux,
          memory_protection: notSupported,
          behavior_protection: notSupportedBehaviorProtection,
        },
      };

      const policy = disableProtections(inputPolicyWithoutSupportedProtections);

      expect(policy).toEqual<PolicyConfig>(expectedPolicyWithoutSupportedProtections);
    });

    it('does not enable events', () => {
      const defaultPolicy: PolicyConfig = policyFactory();

      const windowsEvents: typeof defaultPolicy.windows.events = {
        credential_access: false,
        dll_and_driver_load: false,
        dns: false,
        file: false,
        network: false,
        process: false,
        registry: false,
        security: false,
      };

      const macEvents: typeof defaultPolicy.mac.events = {
        dns: false,
        file: false,
        process: false,
        network: false,
        security: false,
      };

      const linuxEvents: typeof defaultPolicy.linux.events = {
        dns: false,
        file: false,
        process: false,
        network: false,
        session_data: false,
        tty_io: false,
      };

      const expectedPolicy: PolicyConfig = {
        ...eventsOnlyPolicy(),
        windows: { ...eventsOnlyPolicy().windows, events: { ...windowsEvents } },
        mac: { ...eventsOnlyPolicy().mac, events: { ...macEvents } },
        linux: { ...eventsOnlyPolicy().linux, events: { ...linuxEvents } },
      };

      const inputPolicy = {
        ...defaultPolicy,
        windows: { ...defaultPolicy.windows, events: { ...windowsEvents } },
        mac: { ...defaultPolicy.mac, events: { ...macEvents } },
        linux: { ...defaultPolicy.linux, events: { ...linuxEvents } },
      };

      expect(disableProtections(inputPolicy)).toEqual<PolicyConfig>(expectedPolicy);
    });
  });

  describe('setPolicyToEventCollectionOnly()', () => {
    it('should set the policy to event collection only', () => {
      const policyConfig = policyFactory();
      policyConfig.windows.antivirus_registration = {
        enabled: true,
        mode: AntivirusRegistrationModes.enabled,
      };
      expect(ensureOnlyEventCollectionIsAllowed(policyConfig)).toEqual(eventsOnlyPolicy());
    });
  });

  describe('isPolicySetToEventCollectionOnly', () => {
    let policy: PolicyConfig;

    beforeEach(() => {
      policy = ensureOnlyEventCollectionIsAllowed(policyFactory());
    });

    it.each([
      {
        keyPath: `${PolicyOperatingSystem.windows}.malware.mode`,
        keyValue: ProtectionModes.prevent,
        expectedResult: false,
      },
      {
        keyPath: `${PolicyOperatingSystem.mac}.malware.mode`,
        keyValue: ProtectionModes.off,
        expectedResult: true,
      },
      {
        keyPath: `${PolicyOperatingSystem.windows}.ransomware.mode`,
        keyValue: ProtectionModes.prevent,
        expectedResult: false,
      },
      {
        keyPath: `${PolicyOperatingSystem.linux}.memory_protection.mode`,
        keyValue: ProtectionModes.off,
        expectedResult: true,
      },
      {
        keyPath: `${PolicyOperatingSystem.mac}.behavior_protection.mode`,
        keyValue: ProtectionModes.detect,
        expectedResult: false,
      },
      {
        keyPath: `${PolicyOperatingSystem.windows}.attack_surface_reduction.credential_hardening.enabled`,
        keyValue: true,
        expectedResult: false,
      },
      {
        keyPath: `${PolicyOperatingSystem.windows}.antivirus_registration.enabled`,
        keyValue: true,
        expectedResult: false,
      },
    ])(
      'should return `$expectedResult` if `$keyPath` is set to `$keyValue`',
      ({ keyPath, keyValue, expectedResult }) => {
        set(policy, keyPath, keyValue);

        expect(isPolicySetToEventCollectionOnly(policy)).toEqual({
          isOnlyCollectingEvents: expectedResult,
          message: expectedResult ? undefined : `property [${keyPath}] is set to [${keyValue}]`,
        });
      }
    );
  });

  describe('isBillablePolicy', () => {
    it('doesnt bill if serverless false', () => {
      const policy = policyFactory();
      const isBillable = isBillablePolicy(policy);
      expect(policy.meta.serverless).toBe(false);
      expect(isBillable).toBe(false);
    });

    it('doesnt bill if event collection only', () => {
      const policy = ensureOnlyEventCollectionIsAllowed(policyFactory());
      policy.meta.serverless = true;
      const isBillable = isBillablePolicy(policy);
      expect(isBillable).toBe(false);
    });

    it.each(getPolicyProtectionsReference())(
      'correctly bills if $keyPath is enabled',
      (feature) => {
        for (const os of feature.osList) {
          const policy = ensureOnlyEventCollectionIsAllowed(policyFactory());
          policy.meta.serverless = true;
          set(policy, `${os}.${feature.keyPath}`, feature.enableValue);
          const isBillable = isBillablePolicy(policy);
          expect(isBillable).toBe(true);
        }
      }
    );
  });

  describe('checkIfPopupMessagesContainCustomNotifications', () => {
    let policy: PolicyConfig;

    beforeEach(() => {
      policy = policyFactory();
    });

    it('returns false when all popup messages are default', () => {
      expect(checkIfPopupMessagesContainCustomNotifications(policy)).toBe(false);
    });

    it('returns true when any popup message is custom', () => {
      set(policy, 'windows.popup.malware.message', 'Custom message');
      expect(checkIfPopupMessagesContainCustomNotifications(policy)).toBe(true);
    });

    it('returns false when all popup messages are empty', () => {
      set(policy, 'windows.popup.malware.message', '');
      set(policy, 'mac.popup.memory_protection.message', '');
      expect(checkIfPopupMessagesContainCustomNotifications(policy)).toBe(false);
    });

    it('returns true when any popup message is not empty or default', () => {
      set(policy, 'linux.popup.behavior_protection.message', 'Another custom message');
      expect(checkIfPopupMessagesContainCustomNotifications(policy)).toBe(true);
    });

    it('returns false when all popup messages are default across all OS', () => {
      set(policy, 'windows.popup.malware.message', DefaultPolicyNotificationMessage);
      set(policy, 'mac.popup.memory_protection.message', DefaultPolicyNotificationMessage);
      set(policy, 'linux.popup.behavior_protection.message', DefaultPolicyNotificationMessage);
      set(policy, 'windows.popup.ransomware.message', '');
      expect(checkIfPopupMessagesContainCustomNotifications(policy)).toBe(false);
    });
  });

  describe('resetCustomNotifications', () => {
    let policy: PolicyConfig;

    beforeEach(() => {
      policy = policyFactory();
    });

    it.each([
      'windows.popup.malware.message',
      'windows.popup.behavior_protection.message',
      'windows.popup.memory_protection.message',
      'windows.popup.ransomware.message',
      'linux.popup.malware.message',
      'linux.popup.behavior_protection.message',
      'linux.popup.memory_protection.message',
      'mac.popup.malware.message',
      'mac.popup.behavior_protection.message',
      'mac.popup.memory_protection.message',
    ])('resets %s to default message', (keyPath) => {
      set(policy, keyPath, `Custom message`);
      const defaultNotifications = resetCustomNotifications();

      const updatedPolicy = merge({}, policy, defaultNotifications);
      expect(get(updatedPolicy, keyPath)).toBe(DefaultPolicyNotificationMessage);
    });

    it('does not change default messages', () => {
      set(policy, 'windows.popup.malware.message', DefaultPolicyNotificationMessage);
      const defaultNotifications = resetCustomNotifications();

      const updatedPolicy = merge({}, policy, defaultNotifications);
      expect(get(updatedPolicy, 'windows.popup.malware.message')).toBe(
        DefaultPolicyNotificationMessage
      );
    });

    it('resets empty messages to default messages', () => {
      set(policy, 'windows.popup.malware.message', '');
      const defaultNotifications = resetCustomNotifications();

      const updatedPolicy = merge({}, policy, defaultNotifications);
      expect(get(updatedPolicy, 'windows.popup.malware.message')).toBe(
        DefaultPolicyNotificationMessage
      );
    });

    it('resets messages for all operating systems', () => {
      set(policy, 'windows.popup.malware.message', 'Custom message');
      set(policy, 'mac.popup.memory_protection.message', 'Another custom message');
      set(policy, 'linux.popup.behavior_protection.message', 'Yet another custom message');
      const defaultNotifications = resetCustomNotifications();

      const updatedPolicy = merge({}, policy, defaultNotifications);
      expect(get(updatedPolicy, 'windows.popup.malware.message')).toBe(
        DefaultPolicyNotificationMessage
      );
      expect(get(updatedPolicy, 'mac.popup.memory_protection.message')).toBe(
        DefaultPolicyNotificationMessage
      );
      expect(get(updatedPolicy, 'linux.popup.behavior_protection.message')).toBe(
        DefaultPolicyNotificationMessage
      );
    });
  });

  describe('removeDeviceControl', () => {
    let policy: PolicyConfig;

    beforeEach(() => {
      policy = policyFactory();
    });

    it('removes device_control fields from Windows OS configuration', () => {
      const result = removeDeviceControl(policy);

      expect(result.windows).not.toHaveProperty('device_control');
      expect(result.windows.popup).not.toHaveProperty('device_control');
    });

    it('removes device_control fields from Mac OS configuration', () => {
      const result = removeDeviceControl(policy);

      expect(result.mac).not.toHaveProperty('device_control');
      expect(result.mac.popup).not.toHaveProperty('device_control');
    });

    it('preserves all other Windows fields when removing device_control', () => {
      const result = removeDeviceControl(policy);

      // Check that all other Windows fields are preserved
      expect(result.windows.malware).toEqual(policy.windows.malware);
      expect(result.windows.ransomware).toEqual(policy.windows.ransomware);
      expect(result.windows.memory_protection).toEqual(policy.windows.memory_protection);
      expect(result.windows.behavior_protection).toEqual(policy.windows.behavior_protection);
      expect(result.windows.events).toEqual(policy.windows.events);
      expect(result.windows.logging).toEqual(policy.windows.logging);
      expect(result.windows.antivirus_registration).toEqual(policy.windows.antivirus_registration);
      expect(result.windows.attack_surface_reduction).toEqual(
        policy.windows.attack_surface_reduction
      );

      // Check that all other Windows popup fields are preserved
      expect(result.windows.popup.malware).toEqual(policy.windows.popup.malware);
      expect(result.windows.popup.ransomware).toEqual(policy.windows.popup.ransomware);
      expect(result.windows.popup.memory_protection).toEqual(
        policy.windows.popup.memory_protection
      );
      expect(result.windows.popup.behavior_protection).toEqual(
        policy.windows.popup.behavior_protection
      );
    });

    it('preserves all other Mac fields when removing device_control', () => {
      const result = removeDeviceControl(policy);

      // Check that all other Mac fields are preserved
      expect(result.mac.malware).toEqual(policy.mac.malware);
      expect(result.mac.memory_protection).toEqual(policy.mac.memory_protection);
      expect(result.mac.behavior_protection).toEqual(policy.mac.behavior_protection);
      expect(result.mac.events).toEqual(policy.mac.events);
      expect(result.mac.logging).toEqual(policy.mac.logging);
      expect(result.mac.advanced).toEqual(policy.mac.advanced);

      // Check that all other Mac popup fields are preserved
      expect(result.mac.popup.malware).toEqual(policy.mac.popup.malware);
      expect(result.mac.popup.memory_protection).toEqual(policy.mac.popup.memory_protection);
      expect(result.mac.popup.behavior_protection).toEqual(policy.mac.popup.behavior_protection);
    });

    it('preserves global and Linux configurations unchanged', () => {
      const result = removeDeviceControl(policy);

      // Check that global fields are preserved
      expect(result.global_manifest_version).toEqual(policy.global_manifest_version);
      expect(result.global_telemetry_enabled).toEqual(policy.global_telemetry_enabled);
      expect(result.meta).toEqual(policy.meta);

      // Check that Linux configuration is completely preserved (no device_control in Linux)
      expect(result.linux).toEqual(policy.linux);
    });

    it('works correctly with custom device_control values', () => {
      // Set custom device_control values
      policy.windows.device_control = { enabled: true, usb_storage: 'deny_all' };
      policy.mac.device_control = { enabled: true, usb_storage: 'audit' };
      policy.windows.popup.device_control = { enabled: true, message: 'Windows custom message' };
      policy.mac.popup.device_control = { enabled: false, message: 'Mac custom message' };

      const result = removeDeviceControl(policy);

      // Verify device_control fields are completely removed
      expect(result.windows).not.toHaveProperty('device_control');
      expect(result.mac).not.toHaveProperty('device_control');
      expect(result.windows.popup).not.toHaveProperty('device_control');
      expect(result.mac.popup).not.toHaveProperty('device_control');

      // Verify other fields are still preserved
      expect(result.windows.malware).toEqual(policy.windows.malware);
      expect(result.mac.malware).toEqual(policy.mac.malware);
    });

    it('returns a new policy object without mutating the original', () => {
      const originalPolicy = JSON.parse(JSON.stringify(policy)); // Deep clone for comparison
      const result = removeDeviceControl(policy);

      // Verify original policy is unchanged
      expect(policy).toEqual(originalPolicy);
      expect(policy.windows.device_control).toBeDefined();
      expect(policy.mac.device_control).toBeDefined();
      expect(policy.windows.popup.device_control).toBeDefined();
      expect(policy.mac.popup.device_control).toBeDefined();

      // Verify result is a different object
      expect(result).not.toBe(policy);
      expect(result.windows).not.toBe(policy.windows);
      expect(result.mac).not.toBe(policy.mac);
    });
  });

  describe('removeLinuxDnsEvents', () => {
    let policy: PolicyConfig;

    beforeEach(() => {
      policy = policyFactory();
    });

    it('removes dns field from Linux events', () => {
      const result = removeLinuxDnsEvents(policy);

      expect(result.linux.events).not.toHaveProperty('dns');
    });

    it('preserves all other Linux event fields', () => {
      const result = removeLinuxDnsEvents(policy);

      expect(result.linux.events.file).toEqual(policy.linux.events.file);
      expect(result.linux.events.process).toEqual(policy.linux.events.process);
      expect(result.linux.events.network).toEqual(policy.linux.events.network);
      expect(result.linux.events.session_data).toEqual(policy.linux.events.session_data);
      expect(result.linux.events.tty_io).toEqual(policy.linux.events.tty_io);
    });

    it('preserves all other Linux fields', () => {
      const result = removeLinuxDnsEvents(policy);

      expect(result.linux.malware).toEqual(policy.linux.malware);
      expect(result.linux.memory_protection).toEqual(policy.linux.memory_protection);
      expect(result.linux.behavior_protection).toEqual(policy.linux.behavior_protection);
      expect(result.linux.popup).toEqual(policy.linux.popup);
      expect(result.linux.logging).toEqual(policy.linux.logging);
      expect(result.linux.advanced).toEqual(policy.linux.advanced);
    });

    it('preserves Windows and Mac configurations unchanged', () => {
      const result = removeLinuxDnsEvents(policy);

      expect(result.windows).toEqual(policy.windows);
      expect(result.mac).toEqual(policy.mac);
    });

    it('preserves global fields unchanged', () => {
      const result = removeLinuxDnsEvents(policy);

      expect(result.global_manifest_version).toEqual(policy.global_manifest_version);
      expect(result.global_telemetry_enabled).toEqual(policy.global_telemetry_enabled);
      expect(result.meta).toEqual(policy.meta);
    });

    it('returns a new policy object without mutating the original', () => {
      const originalPolicy = JSON.parse(JSON.stringify(policy));
      const result = removeLinuxDnsEvents(policy);

      // Verify original policy is unchanged
      expect(policy).toEqual(originalPolicy);
      expect(policy.linux.events.dns).toBeDefined();

      // Verify result is a different object
      expect(result).not.toBe(policy);
      expect(result.linux).not.toBe(policy.linux);
      expect(result.linux.events).not.toBe(policy.linux.events);
    });
  });
});

// This constant makes sure that if the type `PolicyConfig` is ever modified,
// the logic for disabling protections is also modified due to type check.
const eventsOnlyPolicy = (): PolicyConfig => ({
  global_manifest_version: 'latest',
  global_telemetry_enabled: false,
  meta: {
    license: '',
    cloud: false,
    license_uuid: '',
    cluster_name: '',
    cluster_uuid: '',
    serverless: false,
    billable: false,
  },
  windows: {
    events: {
      credential_access: true,
      dll_and_driver_load: true,
      dns: true,
      file: true,
      network: true,
      process: true,
      registry: true,
      security: true,
    },
    malware: { mode: ProtectionModes.off, blocklist: false, on_write_scan: false },
    ransomware: { mode: ProtectionModes.off, supported: true },
    memory_protection: { mode: ProtectionModes.off, supported: true },
    behavior_protection: { mode: ProtectionModes.off, supported: true, reputation_service: false },
    device_control: { enabled: false, usb_storage: 'audit' },
    popup: {
      malware: { message: '', enabled: false },
      ransomware: { message: '', enabled: false },
      memory_protection: { message: '', enabled: false },
      behavior_protection: { message: '', enabled: false },
      device_control: { message: '', enabled: false },
    },
    logging: { file: 'info' },
    antivirus_registration: { enabled: false, mode: AntivirusRegistrationModes.disabled },
    attack_surface_reduction: { credential_hardening: { enabled: false } },
  },
  mac: {
    events: { dns: true, process: true, file: true, network: true, security: true },
    malware: { mode: ProtectionModes.off, blocklist: false, on_write_scan: false },
    behavior_protection: { mode: ProtectionModes.off, supported: true, reputation_service: false },
    memory_protection: { mode: ProtectionModes.off, supported: true },
    device_control: { enabled: false, usb_storage: 'audit' },
    popup: {
      malware: { message: '', enabled: false },
      behavior_protection: { message: '', enabled: false },
      memory_protection: { message: '', enabled: false },
      device_control: { message: '', enabled: false },
    },
    logging: { file: 'info' },
    advanced: {
      capture_env_vars: 'DYLD_INSERT_LIBRARIES,DYLD_FRAMEWORK_PATH,DYLD_LIBRARY_PATH,LD_PRELOAD',
    },
  },
  linux: {
    events: {
      dns: true,
      file: true,
      process: true,
      network: true,
      session_data: false,
      tty_io: false,
    },
    malware: { mode: ProtectionModes.off, blocklist: false, on_write_scan: false },
    behavior_protection: { mode: ProtectionModes.off, supported: true, reputation_service: false },
    memory_protection: { mode: ProtectionModes.off, supported: true },
    popup: {
      malware: { message: '', enabled: false },
      behavior_protection: { message: '', enabled: false },
      memory_protection: { message: '', enabled: false },
    },
    logging: { file: 'info' },
    advanced: {
      capture_env_vars: 'LD_PRELOAD,LD_LIBRARY_PATH',
    },
  },
});
