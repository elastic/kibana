/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderHook } from '@testing-library/react';

import { mockQuery, mockAlertCountByRuleResult, parsedAlertCountByRuleResult } from './mock_data';
import type { UseAlertCountByRuleByStatusProps } from './use_alert_count_by_rule_by_status';
import {
  buildRuleAlertsByEntityQuery,
  useAlertCountByRuleByStatus,
} from './use_alert_count_by_rule_by_status';
import { buildEntityIdentifierTermFilters } from '../../../overview/components/detection_response/alerts_by_status/use_alerts_by_status';

const dateNow = new Date('2022-04-15T12:00:00.000Z').valueOf();
const mockDateNow = vi.fn().mockReturnValue(dateNow);
Date.now = vi.fn(() => mockDateNow()) as unknown as DateConstructor['now'];

const defaultUseQueryAlertsReturn = {
  loading: false,
  data: null,
  setQuery: () => {},
  response: '',
  request: '',
  refetch: () => {},
};

const mockUseQueryAlerts = vi.fn().mockReturnValue(defaultUseQueryAlertsReturn);
vi.mock('../../../detections/containers/detection_engine/alerts/use_query', () => {
  return {
    useQueryAlerts: (...props: unknown[]) => mockUseQueryAlerts(...props),
  };
});

vi.mock('../../../flyout/entity_details/shared/hooks/use_entity_from_store', () => {
      const mocked = {
      useEntityFromStore: vi.fn(() => ({
        entity: null,
        entityRecord: null,
        firstSeen: null,
        lastSeen: null,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      })),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../lib/kibana', () => {
      const mocked = {
      useUiSetting: vi.fn(() => false),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/entity-store/public', () => {
      const mocked = {
      FF_ENABLE_ENTITY_STORE_V2: 'securitySolution:entityStoreEnableV2',
      useEntityStoreEuidApi: vi.fn(() => undefined),
    };
      return { ...mocked, default: mocked };
    });

const from = '2020-07-07T08:20:18.966Z';
const to = '2020-07-08T08:20:18.966Z';

const mockUseGlobalTime = vi
  .fn()
  .mockReturnValue({ from, to, setQuery: vi.fn(), deleteQuery: vi.fn() });
vi.mock('../../containers/use_global_time', () => {
  return {
    useGlobalTime: (...props: unknown[]) => mockUseGlobalTime(...props),
  };
});

vi.mock('../../../detections/containers/detection_engine/alerts/use_signal_index', () => {
      const mocked = {
      useSignalIndex: () => ({ signalIndexName: 'signalIndexName' }),
    };
      return { ...mocked, default: mocked };
    });

const renderUseAlertCountByRuleByStatus = (
  overrides: Partial<UseAlertCountByRuleByStatusProps> = {}
) =>
  renderHook(() =>
    useAlertCountByRuleByStatus({
      skip: false,
      statuses: ['open'],
      queryId: 'queryId',
      signalIndexName: 'signalIndexName',
      ...overrides,
    })
  );

describe('useAlertCountByRuleByStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDateNow.mockReturnValue(dateNow);
    mockUseQueryAlerts.mockReturnValue(defaultUseQueryAlertsReturn);
  });

  it('should return default values', () => {
    const { result } = renderUseAlertCountByRuleByStatus();

    expect(result.current).toEqual({
      items: [],
      isLoading: false,
      updatedAt: dateNow,
    });

    expect(mockUseQueryAlerts).toHaveBeenCalledWith(mockQuery());
  });

  it('should return parsed items', () => {
    mockUseQueryAlerts.mockReturnValue({
      ...defaultUseQueryAlertsReturn,
      data: mockAlertCountByRuleResult,
    });

    const { result } = renderUseAlertCountByRuleByStatus();

    expect(result.current).toEqual({
      items: parsedAlertCountByRuleResult,
      isLoading: false,
      updatedAt: dateNow,
    });
  });

  it('should return new updatedAt', () => {
    const newDateNow = new Date('2022-04-08T14:00:00.000Z').valueOf();
    mockDateNow.mockReturnValue(newDateNow);
    mockDateNow.mockReturnValueOnce(dateNow);
    mockUseQueryAlerts.mockReturnValue({
      ...defaultUseQueryAlertsReturn,
      data: mockAlertCountByRuleResult,
    });

    const { result } = renderUseAlertCountByRuleByStatus();
    expect(mockDateNow).toHaveBeenCalled();
    expect(result.current).toEqual({
      items: parsedAlertCountByRuleResult,
      isLoading: false,
      updatedAt: newDateNow,
    });
  });

  it('should skip the query', () => {
    const { result } = renderUseAlertCountByRuleByStatus({ skip: true });

    expect(mockUseQueryAlerts).toHaveBeenCalledWith({ ...mockQuery(), skip: true });

    expect(result.current).toEqual({
      items: [],
      isLoading: false,
      updatedAt: dateNow,
    });
  });

  it('should filter by identityFields when provided', () => {
    renderUseAlertCountByRuleByStatus({
      identityFields: { 'host.id': 'host-uuid', 'host.name': 'hostname' },
    });

    expect(mockUseQueryAlerts).toHaveBeenCalledWith(
      expect.objectContaining({
        query: buildRuleAlertsByEntityQuery({
          from,
          to,
          statuses: ['open'],
          entityFilters: [
            buildEntityIdentifierTermFilters({ 'host.id': 'host-uuid', 'host.name': 'hostname' }),
          ],
        }),
      })
    );
  });
});
