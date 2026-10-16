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
import type { PolicyOperationRejection } from './policy_operation_rejection';
import { PolicyChangeRejectedError } from './policy_operation_rejection';

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

const expectRejections = (
  run: () => unknown,
  rejections: PolicyOperationRejection[]
): PolicyChangeRejectedError => {
  try {
    run();
    throw new Error('expected preparation to fail');
  } catch (error) {
    expect(error).toBeInstanceOf(PolicyChangeRejectedError);
    const rejected = error as PolicyChangeRejectedError;
    expect(rejected.rejections).toEqual(rejections);
    return rejected;
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

  it('rejects invalid device-switch values with invalid_value before any helper runs', () => {
    const policy = policyFactory();
    const before = structuredClone(policy);
    expectRejections(
      () =>
        expandChangeSet(
          [{ op: 'set_field', path: 'windows.device_control.enabled', value: 'false' }],
          policy,
          ransomwareLinuxContext
        ),
      [
        {
          operationIndexes: [0],
          path: 'windows.device_control.enabled',
          reason: 'invalid_value',
          acceptedValues: { type: 'boolean' },
        },
      ]
    );
    expect(policy).toEqual(before);
  });

  it('refuses device popup-enabled paths with the coupled_only reason', () => {
    const path = 'windows.popup.device_control.enabled';
    const policy = policyFactory();
    const before = structuredClone(policy);
    expectRejections(
      () =>
        expandChangeSet([{ op: 'set_field', path, value: true }], policy, ransomwareLinuxContext),
      [{ operationIndexes: [0], path, reason: 'coupled_only' }]
    );
    expect(policy).toEqual(before);
  });

  it('collects every pass-1 rejection for a mixed request in one error', () => {
    const policy = policyFactory();
    const before = structuredClone(policy);
    expectRejections(
      () =>
        expandChangeSet(
          [
            { op: 'set_field', path: 'windows.malware.mode', value: ProtectionModes.detect },
            { op: 'set_field', path: 'windows.antivirus_registration.enabled', value: false },
            { op: 'set_field', path: 'windows.device_control.usb_storage', value: 'sometimes' },
          ],
          policy,
          ransomwareLinuxContext
        ),
      [
        {
          operationIndexes: [1],
          path: 'windows.antivirus_registration.enabled',
          reason: 'derived_setting',
        },
        {
          operationIndexes: [2],
          path: 'windows.device_control.usb_storage',
          reason: 'invalid_value',
          acceptedValues: {
            type: 'enum',
            values: [
              DeviceControlAccessLevel.audit,
              DeviceControlAccessLevel.read_only,
              DeviceControlAccessLevel.no_execute,
              DeviceControlAccessLevel.deny_all,
            ],
          },
        },
      ]
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
    expectRejections(
      () =>
        expandChangeSet(
          [
            { op: 'set_field', path: 'windows.malware.mode', value: ProtectionModes.detect },
            { op: 'set_field', path: 'mac.malware.mode', value: ProtectionModes.prevent },
          ],
          policyFactory(),
          ransomwareLinuxContext
        ),
      [
        {
          operationIndexes: [0, 1],
          path: 'malware.mode',
          reason: 'conflicting_operations',
        },
      ]
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

    expectRejections(
      () => expandChangeSet(operations, policyFactory(), ransomwareLinuxContext),
      [
        {
          operationIndexes: [0, 1],
          path: 'malware.mode',
          reason: 'conflicting_operations',
        },
      ]
    );
  });

  it('rejects disabling session_data before enabling tty_io', () => {
    const policy = policyFactory();
    policy.linux.events.session_data = true;
    const operations = [
      { op: 'set_field' as const, path: 'linux.events.session_data', value: false },
      { op: 'set_field' as const, path: 'linux.events.tty_io', value: true },
    ];

    expectRejections(
      () => expandChangeSet(operations, policy, ransomwareLinuxContext),
      [
        {
          operationIndexes: [0, 1],
          path: 'linux.events.tty_io',
          reason: 'invalid_combination',
        },
      ]
    );
  });

  it('attributes an invalid combination only to operations that set the fields', () => {
    const operations = [
      { op: 'set_field' as const, path: 'linux.events.session_data', value: false },
      { op: 'set_field' as const, path: 'linux.events.tty_io', value: true },
    ];

    expectRejections(
      () => expandChangeSet(operations, policyFactory(), ransomwareLinuxContext),
      [
        {
          operationIndexes: [1],
          path: 'linux.events.tty_io',
          reason: 'invalid_combination',
        },
      ]
    );
  });

  it('rejects a stored invalid combination with no operation indexes', () => {
    const policy = policyFactory();
    policy.linux.events.session_data = false;
    policy.linux.events.tty_io = true;

    expectRejections(
      () =>
        expandChangeSet(
          [{ op: 'set_field', path: 'windows.malware.mode', value: ProtectionModes.detect }],
          policy,
          ransomwareLinuxContext
        ),
      [
        {
          operationIndexes: [],
          path: 'linux.events.tty_io',
          reason: 'invalid_combination',
        },
      ]
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

      expectRejections(
        () =>
          expandChangeSet([{ op: 'set_field', path, value }], policy, {
            linuxRansomwareProtection: false,
            licenseInformation: platinum,
          }),
        [{ operationIndexes: [0], path, reason: 'current_value_missing' }]
      );
      expect(policy).toEqual(before);
    }
  );

  it('still refuses a targeted macOS ransomware mode when mac.ransomware is absent', () => {
    const policy = policyFactory();
    // A macOS policy stored before the branch existed lacks the otherwise-required `mac.ransomware`.
    const legacyMac: { mac: { ransomware?: unknown } } = policy;
    delete legacyMac.mac.ransomware;

    expectRejections(
      () =>
        expandChangeSet(
          [{ op: 'set_field', path: 'mac.ransomware.mode', value: ProtectionModes.prevent }],
          policy,
          { linuxRansomwareProtection: true, licenseInformation: platinum }
        ),
      [{ operationIndexes: [0], path: 'mac.ransomware.mode', reason: 'current_value_missing' }]
    );
  });

  it('refuses unknown, excluded, derived, and other non-writable direct paths', () => {
    const unknownPolicy = policyFactory();
    const unknownBefore = structuredClone(unknownPolicy);
    expectRejections(
      () =>
        expandChangeSet(
          [{ op: 'set_field', path: 'not.a.real.path', value: true }],
          unknownPolicy,
          ransomwareLinuxContext
        ),
      [{ operationIndexes: [0], path: 'not.a.real.path', reason: 'unknown_path' }]
    );
    expect(unknownPolicy).toEqual(unknownBefore);
  });

  it('refuses set_field when the live current value is unknown', () => {
    const policy = policyFactory();
    delete (policy as unknown as { global_manifest_version?: unknown }).global_manifest_version;
    const before = structuredClone(policy);

    expectRejections(
      () =>
        expandChangeSet(
          [{ op: 'set_field', path: 'global_manifest_version', value: '2024-01-01' }],
          policy,
          ransomwareLinuxContext
        ),
      [
        {
          operationIndexes: [0],
          path: 'global_manifest_version',
          reason: 'current_value_missing',
        },
      ]
    );
    expect(policy).toEqual(before);
  });
  it('constrains tty_io when session_data is disabled', () => {
    const policy = policyFactory();
    policy.linux.events.tty_io = true;
    const result = expandChangeSet(
      [{ op: 'set_field', path: 'linux.events.session_data', value: false }],
      policy,
      ransomwareLinuxContext
    );
    expect(changeAt(result.explicitChanges, 'linux.events.tty_io')).toMatchObject({
      from: true,
      to: false,
      origin: { kind: 'coupled' },
    });
  });

  it('creates missing device control through the shared switch helper', () => {
    const policy = policyFactory();
    delete policy.windows.device_control;
    delete policy.mac.device_control;
    delete policy.windows.popup.device_control;
    delete policy.mac.popup.device_control;
    const expected = structuredClone(policy);
    policyConfigHelpers.setDeviceControlSwitch(expected, true);
    policyConfigHelpers.setDeviceControlUsbStorage(expected, DeviceControlAccessLevel.deny_all);
    const result = expandChangeSet(
      [
        { op: 'set_field', path: 'windows.device_control.enabled', value: true },
        { op: 'set_field', path: 'windows.device_control.usb_storage', value: 'deny_all' },
      ],
      policy,
      ransomwareLinuxContext
    );
    expect(result.proposedConfig).toEqual(expected);

    expectRejections(
      () =>
        expandChangeSet(
          [
            { op: 'set_field', path: 'windows.device_control.enabled', value: false },
            { op: 'set_field', path: 'windows.device_control.usb_storage', value: 'deny_all' },
          ],
          policy,
          ransomwareLinuxContext
        ),
      [
        {
          operationIndexes: [1],
          path: 'windows.device_control.usb_storage',
          reason: 'current_value_missing',
        },
      ]
    );
  });

  it('creates custom YARA on all OSes through the shared helper', () => {
    const policy = policyFactory();
    delete policy.windows.memory_protection.custom_yara_signatures;
    delete policy.mac.memory_protection.custom_yara_signatures;
    delete policy.linux.memory_protection.custom_yara_signatures;
    const result = expandChangeSet(
      [{ op: 'set_field', path: 'windows.memory_protection.custom_yara_signatures', value: true }],
      policy,
      ransomwareLinuxContext
    );
    expect(result.proposedConfig.windows.memory_protection.custom_yara_signatures).toBe(true);
    expect(result.proposedConfig.mac.memory_protection.custom_yara_signatures).toBe(true);
    expect(result.proposedConfig.linux.memory_protection.custom_yara_signatures).toBe(true);
    expect(
      changeAt(result.explicitChanges, 'mac.memory_protection.custom_yara_signatures')?.origin.kind
    ).toBe('coupled');
    expect(
      changeAt(result.explicitChanges, 'linux.memory_protection.custom_yara_signatures')?.origin
        .kind
    ).toBe('coupled');
  });
});
