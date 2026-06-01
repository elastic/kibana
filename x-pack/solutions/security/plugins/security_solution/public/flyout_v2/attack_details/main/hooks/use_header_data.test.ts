/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { getOriginalAlertIds } from '@kbn/elastic-assistant-common';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import { useHeaderData } from './use_header_data';

jest.mock('@kbn/elastic-assistant-common', () => ({
  getOriginalAlertIds: jest.fn(({ alertIds }: { alertIds: string[] }) => alertIds),
}));

const buildAttack = (overrides: Partial<AttackDiscoveryAlert> = {}): AttackDiscoveryAlert =>
  ({
    id: 'attack-1',
    index: '.alerts',
    title: '',
    timestamp: undefined,
    alertIds: [],
    replacements: undefined,
    assignees: undefined,
    ...overrides,
  } as unknown as AttackDiscoveryAlert);

describe('useHeaderData', () => {
  beforeEach(() => {
    jest.mocked(getOriginalAlertIds).mockImplementation(({ alertIds }) => alertIds);
  });

  it('returns correct header data with single values', () => {
    const attack = buildAttack({
      title: 'Test Attack',
      timestamp: '2025-12-16T12:00:00Z',
      alertIds: ['alert-1'],
      replacements: { key: 'value' },
      assignees: ['user-1'],
    });

    const { result } = renderHook(() => useHeaderData(attack));

    expect(result.current.title).toBe('Test Attack');
    expect(result.current.timestamp).toBe('2025-12-16T12:00:00Z');
    expect(result.current.alertIds).toEqual(['alert-1']);
    expect(result.current.alertsCount).toBe(1);
    expect(result.current.replacements).toEqual({ key: 'value' });
    expect(result.current.assignees).toEqual(['user-1']);
  });

  it('returns alertIds array as-is and computes alertsCount', () => {
    const attack = buildAttack({
      alertIds: ['alert-1', 'alert-2'],
    });

    const { result } = renderHook(() => useHeaderData(attack));

    expect(result.current.alertIds).toEqual(['alert-1', 'alert-2']);
    expect(result.current.alertsCount).toBe(2);
  });

  it('returns empty replacements when field is missing', () => {
    const attack = buildAttack();

    const { result } = renderHook(() => useHeaderData(attack));
    expect(result.current.replacements).toEqual({});
  });

  it('returns empty alertIds when value is missing', () => {
    const attack = buildAttack({ alertIds: [] });

    const { result } = renderHook(() => useHeaderData(attack));
    expect(result.current.alertIds).toEqual([]);
    expect(result.current.alertsCount).toBe(0);
  });

  it('returns assignees from attack.assignees', () => {
    const attack = buildAttack({
      assignees: ['uid-1', 'uid-2'],
    });

    const { result } = renderHook(() => useHeaderData(attack));

    expect(result.current.assignees).toEqual(['uid-1', 'uid-2']);
  });

  it('returns empty assignees when field is missing', () => {
    const attack = buildAttack();

    const { result } = renderHook(() => useHeaderData(attack));

    expect(result.current.assignees).toEqual([]);
  });

  it('returns originalAlertIds computed from alertIds and replacements', () => {
    const replacements = { 'uuid-1': 'real-id-1' };
    const attack = buildAttack({
      alertIds: ['uuid-1'],
      replacements,
    });

    const mockGetOriginalAlertIds = jest.mocked(getOriginalAlertIds);
    mockGetOriginalAlertIds.mockReturnValue(['real-id-1']);

    const { result } = renderHook(() => useHeaderData(attack));

    expect(getOriginalAlertIds).toHaveBeenCalledWith({
      alertIds: ['uuid-1'],
      replacements,
    });
    expect(result.current.originalAlertIds).toEqual(['real-id-1']);
  });

  it('returns empty originalAlertIds when alertIds is empty', () => {
    const attack = buildAttack({ alertIds: [] });

    const { result } = renderHook(() => useHeaderData(attack));

    expect(getOriginalAlertIds).toHaveBeenCalledWith({
      alertIds: [],
      replacements: {},
    });
    expect(result.current.originalAlertIds).toEqual([]);
  });
});
