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
import type { PolicyConfig } from '../../../../../../common/endpoint/types';
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

const platinum = licenseMock.createLicense({ license: { type: 'platinum' } });

/** A policy stored before Linux ransomware existed, with Windows and macOS ransomware on detect. */
const legacyLinuxRansomwarePolicy = (): PolicyConfig => {
  const policy = policyFactory();
  delete policy.linux.ransomware;
  delete policy.linux.popup.ransomware;
  policy.windows.ransomware.mode = ProtectionModes.detect;
  policy.mac.ransomware.mode = ProtectionModes.detect;
  return policy;
};

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

  it('backfills a Platinum-valid linux.ransomware.supported and a complete notification when the mode is set on a policy that lacks them', () => {
    const policy = policyFactory();
    delete policy.linux.ransomware;
    delete policy.linux.popup.ransomware;

    const prepared = expandChangeSet(
      [{ op: 'set_protection_level', protection: 'ransomware', mode: ProtectionModes.prevent }],
      policy,
      { linuxRansomwareProtection: true, licenseInformation: platinum }
    );

    expect(prepared.proposedConfig.linux.ransomware).toEqual({
      mode: ProtectionModes.prevent,
      supported: true,
    });
    expect(prepared.proposedConfig.linux.popup.ransomware).toEqual({ enabled: true, message: '' });
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

  it('never touches Linux ransomware or its notification for a card-level operation while the flag is off', () => {
    const policy = policyFactory();
    policy.windows.ransomware.mode = ProtectionModes.off;
    policy.mac.ransomware.mode = ProtectionModes.off;
    delete policy.linux.ransomware;
    delete policy.linux.popup.ransomware;

    const prepared = expandChangeSet(
      [{ op: 'set_protection_level', protection: 'ransomware', mode: ProtectionModes.prevent }],
      policy,
      { linuxRansomwareProtection: false, licenseInformation: null }
    );

    expect(prepared.proposedConfig.linux.ransomware).toBeUndefined();
    expect(prepared.proposedConfig.linux.popup.ransomware).toBeUndefined();
    expect(changeAt(prepared.explicitChanges, 'windows.ransomware.mode')?.to).toBe(
      ProtectionModes.prevent
    );
    expect(
      pathsOf(prepared.explicitChanges).some(
        (path) => path.startsWith('linux.ransomware') || path.startsWith('linux.popup.ransomware')
      )
    ).toBe(false);
  });

  it('couples a ransomware notification change to Linux only while the flag is on', () => {
    const withoutLinux = policyFactory();
    delete withoutLinux.linux.ransomware;
    delete withoutLinux.linux.popup.ransomware;

    const flagOff = expandChangeSet(
      [{ op: 'set_field', path: 'windows.popup.ransomware.enabled', value: false }],
      withoutLinux,
      { linuxRansomwareProtection: false, licenseInformation: null }
    );
    expect(flagOff.proposedConfig.mac.popup.ransomware.enabled).toBe(false);
    expect(flagOff.proposedConfig.linux.popup.ransomware).toBeUndefined();

    const flagOn = expandChangeSet(
      [{ op: 'set_field', path: 'windows.popup.ransomware.enabled', value: false }],
      policyFactory(),
      ransomwareLinuxContext
    );
    expect(flagOn.proposedConfig.linux.popup.ransomware).toEqual({ enabled: false, message: '' });
  });

  it.each([
    [ProtectionModes.prevent, true],
    [ProtectionModes.detect, false],
  ])(
    'materializes complete Linux ransomware branches for a targeted %s mode on a legacy policy while the flag is on',
    (mode, notificationEnabled) => {
      const prepared = expandChangeSet(
        [{ op: 'set_field', path: 'linux.ransomware.mode', value: mode }],
        legacyLinuxRansomwarePolicy(),
        { linuxRansomwareProtection: true, licenseInformation: platinum }
      );

      expect(prepared.proposedConfig.linux.ransomware).toEqual({ mode, supported: true });
      expect(prepared.proposedConfig.linux.popup.ransomware).toEqual({
        message: '',
        enabled: notificationEnabled,
      });
      expect(prepared.proposedConfig.windows.ransomware.mode).toBe(ProtectionModes.detect);
      expect(prepared.proposedConfig.mac.ransomware.mode).toBe(ProtectionModes.detect);
      expect(pathsOf(prepared.explicitChanges).sort()).toEqual([
        'linux.popup.ransomware.enabled',
        'linux.popup.ransomware.message',
        'linux.ransomware.mode',
        'linux.ransomware.supported',
      ]);
      expect(changeAt(prepared.explicitChanges, 'linux.ransomware.mode')).toEqual({
        path: 'linux.ransomware.mode',
        from: undefined,
        to: mode,
        origin: { operationIndex: 0, op: 'set_field', kind: 'direct' },
      });
      expect(changeAt(prepared.explicitChanges, 'linux.popup.ransomware.enabled')?.origin).toEqual({
        operationIndex: 0,
        op: 'set_field',
        kind: 'coupled',
      });
    }
  );

  it('materializes linux.ransomware with supported false below Platinum for a targeted mode', () => {
    const gold = licenseMock.createLicense({ license: { type: 'gold' } });

    const prepared = expandChangeSet(
      [{ op: 'set_field', path: 'linux.ransomware.mode', value: ProtectionModes.prevent }],
      legacyLinuxRansomwarePolicy(),
      { linuxRansomwareProtection: true, licenseInformation: gold }
    );

    expect(prepared.proposedConfig.linux.ransomware).toEqual({
      mode: ProtectionModes.prevent,
      supported: false,
    });
  });

  it('materializes Linux ransomware as off when only its notification is set on a legacy policy', () => {
    const prepared = expandChangeSet(
      [{ op: 'set_field', path: 'linux.popup.ransomware.enabled', value: true }],
      legacyLinuxRansomwarePolicy(),
      { linuxRansomwareProtection: true, licenseInformation: platinum }
    );

    expect(prepared.proposedConfig.linux.popup.ransomware).toEqual({ message: '', enabled: true });
    expect(prepared.proposedConfig.linux.ransomware).toEqual({
      mode: ProtectionModes.off,
      supported: true,
    });
    expect(prepared.proposedConfig.windows.ransomware.mode).toBe(ProtectionModes.detect);
    expect(prepared.proposedConfig.mac.ransomware.mode).toBe(ProtectionModes.detect);
  });

  it('lets a later ransomware notification change override the materialized Linux notification default', () => {
    const prepared = expandChangeSet(
      [
        { op: 'set_field', path: 'linux.ransomware.mode', value: ProtectionModes.prevent },
        { op: 'set_field', path: 'windows.popup.ransomware.enabled', value: false },
      ],
      legacyLinuxRansomwarePolicy(),
      { linuxRansomwareProtection: true, licenseInformation: platinum }
    );

    expect(prepared.proposedConfig.linux.ransomware).toEqual({
      mode: ProtectionModes.prevent,
      supported: true,
    });
    expect(prepared.proposedConfig.linux.popup.ransomware).toEqual({ message: '', enabled: false });
    expect(prepared.proposedConfig.mac.popup.ransomware.enabled).toBe(false);
  });

  it.each([
    ['linux.ransomware.mode', ProtectionModes.prevent],
    ['linux.popup.ransomware.enabled', true],
  ])(
    'refuses a targeted %s on a legacy policy while the flag is off',
    (path: string, value: unknown) => {
      const policy = legacyLinuxRansomwarePolicy();
      const before = structuredClone(policy);

      expectPreparationError(
        () =>
          expandChangeSet([{ op: 'set_field', path, value }], policy, {
            linuxRansomwareProtection: false,
            licenseInformation: platinum,
          }),
        POLICY_CHANGE_PREPARATION_ERROR_CODE.unknown_current_value,
        unknownCurrentValueMessage(path)
      );
      expect(policy).toEqual(before);
    }
  );

  it('still refuses a targeted macOS ransomware mode when mac.ransomware is absent', () => {
    const policy = policyFactory();
    // A macOS policy stored before the branch existed lacks the otherwise-required `mac.ransomware`.
    const legacyMac: { mac: { ransomware?: unknown } } = policy;
    delete legacyMac.mac.ransomware;

    expectPreparationError(
      () =>
        expandChangeSet(
          [{ op: 'set_field', path: 'mac.ransomware.mode', value: ProtectionModes.prevent }],
          policy,
          { linuxRansomwareProtection: true, licenseInformation: platinum }
        ),
      POLICY_CHANGE_PREPARATION_ERROR_CODE.unknown_current_value,
      unknownCurrentValueMessage('mac.ransomware.mode')
    );
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
