/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { set } from '@kbn/safer-lodash-set';
import { DefaultPolicyNotificationMessage } from './policy_config';
import type { PolicyConfig } from '../types';
import {
  PolicyOperatingSystem,
  ProtectionModes,
  AntivirusRegistrationModes,
  DeviceControlAccessLevel,
} from '../types';

interface PolicyProtectionReference {
  keyPath: string;
  osList: PolicyOperatingSystem[];
  enableValue: unknown;
  disableValue: unknown;
}

const allOsValues = [
  PolicyOperatingSystem.mac,
  PolicyOperatingSystem.linux,
  PolicyOperatingSystem.windows,
];

const getPolicyPopupReference = (): Array<{
  keyPath: string;
  osList: PolicyOperatingSystem[];
}> => [
  {
    keyPath: 'popup.malware.message',
    osList: [...allOsValues],
  },
  {
    keyPath: 'popup.memory_protection.message',
    osList: [...allOsValues],
  },
  {
    keyPath: 'popup.behavior_protection.message',
    osList: [...allOsValues],
  },
  {
    keyPath: 'popup.ransomware.message',
    osList: [PolicyOperatingSystem.windows],
  },
  {
    keyPath: 'popup.device_control.message',
    osList: [PolicyOperatingSystem.windows, PolicyOperatingSystem.mac],
  },
];

export const getPolicyProtectionsReference = (): PolicyProtectionReference[] => [
  {
    keyPath: 'malware.mode',
    osList: [...allOsValues],
    disableValue: ProtectionModes.off,
    enableValue: ProtectionModes.prevent,
  },
  {
    keyPath: 'ransomware.mode',
    osList: [PolicyOperatingSystem.windows],
    disableValue: ProtectionModes.off,
    enableValue: ProtectionModes.prevent,
  },
  {
    keyPath: 'memory_protection.mode',
    osList: [...allOsValues],
    disableValue: ProtectionModes.off,
    enableValue: ProtectionModes.prevent,
  },
  {
    keyPath: 'behavior_protection.mode',
    osList: [...allOsValues],
    disableValue: ProtectionModes.off,
    enableValue: ProtectionModes.prevent,
  },
  {
    keyPath: 'attack_surface_reduction.credential_hardening.enabled',
    osList: [PolicyOperatingSystem.windows],
    disableValue: false,
    enableValue: true,
  },
  {
    keyPath: 'antivirus_registration.enabled',
    osList: [PolicyOperatingSystem.windows],
    disableValue: false,
    enableValue: true,
  },
];

/**
 * Returns a copy of the passed `PolicyConfig` with all protections set to disabled.
 *
 * @param policy
 * @returns
 */
export const disableProtections = (policy: PolicyConfig): PolicyConfig => {
  const result = disableCommonProtections(policy);

  return {
    ...result,
    windows: {
      ...result.windows,
      ...getDisabledWindowsSpecificProtections(result),
      popup: {
        ...result.windows.popup,
        ...getDisabledWindowsSpecificPopups(result),
      },
      device_control: {
        ...result.windows.device_control,
        enabled: false,
        usb_storage: DeviceControlAccessLevel.audit,
      },
    },
    mac: {
      ...result.mac,
      device_control: {
        ...result.mac.device_control,
        enabled: false,
        usb_storage: DeviceControlAccessLevel.audit,
      },
      popup: {
        ...result.mac.popup,
        device_control: {
          ...result.mac.popup.device_control,
          enabled: false,
          message: result.mac.popup.device_control?.message || '',
        },
      },
    },
  };
};

const disableCommonProtections = (policy: PolicyConfig) => {
  return Object.keys(policy).reduce<PolicyConfig>((acc, item) => {
    const os = item as keyof PolicyConfig as PolicyOperatingSystem;
    if (!allOsValues.includes(os)) {
      return acc;
    }
    return {
      ...acc,
      [os]: {
        ...policy[os],
        ...getDisabledCommonProtectionsForOS(policy, os),
        popup: {
          ...policy[os].popup,
          ...getDisabledCommonPopupsForOS(policy, os),
        },
      },
    };
  }, policy);
};

const getDisabledCommonProtectionsForOS = (
  policy: PolicyConfig,
  os: PolicyOperatingSystem
): Partial<PolicyConfig['windows']> => ({
  behavior_protection: {
    ...policy[os].behavior_protection,
    mode: ProtectionModes.off,
  },
  memory_protection: {
    ...policy[os].memory_protection,
    mode: ProtectionModes.off,
  },
  malware: {
    ...policy[os].malware,
    blocklist: false,
    on_write_scan: false,
    mode: ProtectionModes.off,
  },
});

const getDisabledCommonPopupsForOS = (policy: PolicyConfig, os: PolicyOperatingSystem) => ({
  behavior_protection: {
    ...policy[os].popup.behavior_protection,
    enabled: false,
  },
  malware: {
    ...policy[os].popup.malware,
    enabled: false,
  },
  memory_protection: {
    ...policy[os].popup.memory_protection,
    enabled: false,
  },
});

const getDisabledWindowsSpecificProtections = (policy: PolicyConfig) => ({
  ransomware: {
    ...policy.windows.ransomware,
    mode: ProtectionModes.off,
  },
  antivirus_registration: {
    ...policy.windows.antivirus_registration,
    mode: AntivirusRegistrationModes.disabled,
    enabled: false,
  },
  attack_surface_reduction: {
    ...policy.windows.attack_surface_reduction,
    credential_hardening: {
      enabled: false,
    },
  },
});

const getDisabledWindowsSpecificPopups = (policy: PolicyConfig) => ({
  ransomware: {
    ...policy.windows.popup.ransomware,
    enabled: false,
  },
  device_control: {
    ...policy.windows.popup.device_control,
    enabled: false,
    message: policy.windows.popup.device_control?.message || '',
  },
});

/**
 * Returns the provided with only event collection turned enabled
 * @param policy
 */
export const ensureOnlyEventCollectionIsAllowed = (policy: PolicyConfig): PolicyConfig => {
  const updatedPolicy = disableProtections(policy);

  set(updatedPolicy, 'windows.antivirus_registration.mode', AntivirusRegistrationModes.disabled);
  set(updatedPolicy, 'windows.antivirus_registration.enabled', false);

  return updatedPolicy;
};

/**
 * Checks to see if the provided policy is set to Event Collection only
 */
export const isPolicySetToEventCollectionOnly = (
  policy: PolicyConfig
): { isOnlyCollectingEvents: boolean; message?: string } => {
  const protectionsRef = getPolicyProtectionsReference();
  let message: string | undefined;

  const hasEnabledProtection = protectionsRef.some(({ keyPath, osList, disableValue }) => {
    return osList.some((osValue) => {
      const fullKeyPathForOs = `${osValue}.${keyPath}`;
      const currentValue = get(policy, fullKeyPathForOs);
      const isEnabled = currentValue !== disableValue;

      if (isEnabled) {
        message = `property [${fullKeyPathForOs}] is set to [${currentValue}]`;
      }

      return isEnabled;
    });
  });

  return {
    isOnlyCollectingEvents: !hasEnabledProtection,
    message,
  };
};

export function isBillablePolicy(policy: PolicyConfig) {
  if (!policy.meta.serverless) return false;

  return !isPolicySetToEventCollectionOnly(policy).isOnlyCollectingEvents;
}

export const checkIfPopupMessagesContainCustomNotifications = (policy: PolicyConfig): boolean => {
  const popupRefs = getPolicyPopupReference();

  return popupRefs.some(({ keyPath, osList }) => {
    return osList.some((osValue) => {
      const fullKeyPathForOs = `${osValue}.${keyPath}`;
      const currentValue = get(policy, fullKeyPathForOs);
      return currentValue !== '' && currentValue !== DefaultPolicyNotificationMessage;
    });
  });
};

export const resetCustomNotifications = (
  customNotification = DefaultPolicyNotificationMessage
): Partial<PolicyConfig> => {
  const popupRefs = getPolicyPopupReference();

  return popupRefs.reduce((acc, { keyPath, osList }) => {
    osList.forEach((osValue) => {
      set(acc, `${osValue}.${keyPath}`, customNotification);
    });
    return acc;
  }, {});
};

/**
 * Returns a copy of the passed `PolicyConfig` with device_control fields completely removed
 * from both Windows and Mac OS configurations and their popup settings.
 *
 * @param policy
 * @returns PolicyConfig without device_control fields
 */
export const removeDeviceControl = (policy: PolicyConfig): PolicyConfig => {
  const { device_control: windowsDeviceControl, ...windowsRest } = policy.windows;
  const { device_control: macDeviceControl, ...macRest } = policy.mac;

  const { device_control: windowsPopupDeviceControl, ...windowsPopupRest } = policy.windows.popup;
  const { device_control: macPopupDeviceControl, ...macPopupRest } = policy.mac.popup;

  return {
    ...policy,
    windows: {
      ...windowsRest,
      popup: {
        ...windowsPopupRest,
      },
    },
    mac: {
      ...macRest,
      popup: {
        ...macPopupRest,
      },
    },
  };
};

/**
 * Returns a copy of the passed `PolicyConfig` with Linux DNS events field removed.
 * Used when the linuxDnsEvents feature flag is disabled.
 *
 * @param policy
 * @returns PolicyConfig without Linux dns field
 */
export const removeLinuxDnsEvents = (policy: PolicyConfig): PolicyConfig => {
  const { dns: linuxDns, ...linuxEventsRest } = policy.linux.events;

  return {
    ...policy,
    linux: {
      ...policy.linux,
      events: {
        ...linuxEventsRest,
      },
    },
  };
};
