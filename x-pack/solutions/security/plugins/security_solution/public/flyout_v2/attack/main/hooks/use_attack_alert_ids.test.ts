/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { useAttackAlertIds } from './use_attack_alert_ids';

const buildHit = (
  alertIds: string[] | undefined,
  replacements?: Record<string, string>
): DataTableRecord => {
  const flattened: Record<string, unknown> = {};
  if (alertIds !== undefined) {
    flattened['kibana.alert.attack_discovery.alert_ids'] = alertIds;
  }
  if (replacements !== undefined) {
    flattened['kibana.alert.attack_discovery.replacements'] = replacements;
  }
  return { id: 'test', raw: { _id: 'test' }, flattened } as unknown as DataTableRecord;
};

describe('useAttackAlertIds', () => {
  it('returns an empty array when alert_ids is absent', () => {
    const hit = buildHit(undefined);
    const { result } = renderHook(() => useAttackAlertIds(hit));
    expect(result.current).toEqual([]);
  });

  it('returns alert IDs unchanged when there are no replacements', () => {
    const hit = buildHit(['alert-1', 'alert-2', 'alert-3']);
    const { result } = renderHook(() => useAttackAlertIds(hit));
    expect(result.current).toEqual(['alert-1', 'alert-2', 'alert-3']);
  });

  it('de-obfuscates alert IDs using replacements', () => {
    const hit = buildHit(['uuid-a', 'uuid-b', 'alert-3'], {
      'uuid-a': 'original-alert-1',
      'uuid-b': 'original-alert-2',
    });
    const { result } = renderHook(() => useAttackAlertIds(hit));
    expect(result.current).toEqual(['original-alert-1', 'original-alert-2', 'alert-3']);
  });

  it('passes through IDs not present in replacements map unchanged', () => {
    const hit = buildHit(['uuid-a', 'alert-no-replacement'], { 'uuid-a': 'original-alert-1' });
    const { result } = renderHook(() => useAttackAlertIds(hit));
    expect(result.current).toEqual(['original-alert-1', 'alert-no-replacement']);
  });

  it('handles a single string value for alert_ids (not wrapped in array)', () => {
    const hit: DataTableRecord = {
      id: 'test',
      raw: { _id: 'test' },
      flattened: { 'kibana.alert.attack_discovery.alert_ids': 'single-alert-id' },
    } as unknown as DataTableRecord;
    const { result } = renderHook(() => useAttackAlertIds(hit));
    expect(result.current).toEqual(['single-alert-id']);
  });

  it('ignores replacements when value is a string (malformed)', () => {
    const hit: DataTableRecord = {
      id: 'test',
      raw: { _id: 'test' },
      flattened: {
        'kibana.alert.attack_discovery.alert_ids': ['alert-1'],
        'kibana.alert.attack_discovery.replacements': 'not-an-object',
      },
    } as unknown as DataTableRecord;
    const { result } = renderHook(() => useAttackAlertIds(hit));
    expect(result.current).toEqual(['alert-1']);
  });
});
