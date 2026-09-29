/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook } from '@testing-library/react';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import {
  transformAttackDiscoveryAlertDocumentToApi,
  transformAttackDiscoveryAlertFromApi,
} from '@kbn/elastic-assistant-common';
import { useAttackDetails } from './use_attack_details';

vi.mock('@kbn/elastic-assistant-common', async () => {
  const actual = (await vi.importActual('@kbn/elastic-assistant-common'));
  return {
    ...actual,
    transformAttackDiscoveryAlertDocumentToApi: vi.fn(),
    transformAttackDiscoveryAlertFromApi: vi.fn(),
  };
});

vi.mock('../../../data_view_manager/hooks/use_data_view', () => {
      const mocked = {
      useDataView: () => ({ dataView: { getRuntimeMappings: () => ({}) } }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../data_view_manager/hooks/use_browser_fields', () => {
      const mocked = {
      useBrowserFields: () => ({}),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../timelines/containers/details', () => {
      const mocked = {
      useTimelineEventsDetails: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../document_details/shared/hooks/use_get_fields_data', () => {
      const mocked = {
      useGetFieldsData: () => ({ getFieldsData: () => null }),
    };
      return { ...mocked, default: mocked };
    });

const mockTransformDocumentToApi = transformAttackDiscoveryAlertDocumentToApi as Mock;
const mockTransformFromApi = transformAttackDiscoveryAlertFromApi as Mock;
const useTimelineEventsDetails = (await vi.importMock('../../../timelines/containers/details'))
  .useTimelineEventsDetails as Mock;

const mockRefetch = vi.fn();

const createSearchHit = (source: Record<string, unknown> | undefined, index?: string) =>
  source !== undefined ? { _id: 'attack-1', _index: index, _source: source } : undefined;

describe('useAttackDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    expect(result.current.attack).not.toBeNull();
    expect(result.current.attack?.title).toBe('Test');
    expect(mockTransformDocumentToApi).toHaveBeenCalled();
    expect(mockTransformFromApi).toHaveBeenCalled();
  });

  it('passes searchHit._index to transformAttackDiscoveryAlertDocumentToApi so that attack.index is populated', () => {
    const searchHit = createSearchHit(
      { 'kibana.alert.attack_discovery.title': 'Test attack' },
      '.attacks-default'
    );
    useTimelineEventsDetails.mockReturnValue([false, [], searchHit, null, mockRefetch]);

    renderHook(() => useAttackDetails({ attackId: 'attack-1', indexName: '.alerts-default' }));

    expect(mockTransformDocumentToApi).toHaveBeenCalledWith(
      expect.objectContaining({ index: '.attacks-default' })
    );
  });

  it('returns null attackDiscovery when searchHit is undefined', () => {
    useTimelineEventsDetails.mockReturnValue([false, [], undefined, null, mockRefetch]);

    const { result } = renderHook(() =>
      useAttackDetails({ attackId: 'attack-1', indexName: '.alerts-default' })
    );

    expect(result.current.attack).toBeNull();
    expect(mockTransformDocumentToApi).not.toHaveBeenCalled();
  });

  it('returns null attack when searchHit._source is undefined', () => {
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

    expect(result.current.attack).toBeNull();
    expect(mockTransformDocumentToApi).not.toHaveBeenCalled();
  });

  it('returns null attack when attackId is empty', () => {
    const searchHit = createSearchHit({ 'kibana.alert.attack_discovery.title': 'Test' });
    useTimelineEventsDetails.mockReturnValue([false, [], searchHit, null, mockRefetch]);

    const { result } = renderHook(() =>
      useAttackDetails({ attackId: '', indexName: '.alerts-default' })
    );

    expect(result.current.attack).toBeNull();
    expect(mockTransformDocumentToApi).not.toHaveBeenCalled();
  });

  it('returns null attack when transform throws', () => {
    const searchHit = createSearchHit({});
    useTimelineEventsDetails.mockReturnValue([false, [], searchHit, null, mockRefetch]);
    mockTransformDocumentToApi.mockImplementation(() => {
      throw new Error('Invalid document');
    });

    const { result } = renderHook(() =>
      useAttackDetails({ attackId: 'attack-1', indexName: '.alerts-default' })
    );

    expect(result.current.attack).toBeNull();
  });
});
