/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import {
  transformAttackDiscoveryAlertDocumentToApi,
  transformAttackDiscoveryAlertFromApi,
} from '@kbn/elastic-assistant-common';
import { useAttackDetails } from './use_attack_details';

jest.mock('@kbn/elastic-assistant-common', () => {
  const actual = jest.requireActual('@kbn/elastic-assistant-common');
  return {
    ...actual,
    transformAttackDiscoveryAlertDocumentToApi: jest.fn(),
    transformAttackDiscoveryAlertFromApi: jest.fn(),
  };
});

jest.mock('../../../data_view_manager/hooks/use_data_view', () => ({
  useDataView: () => ({ dataView: { getRuntimeMappings: () => ({}) } }),
}));

jest.mock('../../../data_view_manager/hooks/use_browser_fields', () => ({
  useBrowserFields: () => ({}),
}));

jest.mock('../../../timelines/containers/details', () => ({
  useTimelineEventsDetails: jest.fn(),
}));

jest.mock('../../document_details/shared/hooks/use_get_fields_data', () => ({
  useGetFieldsData: () => ({ getFieldsData: () => null }),
}));

const mockTransformDocumentToApi = transformAttackDiscoveryAlertDocumentToApi as jest.Mock;
const mockTransformFromApi = transformAttackDiscoveryAlertFromApi as jest.Mock;
const useTimelineEventsDetails = jest.requireMock('../../../timelines/containers/details')
  .useTimelineEventsDetails as jest.Mock;

const mockRefetch = jest.fn();

const createSearchHit = (source: Record<string, unknown> | undefined) =>
  source !== undefined ? { _id: 'attack-1', _source: source } : undefined;

describe('useAttackDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTimelineEventsDetails.mockReturnValue([false, [], createSearchHit({}), null, mockRefetch]);
    mockTransformDocumentToApi.mockReturnValue({ alert_ids: [], title: 'Test' });
    mockTransformFromApi.mockReturnValue({
      id: 'attack-1',
      title: 'Test',
      alertIds: [],
      connectorId: 'test-connector',
      connectorName: 'Test Connector',
      detailsMarkdown: '# Details',
      generationUuid: 'test-uuid',
      summaryMarkdown: '# Summary',
      timestamp: new Date().toISOString(),
    } as AttackDiscoveryAlert);
  });

  it('returns non-null attackDiscovery when searchHit._source and attackId are present and transform succeeds', () => {
    const searchHit = createSearchHit({ 'kibana.alert.attack_discovery.title': 'Test attack' });
    useTimelineEventsDetails.mockReturnValue([false, [], searchHit, null, mockRefetch]);

    const { result } = renderHook(() =>
      useAttackDetails({ attackId: 'attack-1', indexName: '.alerts-default' })
    );

    expect(result.current.attackDiscovery).not.toBeNull();
    expect(result.current.attackDiscovery?.title).toBe('Test');
    expect(mockTransformDocumentToApi).toHaveBeenCalled();
    expect(mockTransformFromApi).toHaveBeenCalled();
  });

  it('returns null attackDiscovery when searchHit is undefined', () => {
    useTimelineEventsDetails.mockReturnValue([false, [], undefined, null, mockRefetch]);

    const { result } = renderHook(() =>
      useAttackDetails({ attackId: 'attack-1', indexName: '.alerts-default' })
    );

    expect(result.current.attackDiscovery).toBeNull();
    expect(mockTransformDocumentToApi).not.toHaveBeenCalled();
  });

  it('returns null attackDiscovery when searchHit._source is undefined', () => {
    useTimelineEventsDetails.mockReturnValue([
      false,
      [],
      { _id: 'attack-1', _source: undefined },
      null,
      mockRefetch,
    ]);

    const { result } = renderHook(() =>
      useAttackDetails({ attackId: 'attack-1', indexName: '.alerts-default' })
    );

    expect(result.current.attackDiscovery).toBeNull();
    expect(mockTransformDocumentToApi).not.toHaveBeenCalled();
  });

  it('returns null attackDiscovery when attackId is empty', () => {
    const searchHit = createSearchHit({ 'kibana.alert.attack_discovery.title': 'Test' });
    useTimelineEventsDetails.mockReturnValue([false, [], searchHit, null, mockRefetch]);

    const { result } = renderHook(() =>
      useAttackDetails({ attackId: '', indexName: '.alerts-default' })
    );

    expect(result.current.attackDiscovery).toBeNull();
    expect(mockTransformDocumentToApi).not.toHaveBeenCalled();
  });

  it('returns null attackDiscovery when transform throws', () => {
    const searchHit = createSearchHit({});
    useTimelineEventsDetails.mockReturnValue([false, [], searchHit, null, mockRefetch]);
    mockTransformDocumentToApi.mockImplementation(() => {
      throw new Error('Invalid document');
    });

    const { result } = renderHook(() =>
      useAttackDetails({ attackId: 'attack-1', indexName: '.alerts-default' })
    );

    expect(result.current.attackDiscovery).toBeNull();
  });
});
