/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useHeaderData } from './use_header_data';
import { useAttackDetailsContext } from '../context';
import { getField } from '../../document_details/shared/utils';

jest.mock('../context', () => ({
  useAttackDetailsContext: jest.fn(),
}));

jest.mock('../../document_details/shared/utils', () => ({
  getField: jest.fn(),
}));

describe('useHeaderData', () => {
  const getFieldsDataMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAttackDetailsContext as jest.Mock).mockReturnValue({
      getFieldsData: getFieldsDataMock,
    });
  });

  it('should return correct header data with single values', () => {
    getFieldsDataMock.mockImplementation((field: string) => {
      switch (field) {
        case 'kibana.alert.attack_discovery.title':
          return 'Test Attack';
        case '@timestamp':
          return '2025-12-16T12:00:00Z';
        case 'kibana.alert.attack_discovery.alert_ids':
          return 'alert-1';
        case 'kibana.alert.attack_discovery.replacements':
          return { key: 'value' };
        default:
          return null;
      }
    });

    (getField as jest.Mock).mockImplementation((value) => value);

    const { result } = renderHook(() => useHeaderData());

    expect(result.current.title).toBe('Test Attack');
    expect(result.current.timestamp).toBe('2025-12-16T12:00:00Z');
    expect(result.current.alertIds).toEqual(['alert-1']);
    expect(result.current.alertsCount).toBe(1);
    expect(result.current.replacements).toEqual({ key: 'value' });
  });

  it('should normalize alertIds array correctly', () => {
    getFieldsDataMock.mockImplementation((field: string) => {
      if (field === 'kibana.alert.attack_discovery.alert_ids') {
        return ['alert-1', 'alert-2'];
      }
      return null;
    });

    const { result } = renderHook(() => useHeaderData());

    expect(result.current.alertIds).toEqual(['alert-1', 'alert-2']);
    expect(result.current.alertsCount).toBe(2);
  });

  it('should return empty replacements when field is missing or string/array', () => {
    getFieldsDataMock.mockReturnValueOnce(null);

    const { result } = renderHook(() => useHeaderData());
    expect(result.current.replacements).toEqual({});
  });

  it('should return empty alertIds when value is null or undefined', () => {
    getFieldsDataMock.mockImplementation((field: string) => {
      if (field === 'kibana.alert.attack_discovery.alert_ids') {
        return null;
      }
      return null;
    });

    const { result } = renderHook(() => useHeaderData());
    expect(result.current.alertIds).toEqual([]);
    expect(result.current.alertsCount).toBe(0);
  });
});
