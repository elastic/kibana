/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { ALERTS_QUERY_NAMES } from '../../../../detections/containers/detection_engine/alerts/constants';
import { from, mockAlertsData, alertsByStatusQuery, parsedMockAlertsData, to } from './mock_data';
import type { UseAlertsByStatusProps } from './use_alerts_by_status';
import { useAlertsByStatus, ENTITY_ID_FIELD } from './use_alerts_by_status';
import { useUiSetting } from '../../../../common/lib/kibana';
import { useEntityStoreEuidApi } from '@kbn/entity-store/public';
import { useEntityFromStore } from '../../../../flyout/entity_details/shared/hooks/use_entity_from_store';

const dateNow = new Date('2022-04-08T12:00:00.000Z').valueOf();
const mockDateNow = jest.fn().mockReturnValue(dateNow);
Date.now = jest.fn(() => mockDateNow()) as unknown as DateConstructor['now'];

const defaultUseQueryAlertsReturn = {
  loading: false,
  data: null,
  setQuery: () => {},
  response: '',
  request: '',
  refetch: () => {},
};
const mockUseQueryAlerts = jest.fn().mockReturnValue(defaultUseQueryAlertsReturn);
jest.mock('../../../../detections/containers/detection_engine/alerts/use_query', () => {
  return {
    useQueryAlerts: (...props: unknown[]) => mockUseQueryAlerts(...props),
  };
});

const mockUseGlobalTime = jest
  .fn()
  .mockReturnValue({ from, to, setQuery: jest.fn(), deleteQuery: jest.fn() });
jest.mock('../../../../common/containers/use_global_time', () => {
  return {
    useGlobalTime: (...props: unknown[]) => mockUseGlobalTime(...props),
  };
});

jest.mock('../../../../flyout/entity_details/shared/hooks/use_entity_from_store', () => ({
  useEntityFromStore: jest.fn(() => ({
    entity: null,
    entityRecord: null,
    firstSeen: null,
    lastSeen: null,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  })),
}));

jest.mock('../../../../common/lib/kibana', () => {
  const actual = jest.requireActual('../../../../common/lib/kibana');
  return { ...actual, useUiSetting: jest.fn(() => false) };
});

jest.mock('@kbn/entity-store/public', () => ({
  FF_ENABLE_ENTITY_STORE_V2: 'securitySolution:entityStoreEnableV2',
  useEntityStoreEuidApi: jest.fn(() => undefined),
}));

const mockUseUiSetting = useUiSetting as jest.Mock;
const mockUseEntityStoreEuidApi = useEntityStoreEuidApi as jest.Mock;
const mockUseEntityFromStore = useEntityFromStore as jest.Mock;

// helper function to render the hook
const renderUseAlertsByStatus = (props: Partial<UseAlertsByStatusProps> = {}) =>
  renderHook(
    () =>
      useAlertsByStatus({
        identityFields: {},
        queryId: 'test',
        signalIndexName: 'signal-alerts',
        from,
        to,
        ...props,
      }),
    {
      wrapper: TestProviders,
    }
  );

describe('useAlertsByStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDateNow.mockReturnValue(dateNow);
    mockUseQueryAlerts.mockReturnValue(defaultUseQueryAlertsReturn);
    mockUseUiSetting.mockReturnValue(false);
    mockUseEntityStoreEuidApi.mockReturnValue(undefined);
    mockUseEntityFromStore.mockReturnValue({
      entity: null,
      entityRecord: null,
      firstSeen: null,
      lastSeen: null,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it('should return default values', () => {
    const { result } = renderUseAlertsByStatus();

    expect(result.current).toEqual({
      items: null,
      isLoading: false,
      updatedAt: dateNow,
    });
    expect(mockUseQueryAlerts).toBeCalledWith({
      query: alertsByStatusQuery,
      indexName: 'signal-alerts',
      skip: false,
      queryName: ALERTS_QUERY_NAMES.BY_STATUS,
    });
  });

  it('should return parsed items', () => {
    mockUseQueryAlerts.mockReturnValue({
      ...defaultUseQueryAlertsReturn,
      data: mockAlertsData,
    });

    const { result } = renderUseAlertsByStatus();

    expect(result.current).toEqual({
      items: parsedMockAlertsData,
      isLoading: false,
      updatedAt: dateNow,
    });
  });

  it('should return new updatedAt', () => {
    const newDateNow = new Date('2022-04-08T14:00:00.000Z').valueOf();
    mockDateNow.mockReturnValue(newDateNow); // setUpdatedAt call
    mockDateNow.mockReturnValueOnce(dateNow); // initialization call

    mockUseQueryAlerts.mockReturnValue({
      ...defaultUseQueryAlertsReturn,
      data: mockAlertsData,
    });

    const { result } = renderUseAlertsByStatus();

    expect(mockDateNow).toHaveBeenCalled();
    expect(result.current).toEqual({
      items: parsedMockAlertsData,
      isLoading: false,
      updatedAt: newDateNow,
    });
  });

  it('should skip the query', () => {
    const { result } = renderUseAlertsByStatus({ skip: true });

    expect(mockUseQueryAlerts).toBeCalledWith({
      query: alertsByStatusQuery,
      indexName: 'signal-alerts',
      skip: true,
      queryName: ALERTS_QUERY_NAMES.BY_STATUS,
    });

    expect(result.current).toEqual({
      items: null,
      isLoading: false,
      updatedAt: dateNow,
    });
  });

  it('should look up the entity store record when entity store v2 is enabled, entity.id is provided, and no entityRecord is given', () => {
    mockUseUiSetting.mockReturnValue(true);

    renderUseAlertsByStatus({
      entityType: 'host',
      identityFields: { [ENTITY_ID_FIELD]: 'host-entity-123', 'host.name': 'my-host' },
    });

    expect(mockUseEntityFromStore).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId: 'host-entity-123',
        entityType: 'host',
        skip: false,
      })
    );
  });

  it('should fall back to identity field term filters when entity store v2 is disabled and no entityRecord is provided', () => {
    const mockGetEuidFilterBasedOnDocument = jest.fn();
    mockUseUiSetting.mockReturnValue(false);
    mockUseEntityStoreEuidApi.mockReturnValue({
      euid: { dsl: { getEuidFilterBasedOnDocument: mockGetEuidFilterBasedOnDocument } },
    });

    renderUseAlertsByStatus({
      entityType: 'host',
      identityFields: { 'host.name': 'my-host' },
    });

    expect(mockGetEuidFilterBasedOnDocument).not.toHaveBeenCalled();
    expect(mockUseQueryAlerts).toBeCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          query: {
            bool: {
              filter: expect.arrayContaining([
                { bool: { filter: [{ term: { 'host.name': 'my-host' } }] } },
              ]),
            },
          },
        }),
      })
    );
  });

  it('should use entityRecord to build the filter when entityRecord is passed in', () => {
    const mockEntityRecord = { entity: { id: 'host-1' }, host: { name: 'my-host' } };
    const mockFilter = { term: { 'entity.id': 'host-1' } };
    const mockGetEuidFilterBasedOnDocument = jest.fn().mockReturnValue(mockFilter);
    mockUseUiSetting.mockReturnValue(true);
    mockUseEntityStoreEuidApi.mockReturnValue({
      euid: { dsl: { getEuidFilterBasedOnDocument: mockGetEuidFilterBasedOnDocument } },
    });

    renderUseAlertsByStatus({
      entityRecord: mockEntityRecord as never,
      entityType: 'host',
      identityFields: { 'host.name': 'my-host' },
    });

    expect(mockGetEuidFilterBasedOnDocument).toHaveBeenCalledWith('host', mockEntityRecord);
    expect(mockUseQueryAlerts).toBeCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          query: {
            bool: {
              filter: expect.arrayContaining([mockFilter]),
            },
          },
        }),
      })
    );
  });

  it('should include runtime_mappings in the query if provided', () => {
    const customRuntimeMappings = {
      'host.name.custom': {
        type: 'keyword',
      },
    };

    renderUseAlertsByStatus({ runtimeMappings: customRuntimeMappings });

    expect(mockUseQueryAlerts).toBeCalledWith(
      expect.objectContaining({
        query: {
          ...alertsByStatusQuery,
          runtime_mappings: customRuntimeMappings,
        },
        indexName: 'signal-alerts',
        skip: false,
        queryName: ALERTS_QUERY_NAMES.BY_STATUS,
      })
    );
  });
});
