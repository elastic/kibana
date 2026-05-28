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
import type { DataTableRecord } from '@kbn/discover-utils';
import { useAttackDetails } from './use_attack_details';

jest.mock('@kbn/elastic-assistant-common', () => {
  const actual = jest.requireActual('@kbn/elastic-assistant-common');
  return {
    ...actual,
    transformAttackDiscoveryAlertDocumentToApi: jest.fn(),
    transformAttackDiscoveryAlertFromApi: jest.fn(),
  };
});

jest.mock('../../../../data_view_manager/hooks/use_data_view', () => ({
  useDataView: () => ({ dataView: { getRuntimeMappings: () => ({}) } }),
}));

jest.mock('../../../../data_view_manager/hooks/use_browser_fields', () => ({
  useBrowserFields: () => ({}),
}));

jest.mock('../../../../timelines/containers/details', () => ({
  useTimelineEventsDetails: jest.fn(),
}));

jest.mock('../../../../flyout/document_details/shared/hooks/use_get_fields_data', () => ({
  useGetFieldsData: () => ({ getFieldsData: () => null }),
}));

const mockTransformDocumentToApi = transformAttackDiscoveryAlertDocumentToApi as jest.Mock;
const mockTransformFromApi = transformAttackDiscoveryAlertFromApi as jest.Mock;
const useTimelineEventsDetails = jest.requireMock('../../../../timelines/containers/details')
  .useTimelineEventsDetails as jest.Mock;

const mockRefetch = jest.fn();

const createSearchHit = (source: Record<string, unknown> | undefined, index?: string) =>
  source !== undefined ? { _id: 'attack-1', _index: index, _source: source } : undefined;

/**
 * `buildDataTableRecord` always builds the top-level `id` as the composite
 * `${_index}::${_id}::${_routing}`, while `raw._id` keeps the bare ES `_id`.
 * The fixture mirrors that shape so that the hook's `eventId` derivation is
 * exercised with the realistic two-shape input.
 */
const buildHit = (rawId = 'attack-1', index = '.alerts-default'): DataTableRecord => ({
  id: `${index}::${rawId}::`,
  raw: { _id: rawId, _index: index, _source: {} },
  flattened: {},
});

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

  it('passes the bare ES `_id` (not the composite `hit.id`) to useTimelineEventsDetails so the search strategy can match the document', () => {
    const searchHit = createSearchHit({ 'kibana.alert.attack_discovery.title': 'Test attack' });
    useTimelineEventsDetails.mockReturnValue([false, [], searchHit, null, mockRefetch]);

    renderHook(() => useAttackDetails(buildHit('attack-1', '.alerts-default')));

    expect(useTimelineEventsDetails).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'attack-1',
        indexName: '.alerts-default',
        skip: false,
      })
    );
  });

  it('skips the search when the underlying ES `_id` is missing, even when the composite `hit.id` is set', () => {
    useTimelineEventsDetails.mockReturnValue([false, [], undefined, null, mockRefetch]);

    const hitWithoutRawId: DataTableRecord = {
      id: '.alerts-default::attack-1::',
      raw: { _index: '.alerts-default', _source: {} },
      flattened: {},
    };

    renderHook(() => useAttackDetails(hitWithoutRawId));

    expect(useTimelineEventsDetails).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: '',
        skip: true,
      })
    );
  });

  it('returns non-null attackDiscovery when searchHit._source and attackId are present and transform succeeds', () => {
    const searchHit = createSearchHit({ 'kibana.alert.attack_discovery.title': 'Test attack' });
    useTimelineEventsDetails.mockReturnValue([false, [], searchHit, null, mockRefetch]);

    const { result } = renderHook(() => useAttackDetails(buildHit()));

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

    renderHook(() => useAttackDetails(buildHit('attack-1', '.attacks-default')));

    expect(mockTransformDocumentToApi).toHaveBeenCalledWith(
      expect.objectContaining({ index: '.attacks-default' })
    );
  });

  it('returns null attackDiscovery when searchHit is undefined', () => {
    useTimelineEventsDetails.mockReturnValue([false, [], undefined, null, mockRefetch]);

    const { result } = renderHook(() => useAttackDetails(buildHit()));

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

    const { result } = renderHook(() => useAttackDetails(buildHit()));

    expect(result.current.attack).toBeNull();
    expect(mockTransformDocumentToApi).not.toHaveBeenCalled();
  });

  it('returns null attack when attackId is empty', () => {
    const searchHit = createSearchHit({ 'kibana.alert.attack_discovery.title': 'Test' });
    useTimelineEventsDetails.mockReturnValue([false, [], searchHit, null, mockRefetch]);

    const emptyIdHit: DataTableRecord = {
      id: '',
      raw: { _id: '', _index: '.alerts-default', _source: {} },
      flattened: {},
    };

    const { result } = renderHook(() => useAttackDetails(emptyIdHit));

    expect(result.current.attack).toBeNull();
    expect(mockTransformDocumentToApi).not.toHaveBeenCalled();
  });

  it('returns null attack when transform throws', () => {
    const searchHit = createSearchHit({});
    useTimelineEventsDetails.mockReturnValue([false, [], searchHit, null, mockRefetch]);
    mockTransformDocumentToApi.mockImplementation(() => {
      throw new Error('Invalid document');
    });

    const { result } = renderHook(() => useAttackDetails(buildHit()));

    expect(result.current.attack).toBeNull();
  });

  describe('deduplication', () => {
    const getSkipFalseCallCount = () =>
      useTimelineEventsDetails.mock.calls.filter((call) => call[0]?.skip === false).length;

    it('deduplicates two hooks against the same key so only one underlying search runs', () => {
      renderHook(() => useAttackDetails(buildHit('attack-1', '.alerts-default')));
      renderHook(() => useAttackDetails(buildHit('attack-1', '.alerts-default')));

      expect(useTimelineEventsDetails).toHaveBeenCalledTimes(2);
      expect(getSkipFalseCallCount()).toBe(1);
      expect(useTimelineEventsDetails.mock.calls.some((call) => call[0]?.skip === true)).toBe(true);
    });

    it('clears the cache when the last subscriber unmounts', () => {
      const first = renderHook(() => useAttackDetails(buildHit('attack-1', '.alerts-default')));
      const second = renderHook(() => useAttackDetails(buildHit('attack-1', '.alerts-default')));

      first.unmount();
      second.unmount();

      useTimelineEventsDetails.mockClear();

      renderHook(() => useAttackDetails(buildHit('attack-1', '.alerts-default')));

      expect(useTimelineEventsDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: false,
        })
      );
    });

    it('hands off primary responsibility when the primary unmounts', () => {
      const primary = renderHook(() => useAttackDetails(buildHit('attack-1', '.alerts-default')));
      const secondary = renderHook(() => useAttackDetails(buildHit('attack-1', '.alerts-default')));

      expect(getSkipFalseCallCount()).toBe(1);

      primary.unmount();
      secondary.rerender();

      expect(useTimelineEventsDetails).toHaveBeenLastCalledWith(
        expect.objectContaining({
          skip: false,
        })
      );
    });

    it('does not deduplicate hooks with different cache keys', () => {
      renderHook(() => useAttackDetails(buildHit('attack-1', '.alerts-default')));
      renderHook(() => useAttackDetails(buildHit('attack-2', '.alerts-default')));

      expect(getSkipFalseCallCount()).toBe(2);
    });
  });
});
