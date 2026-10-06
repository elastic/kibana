/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProductFeatureSecurityKey } from '@kbn/security-solution-features/keys';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import { FleetPackagePolicyGenerator } from '../../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import {
  policyFactory,
  policyFactoryWithoutPaidFeatures,
} from '../../../../../../common/endpoint/models/policy_config';
import {
  ProtectionModes,
  DeviceControlAccessLevel,
  type PolicyConfig,
} from '../../../../../../common/endpoint/types';
import { createEndpointPolicySnapshot } from '../endpoint_policy_snapshot';
import { normalizeEndpointPolicy } from '../normalized_endpoint_policy';
import { buildPolicyChangeAssessment } from './build_policy_change_assessment';
import type { PolicyChangeCapabilities } from './build_policy_change_assessment';

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
  linuxRansomwareProtection: true,
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

describe('buildPolicyChangeAssessment', () => {
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
});
