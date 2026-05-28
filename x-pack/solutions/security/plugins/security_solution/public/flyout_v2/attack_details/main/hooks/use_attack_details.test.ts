/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import {
  transformAttackDiscoveryAlertDocumentToApi,
  transformAttackDiscoveryAlertFromApi,
} from '@kbn/elastic-assistant-common';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getTimelineFieldsDataFromHit } from '@kbn/timelines-plugin/common';
import { useAttackDetails } from './use_attack_details';

jest.mock('@kbn/elastic-assistant-common', () => {
  const actual = jest.requireActual('@kbn/elastic-assistant-common');
  return {
    ...actual,
    transformAttackDiscoveryAlertDocumentToApi: jest.fn(),
    transformAttackDiscoveryAlertFromApi: jest.fn(),
  };
});

jest.mock('@kbn/timelines-plugin/common', () => {
  const actual = jest.requireActual('@kbn/timelines-plugin/common');
  return {
    ...actual,
    getTimelineFieldsDataFromHit: jest.fn(),
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
const mockGetTimelineFieldsDataFromHit = getTimelineFieldsDataFromHit as jest.Mock;
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
const buildHit = (
  rawId = 'attack-1',
  index = '.alerts-default',
  source: Record<string, unknown> = {}
): DataTableRecord => ({
  id: `${index}::${rawId}::`,
  raw: { _id: rawId, _index: index, _source: source },
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
    mockGetTimelineFieldsDataFromHit.mockReturnValue([
      { category: 'test', field: 'test', values: [] },
    ]);
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

  it('derives dataFormattedForFieldBrowser locally from the fetched searchHit via getTimelineFieldsDataFromHit', () => {
    const searchHit = createSearchHit({ 'kibana.alert.attack_discovery.title': 'Test attack' });
    useTimelineEventsDetails.mockReturnValue([false, [], searchHit, null, mockRefetch]);
    mockGetTimelineFieldsDataFromHit.mockReturnValue([
      { category: 'derived', field: 'derived', values: ['x'] },
    ]);

    const { result } = renderHook(() => useAttackDetails(buildHit()));

    expect(mockGetTimelineFieldsDataFromHit).toHaveBeenCalledWith(searchHit);
    expect(result.current.dataFormattedForFieldBrowser).toEqual([
      { category: 'derived', field: 'derived', values: ['x'] },
    ]);
  });

  describe('when hit.raw._source is already populated', () => {
    const source = {
      'kibana.alert.attack_discovery.title': 'Test attack',
      'kibana.alert.attack_discovery.alert_ids': ['a-1'],
    };

    it('skips useTimelineEventsDetails and resolves loading=false synchronously', () => {
      const { result } = renderHook(() =>
        useAttackDetails(buildHit('attack-1', '.alerts-default', source))
      );

      expect(useTimelineEventsDetails).toHaveBeenCalledWith(
        expect.objectContaining({ skip: true })
      );
      expect(result.current.loading).toBe(false);
    });

    it('uses hit.raw as the searchHit (no fetch needed)', () => {
      const hit = buildHit('attack-1', '.alerts-default', source);

      const { result } = renderHook(() => useAttackDetails(hit));

      expect(result.current.searchHit).toBe(hit.raw);
    });

    it('derives dataFormattedForFieldBrowser locally from hit.raw via getTimelineFieldsDataFromHit', () => {
      const hit = buildHit('attack-1', '.alerts-default', source);
      mockGetTimelineFieldsDataFromHit.mockReturnValue([
        { category: 'local', field: 'local', values: ['x'] },
      ]);

      const { result } = renderHook(() => useAttackDetails(hit));

      expect(mockGetTimelineFieldsDataFromHit).toHaveBeenCalledWith(hit.raw);
      expect(result.current.dataFormattedForFieldBrowser).toEqual([
        { category: 'local', field: 'local', values: ['x'] },
      ]);
    });

    it('invokes the supplied refresh option when refetch is called', async () => {
      const refresh = jest.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useAttackDetails(buildHit('attack-1', '.alerts-default', source), { refresh })
      );

      await act(async () => {
        await result.current.refetch();
      });

      expect(refresh).toHaveBeenCalledTimes(1);
      // The hook's internal refetch must not be called when the fetch was
      // skipped.
      expect(mockRefetch).not.toHaveBeenCalled();
    });

    it('treats a missing refresh option as a silent no-op refetch', async () => {
      const { result } = renderHook(() =>
        useAttackDetails(buildHit('attack-1', '.alerts-default', source))
      );

      await expect(result.current.refetch()).resolves.toBeUndefined();
      expect(mockRefetch).not.toHaveBeenCalled();
    });
  });

  describe('when hit.raw._source is populated but not in the flat attack-discovery shape (timeline ECS path)', () => {
    // Timeline passes `eventData.raw._source = ecs` — a nested ECS object,
    // not the flat-dotted ES `_source` shape the transform expects. The
    // hook must fall back to the fetch so `transformAttackDiscoveryAlertDocumentToApi`
    // sees the keys it needs.
    const ecsLikeSource = {
      '@timestamp': '2024-01-01T00:00:00.000Z',
      kibana: { alert: { attack_discovery: { alert_ids: ['nested-id'] } } },
    };

    it('does NOT skip useTimelineEventsDetails — the populated _source lacks the flat attack-discovery alert_ids key', () => {
      renderHook(() => useAttackDetails(buildHit('attack-1', '.alerts-default', ecsLikeSource)));

      expect(useTimelineEventsDetails).toHaveBeenCalledWith(
        expect.objectContaining({ skip: false })
      );
    });
  });

  describe('when hit.raw._source is empty (Discover path)', () => {
    it('runs useTimelineEventsDetails and falls back to its values', () => {
      const fetched = createSearchHit({ 'kibana.alert.attack_discovery.title': 'Fetched' });
      useTimelineEventsDetails.mockReturnValue([false, [], fetched, null, mockRefetch]);

      const { result } = renderHook(() => useAttackDetails(buildHit()));

      expect(useTimelineEventsDetails).toHaveBeenCalledWith(
        expect.objectContaining({ skip: false })
      );
      expect(result.current.searchHit).toBe(fetched);
    });

    it('forwards refetch to the underlying primaryRefetch', async () => {
      const { result } = renderHook(() => useAttackDetails(buildHit()));

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
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
