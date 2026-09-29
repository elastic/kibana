/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import {
  policyFactory,
  policyFactoryWithoutPaidFeatures,
} from '../../../../../../common/endpoint/models/policy_config';
import * as policyConfigHelpers from '../../../../../../common/endpoint/models/policy_config_helpers';
import { DeviceControlAccessLevel, ProtectionModes } from '../../../../../../common/endpoint/types';
import type { RansomwareLinuxContext } from './expand_change_set';
import { expandChangeSet } from './expand_change_set';
import type { ExplicitPolicyChange } from './policy_change_operation';
import {
  DEVICE_POPUP_ENABLED_UNSUPPORTED_MESSAGE,
  POLICY_CHANGE_PREPARATION_ERROR_CODE,
  PolicyChangePreparationError,
  invalidSetFieldValueMessage,
  nonWritablePathMessage,
  unknownCurrentValueMessage,
} from './policy_change_operation';

const ransomwareLinuxContext: RansomwareLinuxContext = {
  linuxRansomwareProtection: true,
  licenseInformation: null,
};

const pathsOf = (changes: readonly ExplicitPolicyChange[]): string[] =>
  changes.map((change) => change.path);

const changeAt = (
  changes: readonly ExplicitPolicyChange[],
  path: string
): ExplicitPolicyChange | undefined => changes.find((change) => change.path === path);

const expectPreparationError = (
  run: () => unknown,
  code: (typeof POLICY_CHANGE_PREPARATION_ERROR_CODE)[keyof typeof POLICY_CHANGE_PREPARATION_ERROR_CODE],
  message: string
): PolicyChangePreparationError => {
  try {
    run();
    throw new Error('expected preparation to fail');
  } catch (error) {
    expect(error).toBeInstanceOf(PolicyChangePreparationError);
    const preparationError = error as PolicyChangePreparationError;
    expect(preparationError.code).toBe(code);
    expect(preparationError.message).toBe(message);
    return preparationError;
  }
};

describe('expandChangeSet', () => {
  it('dispatches protection enabled across the card OS lists', () => {
    const behaviorPolicy = policyFactory();
    behaviorPolicy.windows.behavior_protection.reputation_service = true;
    behaviorPolicy.mac.behavior_protection.reputation_service = true;
    behaviorPolicy.linux.behavior_protection.reputation_service = true;
    const behavior = expandChangeSet(
      [{ op: 'set_protection_enabled', protection: 'behavior_protection', enabled: false }],
      behaviorPolicy,
      ransomwareLinuxContext
    );
    expect(
      changeAt(behavior.explicitChanges, 'linux.behavior_protection.reputation_service')?.to
    ).toBe(false);
  });

  it('dispatches protection level without malware or reputation siblings', () => {
    const behaviorPolicy = policyFactory();
    behaviorPolicy.windows.behavior_protection.reputation_service = false;
    const behavior = expandChangeSet(
      [
        {
          op: 'set_protection_level',
          protection: 'behavior_protection',
          mode: ProtectionModes.detect,
        },
      ],
      behaviorPolicy,
      ransomwareLinuxContext
    );
    expect(pathsOf(behavior.explicitChanges)).not.toContain(
      'windows.behavior_protection.reputation_service'
    );
  });

  it('rejects invalid device-switch values with invalid_input before any helper runs', () => {
    const policy = policyFactory();
    const before = structuredClone(policy);
    expectPreparationError(
      () =>
        expandChangeSet(
          [{ op: 'set_field', path: 'windows.device_control.enabled', value: 'false' }],
          policy,
          ransomwareLinuxContext
        ),
      POLICY_CHANGE_PREPARATION_ERROR_CODE.invalid_input,
      invalidSetFieldValueMessage('windows.device_control.enabled')
    );
    expect(policy).toEqual(before);
  });

  it('refuses device popup-enabled paths for valid values', () => {
    const path = 'windows.popup.device_control.enabled';
    const policy = policyFactory();
    const before = structuredClone(policy);
    expectPreparationError(
      () =>
        expandChangeSet([{ op: 'set_field', path, value: true }], policy, ransomwareLinuxContext),
      POLICY_CHANGE_PREPARATION_ERROR_CODE.unsupported_operation,
      DEVICE_POPUP_ENABLED_UNSUPPORTED_MESSAGE
    );
    expect(policy).toEqual(before);
  });

  it('lets later operations own origin and omits no-ops', () => {
    const laterWins = expandChangeSet(
      [
        { op: 'set_field', path: 'windows.malware.mode', value: ProtectionModes.detect },
        { op: 'set_field', path: 'windows.malware.mode', value: ProtectionModes.off },
      ],
      policyFactory(),
      ransomwareLinuxContext
    );
    expect(laterWins.explicitChanges).toEqual([
      {
        path: 'windows.malware.mode',
        from: ProtectionModes.prevent,
        to: ProtectionModes.off,
        origin: { operationIndex: 1, op: 'set_field', kind: 'direct' },
      },
    ]);

    const reverted = expandChangeSet(
      [
        { op: 'set_field', path: 'windows.malware.mode', value: ProtectionModes.detect },
        { op: 'set_field', path: 'windows.malware.mode', value: ProtectionModes.prevent },
      ],
      policyFactory(),
      ransomwareLinuxContext
    );
    expect(reverted.explicitChanges).toEqual([]);
  });

  it('does not treat a superseded exact-path malware mode as a sibling OS conflict', () => {
    const prepared = expandChangeSet(
      [
        { op: 'set_field', path: 'windows.malware.mode', value: ProtectionModes.off },
        { op: 'set_field', path: 'windows.malware.mode', value: ProtectionModes.detect },
        { op: 'set_field', path: 'mac.malware.mode', value: ProtectionModes.detect },
      ],
      policyFactory(),
      ransomwareLinuxContext
    );

    expect(changeAt(prepared.explicitChanges, 'windows.malware.mode')?.to).toBe(
      ProtectionModes.detect
    );
    expect(changeAt(prepared.explicitChanges, 'mac.malware.mode')?.to).toBe(ProtectionModes.detect);
  });

  it('rejects conflicting values for a coupled field across operating systems', () => {
    expectPreparationError(
      () =>
        expandChangeSet(
          [
            { op: 'set_field', path: 'windows.malware.mode', value: ProtectionModes.detect },
            { op: 'set_field', path: 'mac.malware.mode', value: ProtectionModes.prevent },
          ],
          policyFactory(),
          ransomwareLinuxContext
        ),
      POLICY_CHANGE_PREPARATION_ERROR_CODE.unsupported_operation,
      'Conflicting values for coupled policy field: malware.mode'
    );
  });

  it('rejects contradictory broad then direct protection mode intents', () => {
    const operations = [
      { op: 'set_protection_enabled' as const, protection: 'malware' as const, enabled: false },
      {
        op: 'set_field' as const,
        path: 'windows.malware.mode',
        value: ProtectionModes.prevent,
      },
    ];

    expectPreparationError(
      () => expandChangeSet(operations, policyFactory(), ransomwareLinuxContext),
      POLICY_CHANGE_PREPARATION_ERROR_CODE.unsupported_operation,
      'Conflicting values for coupled policy field: malware.mode'
    );
  });

  it('rejects disabling session_data before enabling tty_io', () => {
    const operations = [
      { op: 'set_field' as const, path: 'linux.events.session_data', value: false },
      { op: 'set_field' as const, path: 'linux.events.tty_io', value: true },
    ];

    expectPreparationError(
      () => expandChangeSet(operations, policyFactory(), ransomwareLinuxContext),
      POLICY_CHANGE_PREPARATION_ERROR_CODE.unsupported_operation,
      'Linux tty_io cannot be enabled while session_data is disabled.'
    );
  });

  it('stages a USB value after explicitly disabling device control', () => {
    const operations = [
      { op: 'set_field' as const, path: 'windows.device_control.enabled', value: false },
      { op: 'set_field' as const, path: 'windows.device_control.usb_storage', value: 'deny_all' },
    ];
    const prepared = expandChangeSet(operations, policyFactory(), ransomwareLinuxContext);

    expect(prepared.proposedConfig.windows.device_control?.enabled).toBe(false);
    expect(prepared.proposedConfig.mac.device_control?.enabled).toBe(false);
    expect(prepared.proposedConfig.windows.device_control?.usb_storage).toBe('deny_all');
    expect(prepared.proposedConfig.mac.device_control?.usb_storage).toBe('deny_all');
  });

  it('preserves an explicit usb_storage level after enabling device control', () => {
    const enableThenUsb = [
      { op: 'set_field' as const, path: 'windows.device_control.enabled', value: true },
      {
        op: 'set_field' as const,
        path: 'windows.device_control.usb_storage',
        value: DeviceControlAccessLevel.read_only,
      },
    ];

    const prepared = expandChangeSet(
      enableThenUsb,
      policyFactoryWithoutPaidFeatures(),
      ransomwareLinuxContext
    );
    const requestedUsb = changeAt(prepared.explicitChanges, 'windows.device_control.usb_storage');
    const siblingUsb = changeAt(prepared.explicitChanges, 'mac.device_control.usb_storage');

    expect(changeAt(prepared.explicitChanges, 'windows.device_control.enabled')?.to).toBe(true);
    expect(changeAt(prepared.explicitChanges, 'mac.device_control.enabled')?.to).toBe(true);
    expect(prepared.proposedConfig.windows.device_control?.usb_storage).toBe(
      DeviceControlAccessLevel.read_only
    );
    expect(prepared.proposedConfig.mac.device_control?.usb_storage).toBe(
      DeviceControlAccessLevel.read_only
    );
    expect(requestedUsb?.to).toBe(DeviceControlAccessLevel.read_only);
    expect(siblingUsb?.to).toBe(DeviceControlAccessLevel.read_only);
  });

  it('stages a USB value without implicitly enabling device control', () => {
    const policy = policyFactoryWithoutPaidFeatures();
    policyConfigHelpers.setDeviceControlSwitch(policy, false);

    const prepared = expandChangeSet(
      [
        {
          op: 'set_field',
          path: 'windows.device_control.usb_storage',
          value: DeviceControlAccessLevel.deny_all,
        },
      ],
      policy,
      ransomwareLinuxContext
    );

    expect(prepared.proposedConfig.windows.device_control?.enabled).toBe(false);
    expect(prepared.proposedConfig.mac.device_control?.enabled).toBe(false);
    expect(prepared.proposedConfig.windows.device_control?.usb_storage).toBe(
      DeviceControlAccessLevel.deny_all
    );
    expect(prepared.proposedConfig.mac.device_control?.usb_storage).toBe(
      DeviceControlAccessLevel.deny_all
    );
  });

  it('allows an unrelated change with a pre-existing disabled non-audit USB value', () => {
    const policy = policyFactory();
    policyConfigHelpers.setDeviceControlSwitch(policy, false);
    policy.windows.device_control!.usb_storage = DeviceControlAccessLevel.deny_all;
    policy.mac.device_control!.usb_storage = DeviceControlAccessLevel.deny_all;

    const prepared = expandChangeSet(
      [{ op: 'set_field', path: 'windows.malware.mode', value: ProtectionModes.detect }],
      policy,
      ransomwareLinuxContext
    );

    expect(changeAt(prepared.explicitChanges, 'windows.malware.mode')?.to).toBe(
      ProtectionModes.detect
    );
    expect(prepared.proposedConfig.windows.device_control?.enabled).toBe(false);
    expect(prepared.proposedConfig.mac.device_control?.enabled).toBe(false);
    expect(prepared.proposedConfig.windows.device_control?.usb_storage).toBe(
      DeviceControlAccessLevel.deny_all
    );
    expect(prepared.proposedConfig.mac.device_control?.usb_storage).toBe(
      DeviceControlAccessLevel.deny_all
    );
  });

  it('creates a missing mac device-control sibling as a coupled effect', () => {
    const missingSibling = policyFactory();
    delete missingSibling.mac.device_control;

    const prepared = expandChangeSet(
      [
        {
          op: 'set_field',
          path: 'windows.device_control.usb_storage',
          value: DeviceControlAccessLevel.read_only,
        },
      ],
      missingSibling,
      ransomwareLinuxContext
    );

    expect(prepared.proposedConfig.windows.device_control?.usb_storage).toBe(
      DeviceControlAccessLevel.read_only
    );
    expect(prepared.proposedConfig.mac.device_control?.usb_storage).toBe(
      DeviceControlAccessLevel.read_only
    );
    expect(prepared.proposedConfig.mac.device_control?.enabled).toBe(true);
  });

  it('backfills a Platinum-valid linux.ransomware.supported when the mode is set on a policy that lacks it', () => {
    const policy = policyFactory();
    delete policy.linux.ransomware;
    const platinum = licenseMock.createLicense({ license: { type: 'platinum' } });

    const prepared = expandChangeSet(
      [{ op: 'set_protection_level', protection: 'ransomware', mode: ProtectionModes.prevent }],
      policy,
      { linuxRansomwareProtection: true, licenseInformation: platinum }
    );

    expect(prepared.proposedConfig.linux.ransomware).toEqual({
      mode: ProtectionModes.prevent,
      supported: true,
    });
    expect(prepared.proposedConfig.linux.popup).not.toHaveProperty('ransomware');
  });

  it('backfills supported false below Platinum when linux.ransomware is materialized', () => {
    const policy = policyFactory();
    delete policy.linux.ransomware;
    const gold = licenseMock.createLicense({ license: { type: 'gold' } });

    const prepared = expandChangeSet(
      [{ op: 'set_protection_level', protection: 'ransomware', mode: ProtectionModes.prevent }],
      policy,
      { linuxRansomwareProtection: true, licenseInformation: gold }
    );

    expect(prepared.proposedConfig.linux.ransomware).toEqual({
      mode: ProtectionModes.prevent,
      supported: false,
    });
  });

  it('never touches linux.ransomware for a card-level operation while the flag is off', () => {
    const policy = policyFactory();
    policy.windows.ransomware.mode = ProtectionModes.off;
    policy.mac.ransomware.mode = ProtectionModes.off;
    delete policy.linux.ransomware;

    const prepared = expandChangeSet(
      [{ op: 'set_protection_level', protection: 'ransomware', mode: ProtectionModes.prevent }],
      policy,
      { linuxRansomwareProtection: false, licenseInformation: null }
    );

    expect(prepared.proposedConfig.linux.ransomware).toBeUndefined();
    expect(changeAt(prepared.explicitChanges, 'windows.ransomware.mode')?.to).toBe(
      ProtectionModes.prevent
    );
    expect(
      pathsOf(prepared.explicitChanges).some((path) => path.startsWith('linux.ransomware'))
    ).toBe(false);
  });

  it('refuses unknown, excluded, derived, and other non-writable direct paths', () => {
    const unknownPolicy = policyFactory();
    const unknownBefore = structuredClone(unknownPolicy);
    expectPreparationError(
      () =>
        expandChangeSet(
          [{ op: 'set_field', path: 'not.a.real.path', value: true }],
          unknownPolicy,
          ransomwareLinuxContext
        ),
      POLICY_CHANGE_PREPARATION_ERROR_CODE.non_writable_path,
      nonWritablePathMessage('not.a.real.path')
    );
    expect(unknownPolicy).toEqual(unknownBefore);
  });

  it('refuses set_field when the live current value is unknown', () => {
    const policy = policyFactory();
    delete (policy as unknown as { global_manifest_version?: unknown }).global_manifest_version;
    const before = structuredClone(policy);

    expectPreparationError(
      () =>
        expandChangeSet(
          [{ op: 'set_field', path: 'global_manifest_version', value: '2024-01-01' }],
          policy,
          ransomwareLinuxContext
        ),
      POLICY_CHANGE_PREPARATION_ERROR_CODE.unknown_current_value,
      unknownCurrentValueMessage('global_manifest_version')
    );
    expect(policy).toEqual(before);
  });
});
