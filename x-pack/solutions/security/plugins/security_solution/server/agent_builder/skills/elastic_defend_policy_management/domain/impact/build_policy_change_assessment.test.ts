/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProductFeatureSecurityKey } from '@kbn/security-solution-features/keys';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import moment from 'moment';
import { FleetPackagePolicyGenerator } from '../../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import {
  policyFactory,
  policyFactoryWithoutPaidFeatures,
} from '../../../../../../common/endpoint/models/policy_config';
import { removeDeviceControl } from '../../../../../../common/endpoint/models/policy_config_helpers';
import {
  AntivirusRegistrationModes,
  ProtectionModes,
  PolicyOperatingSystem,
  DeviceControlAccessLevel,
  type PolicyConfig,
} from '../../../../../../common/endpoint/types';
import { createEndpointPolicySnapshot } from '../endpoint_policy_snapshot';
import { normalizeEndpointPolicy } from '../normalized_endpoint_policy';
import { buildPolicyChangeAssessment } from './build_policy_change_assessment';
import type { PolicyChangeCapabilities } from './build_policy_change_assessment';
import type { ProtectionSettingWeakenedSetting } from './policy_change_operation';

const generator = new FleetPackagePolicyGenerator();

const capabilities = (
  licenseInformation = licenseMock.createLicense({ license: { type: 'enterprise' } })
): PolicyChangeCapabilities => ({
  licenseInformation,
  endpointPolicyProtections: true,
  endpointTrustedDevices: true,
  trustedDevicesExperimental: true,
  endpointCustomYaraSignatures: true,
  customYaraSignaturesExperimental: true,
  aiDataCollectionExperimental: true,
  linuxRansomwareProtection: true,
  endpointRegistryCredentialHardening: true,
  registryCredentialHardeningExperimental: true,
  endpointProtectionUpdates: true,
  endpointCustomNotification: true,
  serverless: false,
});

const createPolicy = (
  storedConfig: PolicyConfig,
  overrides: Parameters<FleetPackagePolicyGenerator['generateEndpointPackagePolicy']>[0] = {}
) => {
  const packagePolicy = generator.generateEndpointPackagePolicy({
    id: 'policy-1',
    name: 'Endpoint Policy',
    version: 'WzEsMV0=',
    ...overrides,
  });
  const policyEntry = packagePolicy.inputs[0]?.config?.policy;
  if (policyEntry == null) {
    throw new Error('expected generated endpoint package policy to include config.policy');
  }
  policyEntry.value = storedConfig;
  return normalizeEndpointPolicy(createEndpointPolicySnapshot(packagePolicy));
};

const weakenedSettingCases: ReadonlyArray<{
  path: string;
  value: unknown;
  setting: ProtectionSettingWeakenedSetting;
  os: readonly PolicyOperatingSystem[];
  text: string;
  stored?: PolicyConfig;
}> = [
  {
    path: 'windows.malware.blocklist',
    value: false,
    setting: 'malware.blocklist',
    os: [PolicyOperatingSystem.windows, PolicyOperatingSystem.mac, PolicyOperatingSystem.linux],
    text: 'Malware blocklist on Windows, macOS, Linux is turned off.',
  },
  {
    path: 'windows.malware.on_write_scan',
    value: false,
    setting: 'malware.on_write_scan',
    os: [PolicyOperatingSystem.windows, PolicyOperatingSystem.mac, PolicyOperatingSystem.linux],
    text: 'Scan files upon modification on Windows, macOS, Linux is turned off.',
  },
  {
    path: 'windows.behavior_protection.reputation_service',
    value: false,
    setting: 'behavior_protection.reputation_service',
    os: [PolicyOperatingSystem.windows, PolicyOperatingSystem.mac, PolicyOperatingSystem.linux],
    text: 'Reputation service on Windows, macOS, Linux is turned off.',
    stored: policyFactory({ cloud: true }),
  },
  {
    path: 'windows.attack_surface_reduction.credential_hardening.enabled',
    value: false,
    setting: 'attack_surface_reduction.credential_hardening.enabled',
    os: [PolicyOperatingSystem.windows],
    text: 'Credential hardening on Windows is turned off.',
  },
  {
    path: 'windows.attack_surface_reduction.registry_credential_hardening.enabled',
    value: false,
    setting: 'attack_surface_reduction.registry_credential_hardening.enabled',
    os: [PolicyOperatingSystem.windows],
    text: 'Registry credential hardening on Windows is turned off.',
  },
  {
    path: 'windows.antivirus_registration.mode',
    value: AntivirusRegistrationModes.disabled,
    setting: 'antivirus_registration.mode',
    os: [PolicyOperatingSystem.windows],
    text: 'Antivirus registration on Windows changes to Disabled.',
  },
];

describe('buildPolicyChangeAssessment', () => {
  it.each(weakenedSettingCases)(
    'warns when the weakened protection sub-setting $setting is changed',
    ({ path, value, setting, os, text, stored }) => {
      const assessment = buildPolicyChangeAssessment(
        createPolicy(stored ?? policyFactory()),
        [{ op: 'set_field', path, value }],
        capabilities()
      );

      expect(assessment.advisories).toEqual([
        { code: 'protection_setting_weakened', setting, os, text },
      ]);
    }
  );

  it('attributes a save-blocking manifest to the direct path and one global blocker', () => {
    const stored = policyFactory();
    stored.windows.malware.mode = ProtectionModes.prevent;
    const assessment = buildPolicyChangeAssessment(
      createPolicy(stored),
      [
        { op: 'set_field', path: 'windows.malware.mode', value: ProtectionModes.detect },
        { op: 'set_field', path: 'global_manifest_version', value: '2020-01-01' },
      ],
      capabilities()
    );
    const malwareChange = assessment.changes.find(
      (change) => change.path === 'windows.malware.mode'
    );
    const manifestChange = assessment.changes.find(
      (change) => change.path === 'global_manifest_version'
    );

    expect(malwareChange?.eligibility).toEqual({ eligible: true });
    expect(manifestChange?.eligibility).toEqual({
      eligible: false,
      reason: 'global_manifest_version_too_old',
    });
    expect(assessment.globalBlockers).toEqual([{ reason: 'global_manifest_version_too_old' }]);
  });

  it('adds one generic blocker when the final policy retains a stale license-invalid feature', () => {
    const stored = policyFactory();
    stored.windows.popup.malware.enabled = false;

    const assessment = buildPolicyChangeAssessment(
      createPolicy(stored),
      [{ op: 'set_field', path: 'windows.malware.mode', value: ProtectionModes.detect }],
      capabilities(licenseMock.createLicense({ license: { type: 'gold' } }))
    );

    expect(assessment.changes[0]?.eligibility).toEqual({ eligible: true });
    expect(assessment.globalBlockers).toEqual([{ reason: 'license_invalid_policy' }]);
  });

  it('does not block an unrelated change when the stored global_manifest_version is absent', () => {
    const stored = policyFactory();
    stored.windows.malware.mode = ProtectionModes.prevent;
    delete (stored as unknown as { global_manifest_version?: unknown }).global_manifest_version;

    const assessment = buildPolicyChangeAssessment(
      createPolicy(stored),
      [{ op: 'set_field', path: 'windows.malware.mode', value: ProtectionModes.detect }],
      capabilities()
    );

    expect(assessment.changes[0]?.eligibility).toEqual({ eligible: true });
    expect(assessment.globalBlockers).toEqual([]);
  });

  it('adds one global blocker when retained custom notification text is disabled', () => {
    const stored = policyFactory();
    stored.windows.popup.ransomware.message = 'foo';

    const assessment = buildPolicyChangeAssessment(
      createPolicy(stored),
      [{ op: 'set_field', path: 'windows.malware.mode', value: ProtectionModes.detect }],
      {
        ...capabilities(),
        endpointCustomNotification: false,
      }
    );

    expect(assessment.changes[0]?.eligibility).toEqual({ eligible: true });
    expect(assessment.globalBlockers).toEqual([
      { reason: 'endpoint_custom_notification_disabled' },
    ]);
  });

  it('reports the custom YARA signatures gate and marks the change ineligible while the flag is off', () => {
    const stored = policyFactory();
    stored.windows.memory_protection.custom_yara_signatures = false;

    const assessment = buildPolicyChangeAssessment(
      createPolicy(stored),
      [
        {
          op: 'set_field',
          path: 'windows.memory_protection.custom_yara_signatures',
          value: true,
        },
      ],
      {
        ...capabilities(),
        customYaraSignaturesExperimental: false,
      }
    );

    expect(assessment.changes[0]?.registry.productFeatureGate).toBe(
      ProductFeatureSecurityKey.endpointCustomYaraSignatures
    );
    expect(assessment.changes[0]?.eligibility).toEqual({
      eligible: false,
      reason: 'custom_yara_signatures_experimental_disabled',
    });
  });

  it('applies set_protection_level ransomware to Linux and backfills a license-valid supported flag and notification when the flag is on', () => {
    const stored = policyFactory();
    delete stored.linux.ransomware;
    delete stored.linux.popup.ransomware;

    const assessment = buildPolicyChangeAssessment(
      createPolicy(stored),
      [{ op: 'set_protection_level', protection: 'ransomware', mode: ProtectionModes.prevent }],
      capabilities()
    );

    const linuxChange = assessment.changes.find(
      (change) => change.path === 'linux.ransomware.mode'
    );
    expect(linuxChange?.to).toBe(ProtectionModes.prevent);
    expect(linuxChange?.eligibility).toEqual({ eligible: true });
    expect(assessment.proposed.linux.ransomware).toEqual({
      mode: ProtectionModes.prevent,
      supported: true,
    });
    expect(assessment.proposed.linux.popup.ransomware?.enabled).toBe(true);
    expect(
      assessment.changes.find((change) => change.path === 'linux.popup.ransomware.enabled')
        ?.eligibility
    ).toEqual({ eligible: true });
    expect(assessment.globalBlockers).toEqual([]);
  });

  it('backfills a complete Linux ransomware branch below Platinum but reports the prevent level as license-ineligible', () => {
    const stored = policyFactoryWithoutPaidFeatures();
    delete stored.linux.ransomware;
    delete stored.linux.popup.ransomware;

    const assessment = buildPolicyChangeAssessment(
      createPolicy(stored),
      [{ op: 'set_protection_level', protection: 'ransomware', mode: ProtectionModes.prevent }],
      {
        ...capabilities(licenseMock.createLicense({ license: { type: 'gold', mode: 'gold' } })),
        linuxRansomwareProtection: true,
      }
    );

    expect(assessment.proposedConfig.linux.ransomware).toEqual({
      mode: ProtectionModes.prevent,
      supported: false,
    });
    expect(assessment.proposedConfig.linux.popup.ransomware).toEqual({
      enabled: true,
      message: '',
    });
    expect(
      assessment.changes.find((change) => change.path === 'linux.ransomware.mode')?.eligibility
    ).toEqual({ eligible: false, reason: 'license_below_platinum' });
    expect(
      assessment.changes.find((change) => change.path === 'linux.popup.ransomware.enabled')
        ?.eligibility
    ).toEqual({ eligible: false, reason: 'license_below_platinum' });
    expect(assessment.globalBlockers).toEqual([{ reason: 'license_invalid_policy' }]);
  });

  it('never touches Linux ransomware for a protection-level operation while the flag is off', () => {
    const stored = policyFactory();
    stored.windows.ransomware.mode = ProtectionModes.off;
    stored.mac.ransomware.mode = ProtectionModes.off;
    delete stored.linux.ransomware;
    delete stored.linux.popup.ransomware;

    const assessment = buildPolicyChangeAssessment(
      createPolicy(stored),
      [{ op: 'set_protection_level', protection: 'ransomware', mode: ProtectionModes.prevent }],
      { ...capabilities(), linuxRansomwareProtection: false }
    );

    expect(
      assessment.changes.some(
        (change) =>
          change.path.startsWith('linux.ransomware') ||
          change.path.startsWith('linux.popup.ransomware')
      )
    ).toBe(false);
    expect(assessment.proposed.linux.ransomware).toBeUndefined();
    const windowsChange = assessment.changes.find(
      (change) => change.path === 'windows.ransomware.mode'
    );
    expect(windowsChange?.to).toBe(ProtectionModes.prevent);
  });

  it('marks an explicit Linux ransomware set_field ineligible while the flag is off', () => {
    const stored = policyFactory();

    const assessment = buildPolicyChangeAssessment(
      createPolicy(stored),
      [{ op: 'set_field', path: 'linux.ransomware.mode', value: ProtectionModes.off }],
      { ...capabilities(), linuxRansomwareProtection: false }
    );

    expect(assessment.changes[0]?.eligibility).toEqual({
      eligible: false,
      reason: 'linux_ransomware_protection_experimental_disabled',
    });
  });

  it('reports the registry credential hardening gate and marks the change ineligible while the flag is off', () => {
    const stored = policyFactory();
    stored.windows.attack_surface_reduction.registry_credential_hardening = { enabled: false };

    const assessment = buildPolicyChangeAssessment(
      createPolicy(stored),
      [
        {
          op: 'set_field',
          path: 'windows.attack_surface_reduction.registry_credential_hardening.enabled',
          value: true,
        },
      ],
      {
        ...capabilities(),
        registryCredentialHardeningExperimental: false,
      }
    );

    expect(assessment.changes[0]?.registry.productFeatureGate).toBe(
      ProductFeatureSecurityKey.endpointRegistryCredentialHardening
    );
    expect(assessment.changes[0]?.eligibility).toEqual({
      eligible: false,
      reason: 'registry_credential_hardening_experimental_disabled',
    });
  });

  it('adds one generic blocker when an unrelated eligible change retains an invalid Device Control state', () => {
    const stored = policyFactory();
    stored.windows.device_control!.usb_storage = DeviceControlAccessLevel.audit;

    const assessment = buildPolicyChangeAssessment(
      createPolicy(stored),
      [{ op: 'set_field', path: 'windows.malware.mode', value: ProtectionModes.detect }],
      capabilities()
    );

    expect(assessment.changes[0]?.eligibility).toEqual({ eligible: true });
    expect(assessment.globalBlockers).toEqual([
      { reason: 'device_control_notification_requires_deny_all' },
    ]);
  });

  it('adds one global blocker when the source package policy is managed', () => {
    const assessment = buildPolicyChangeAssessment(
      createPolicy(policyFactory(), { is_managed: true }),
      [{ op: 'set_field', path: 'windows.malware.mode', value: ProtectionModes.detect }],
      capabilities()
    );

    expect(assessment.changes[0]?.eligibility).toEqual({ eligible: true });
    expect(assessment.globalBlockers).toEqual([{ reason: 'managed_policy_not_writable' }]);
  });

  it('does not produce endpoint_custom_notification_disabled for a stripped Essentials policy with default messages', () => {
    // Simulate an Essentials stored policy: no device_control, all popup messages at defaults (empty)
    const stored = removeDeviceControl(policyFactory());

    const assessment = buildPolicyChangeAssessment(
      createPolicy(stored),
      [{ op: 'set_field', path: 'windows.malware.mode', value: ProtectionModes.detect }],
      {
        ...capabilities(),
        endpointCustomNotification: false,
      }
    );

    expect(assessment.changes[0]?.eligibility).toEqual({ eligible: true });
    const customNotificationBlocker = assessment.globalBlockers.find(
      (b) => b.reason === 'endpoint_custom_notification_disabled'
    );
    expect(customNotificationBlocker).toBeUndefined();
  });

  it('still yields endpoint_custom_notification_disabled when a real custom message is present', () => {
    const stored = removeDeviceControl(policyFactory());
    stored.windows.popup.malware.message = 'Block it!';

    const assessment = buildPolicyChangeAssessment(
      createPolicy(stored),
      [{ op: 'set_field', path: 'windows.malware.mode', value: ProtectionModes.detect }],
      {
        ...capabilities(),
        endpointCustomNotification: false,
      }
    );

    expect(assessment.globalBlockers).toEqual(
      expect.arrayContaining([{ reason: 'endpoint_custom_notification_disabled' }])
    );
  });

  it('reports only the malware protection advisory when malware is turned off', () => {
    const assessment = buildPolicyChangeAssessment(
      createPolicy(policyFactory()),
      [{ op: 'set_protection_enabled', protection: 'malware', enabled: false }],
      capabilities()
    );

    expect(assessment.advisories).toEqual([
      {
        code: 'protection_weakened',
        protection: 'malware',
        os: [PolicyOperatingSystem.windows, PolicyOperatingSystem.mac, PolicyOperatingSystem.linux],
        to: 'off',
        text: 'Malware protection on Windows, macOS, Linux is turned off: this protection no longer detects or blocks threats.',
      },
    ]);
  });

  it('still warns about a weakened sub-setting when its parent protection only changes to Detect', () => {
    const stored = policyFactory();
    stored.windows.malware.mode = ProtectionModes.prevent;

    const assessment = buildPolicyChangeAssessment(
      createPolicy(stored),
      [
        { op: 'set_field', path: 'windows.malware.mode', value: ProtectionModes.detect },
        { op: 'set_field', path: 'windows.malware.blocklist', value: false },
      ],
      capabilities()
    );

    expect(assessment.advisories).toEqual([
      {
        code: 'protection_weakened',
        protection: 'malware',
        os: [PolicyOperatingSystem.windows],
        to: 'detect',
        text: 'Malware protection on Windows changes to Detect: this protection generates alerts but does not block threats.',
      },
      {
        code: 'protection_setting_weakened',
        setting: 'malware.blocklist',
        os: [PolicyOperatingSystem.windows, PolicyOperatingSystem.mac, PolicyOperatingSystem.linux],
        text: 'Malware blocklist on Windows, macOS, Linux is turned off.',
      },
    ]);
  });

  it('lists only the OS whose protection mode weakens for set_protection_level', () => {
    const stored = policyFactory();
    stored.windows.malware.mode = ProtectionModes.prevent;
    stored.mac.malware.mode = ProtectionModes.off;
    stored.linux.malware.mode = ProtectionModes.detect;

    const assessment = buildPolicyChangeAssessment(
      createPolicy(stored),
      [{ op: 'set_protection_level', protection: 'malware', mode: ProtectionModes.detect }],
      capabilities()
    );

    expect(assessment.advisories).toEqual([
      {
        code: 'protection_weakened',
        protection: 'malware',
        os: [PolicyOperatingSystem.windows],
        to: 'detect',
        text: 'Malware protection on Windows changes to Detect: this protection generates alerts but does not block threats.',
      },
    ]);
  });

  it('advises a stale protection-updates pin only when the pinned date is at least 30 days old', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-06-15T00:00:00.000Z'));
    try {
      const stale = moment.utc().subtract(45, 'days').format('YYYY-MM-DD');
      const fresh = moment.utc().subtract(10, 'days').format('YYYY-MM-DD');

      const staleAssessment = buildPolicyChangeAssessment(
        createPolicy(policyFactory()),
        [{ op: 'set_field', path: 'global_manifest_version', value: stale }],
        capabilities()
      );
      const freshAssessment = buildPolicyChangeAssessment(
        createPolicy(policyFactory()),
        [{ op: 'set_field', path: 'global_manifest_version', value: fresh }],
        capabilities()
      );

      expect(staleAssessment.advisories).toEqual([
        {
          code: 'global_manifest_version_stale',
          value: stale,
          ageDays: 45,
          text: `Protection artifacts pinned to ${stale} are 45 days old. Elastic recommends keeping protection artifacts up to date. After 18 months, protection artifacts expire and cannot be rolled back.`,
        },
      ]);
      expect(freshAssessment.advisories).toEqual([]);
    } finally {
      jest.useRealTimers();
    }
  });
});
