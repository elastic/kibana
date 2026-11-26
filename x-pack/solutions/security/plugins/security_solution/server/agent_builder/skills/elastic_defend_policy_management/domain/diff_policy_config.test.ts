/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { policyFactory } from '../../../../../common/endpoint/models/policy_config';
import { normalize } from './normalize_policy_config';
import { diffPolicyConfig, type PolicyDiffEntry } from './diff_policy_config';
import type { NormalizedPolicyConfig } from './normalized_policy_config';

describe('diffPolicyConfig', () => {
  it('descends a key or section that exists on only one side down to its leaves', () => {
    const left = policyFactory();
    const right = policyFactory();
    right.linux.advanced = { ...(right.linux.advanced ?? {}), extra: 'only-right' };

    expect(diffPolicyConfig(normalize(left), normalize(right))).toEqual([
      {
        path: 'linux.advanced.extra',
        from: undefined,
        to: 'only-right',
      },
    ]);

    const withoutDeviceControl = policyFactory();
    delete withoutDeviceControl.windows.device_control;

    expect(diffPolicyConfig(normalize(withoutDeviceControl), normalize(policyFactory()))).toEqual([
      {
        path: 'windows.device_control.enabled',
        from: undefined,
        to: true,
      },
      {
        path: 'windows.device_control.usb_storage',
        from: undefined,
        to: 'deny_all',
      },
    ]);
  });

  it('emits a left-only row when a key exists only on the left side', () => {
    const left = policyFactory();
    left.linux.advanced = { ...(left.linux.advanced ?? {}), extra: 'only-left' };
    const right = policyFactory();

    expect(diffPolicyConfig(normalize(left), normalize(right))).toEqual([
      {
        path: 'linux.advanced.extra',
        from: 'only-left',
        to: undefined,
      },
    ]);
  });

  it('treats independently cloned equal arrays as unchanged and keeps other array leaves atomic', () => {
    const left = policyFactory();
    const right = policyFactory();
    left.windows.advanced = { ...(left.windows.advanced ?? {}), tags: ['a', ['b']] };
    right.windows.advanced = { ...(right.windows.advanced ?? {}), tags: ['a', ['b']] };

    expect(diffPolicyConfig(normalize(left), normalize(right))).toEqual([]);

    const changed = policyFactory();
    changed.windows.advanced = { ...(changed.windows.advanced ?? {}), tags: ['a', ['c']] };
    expect(diffPolicyConfig(normalize(left), normalize(changed))).toEqual([
      { path: 'windows.advanced.tags', from: ['a', ['b']], to: ['a', ['c']] },
    ]);

    const reordered = policyFactory();
    reordered.windows.advanced = { ...(reordered.windows.advanced ?? {}), tags: [['b'], 'a'] };
    expect(diffPolicyConfig(normalize(left), normalize(reordered))).toEqual([
      { path: 'windows.advanced.tags', from: ['a', ['b']], to: [['b'], 'a'] },
    ]);
  });

  it('emits one row for an empty record or a record against a present non-record', () => {
    const config = (value: Record<string, unknown>): NormalizedPolicyConfig =>
      value as unknown as NormalizedPolicyConfig;

    const cases: Array<{
      label: string;
      left: NormalizedPolicyConfig;
      right: NormalizedPolicyConfig;
      expected: readonly PolicyDiffEntry[];
    }> = [
      {
        label: 'empty record on the left against an absent section',
        left: config({ section: {} }),
        right: config({}),
        expected: [{ path: 'section', from: {}, to: undefined }],
      },
      {
        label: 'empty record on the right against an absent section',
        left: config({}),
        right: config({ section: {} }),
        expected: [{ path: 'section', from: undefined, to: {} }],
      },
      {
        label: 'record on the left against a present non-record on the right',
        left: config({ section: { nested: true } }),
        right: config({ section: 'scalar' }),
        expected: [{ path: 'section', from: { nested: true }, to: 'scalar' }],
      },
      {
        label: 'present non-record on the left against a record on the right',
        left: config({ section: 'scalar' }),
        right: config({ section: { nested: true } }),
        expected: [{ path: 'section', from: 'scalar', to: { nested: true } }],
      },
    ];

    for (const { label, left, right, expected } of cases) {
      expect({ label, diffs: diffPolicyConfig(left, right) }).toEqual({ label, diffs: expected });
    }
  });
});
