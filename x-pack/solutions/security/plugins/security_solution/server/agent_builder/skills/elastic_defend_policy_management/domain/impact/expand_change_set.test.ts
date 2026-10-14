/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  policyFactory,
  policyFactoryWithoutPaidFeatures,
} from '../../../../../../common/endpoint/models/policy_config';
import * as policyConfigHelpers from '../../../../../../common/endpoint/models/policy_config_helpers';
import { DeviceControlAccessLevel, ProtectionModes } from '../../../../../../common/endpoint/types';
import { expandChangeSet } from './expand_change_set';
import type { ExplicitPolicyChange } from './policy_change_operation';
import type { PolicyOperationRejection } from './policy_operation_rejection';
import { PolicyChangeRejectedError } from './policy_operation_rejection';

const pathsOf = (changes: readonly ExplicitPolicyChange[]): string[] =>
  changes.map((change) => change.path);

const changeAt = (
  changes: readonly ExplicitPolicyChange[],
  path: string
): ExplicitPolicyChange | undefined => changes.find((change) => change.path === path);

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
      behaviorPolicy
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
      behaviorPolicy
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
          policy
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
      () => expandChangeSet([{ op: 'set_field', path, value: true }], policy),
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
          policy
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
      policyFactory()
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
      policyFactory()
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
      policyFactory()
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
          policyFactory()
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
      () => expandChangeSet(operations, policyFactory()),
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
      () => expandChangeSet(operations, policy),
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
      () => expandChangeSet(operations, policyFactory()),
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
          policy
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
    const prepared = expandChangeSet(operations, policyFactory());

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

    const prepared = expandChangeSet(enableThenUsb, policyFactoryWithoutPaidFeatures());
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
      policy
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
      policy
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
      missingSibling
    );

    expect(prepared.proposedConfig.windows.device_control?.usb_storage).toBe(
      DeviceControlAccessLevel.read_only
    );
    expect(prepared.proposedConfig.mac.device_control?.usb_storage).toBe(
      DeviceControlAccessLevel.read_only
    );
    expect(prepared.proposedConfig.mac.device_control?.enabled).toBe(true);
  });

  it('refuses unknown, excluded, derived, and other non-writable direct paths', () => {
    const unknownPolicy = policyFactory();
    const unknownBefore = structuredClone(unknownPolicy);
    expectRejections(
      () =>
        expandChangeSet([{ op: 'set_field', path: 'not.a.real.path', value: true }], unknownPolicy),
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
          policy
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
      policy
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
      policy
    );
    expect(result.proposedConfig).toEqual(expected);

    expectRejections(
      () =>
        expandChangeSet(
          [
            { op: 'set_field', path: 'windows.device_control.enabled', value: false },
            { op: 'set_field', path: 'windows.device_control.usb_storage', value: 'deny_all' },
          ],
          policy
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
      policy
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
