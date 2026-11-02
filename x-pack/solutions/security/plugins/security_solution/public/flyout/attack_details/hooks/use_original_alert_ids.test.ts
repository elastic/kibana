/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { getOriginalAlertIds } from '@kbn/elastic-assistant-common';
import { useOriginalAlertIds } from './use_original_alert_ids';
import { useAttackDetailsContext } from '../context';

jest.mock('../context', () => ({
  useAttackDetailsContext: jest.fn(),
}));

jest.mock('@kbn/elastic-assistant-common', () => ({
  getOriginalAlertIds: jest.fn(({ alertIds }: { alertIds: string[] }) => alertIds),
}));

describe('useOriginalAlertIds', () => {
  const getFieldsDataMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAttackDetailsContext as jest.Mock).mockReturnValue({
      getFieldsData: getFieldsDataMock,
    });
  });

  it('returns original alert IDs from getFieldsData and applies getOriginalAlertIds', () => {
    getFieldsDataMock.mockImplementation((field: string) => {
      if (field === 'kibana.alert.attack_discovery.alert_ids') return ['id1', 'id2'];
      if (field === 'kibana.alert.attack_discovery.replacements') return {};
      return null;
    });

    const { result } = renderHook(() => useOriginalAlertIds());

    expect(getOriginalAlertIds).toHaveBeenCalledWith({
      alertIds: ['id1', 'id2'],
      replacements: {},
    });
    expect(result.current).toEqual(['id1', 'id2']);
  });

  it('normalizes single string alert ID to array', () => {
    getFieldsDataMock.mockImplementation((field: string) => {
      if (field === 'kibana.alert.attack_discovery.alert_ids') return 'single-id';
      if (field === 'kibana.alert.attack_discovery.replacements') return {};
      return null;
    });

    const { result } = renderHook(() => useOriginalAlertIds());

    expect(getOriginalAlertIds).toHaveBeenCalledWith({
      alertIds: ['single-id'],
      replacements: {},
    });
    expect(result.current).toEqual(['single-id']);
  });

  it('uses empty replacements when value is invalid', () => {
    getFieldsDataMock.mockImplementation((field: string) => {
      if (field === 'kibana.alert.attack_discovery.alert_ids') return ['id1'];
      if (field === 'kibana.alert.attack_discovery.replacements') return null;
      return null;
    });

    renderHook(() => useOriginalAlertIds());

    expect(getOriginalAlertIds).toHaveBeenCalledWith({
      alertIds: ['id1'],
      replacements: {},
    });
  });

  it('passes replacements object when value is a record', () => {
    const replacements = { 'uuid-1': 'real-id-1' };
    getFieldsDataMock.mockImplementation((field: string) => {
      if (field === 'kibana.alert.attack_discovery.alert_ids') return ['uuid-1'];
      if (field === 'kibana.alert.attack_discovery.replacements') return replacements;
      return null;
    });

    const mockGetOriginalAlertIds = jest.mocked(getOriginalAlertIds);
    mockGetOriginalAlertIds.mockReturnValue(['real-id-1']);

    const { result } = renderHook(() => useOriginalAlertIds());

    expect(getOriginalAlertIds).toHaveBeenCalledWith({
      alertIds: ['uuid-1'],
      replacements,
    });
    expect(result.current).toEqual(['real-id-1']);
  });
});
