/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';

import { buildFallbackIndexName, useTimelineEventsDetails } from '.';
import { useKibana } from '../../../common/lib/kibana';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';

jest.mock('../../../common/lib/kibana');
jest.mock('../../../common/hooks/use_app_toasts');

describe('buildFallbackIndexName', () => {
  it('inserts a wildcard before a plain index name', () => {
    expect(buildFallbackIndexName('packetbeat-8.0-2026.01.01')).toEqual(
      '*packetbeat-8.0-2026.01.01'
    );
  });

  it('inserts a wildcard before an index name that starts with a dot', () => {
    expect(buildFallbackIndexName('.ds-logs-windows.forwarded-default-2026.05.17-012831')).toEqual(
      '*.ds-logs-windows.forwarded-default-2026.05.17-012831'
    );
  });

  it('preserves a cross-cluster alias and inserts the wildcard after it', () => {
    expect(
      buildFallbackIndexName('sysapp:.ds-logs-windows.forwarded-default-2026.05.17-012831')
    ).toEqual('sysapp:*.ds-logs-windows.forwarded-default-2026.05.17-012831');
  });

  it('broadens each entry of a comma-separated list independently', () => {
    expect(buildFallbackIndexName('.ds-logs-a,sysapp:.ds-logs-b')).toEqual(
      '*.ds-logs-a,sysapp:*.ds-logs-b'
    );
  });
});

/**
 * Regression coverage for SDH https://github.com/elastic/sdh-security-team/issues/1666.
 *
 * When a document lookup uses an index name that has gone stale (e.g. the source index was moved to
 * a searchable-snapshot tier and renamed with a `restored-`/`partial-` prefix), the primary lookup
 * finds no document. The hook then retries once against a broadened index pattern derived from the
 * same index name, which matches the prefixed variant.
 */
const STALE_INDEX = 'sysapp:.ds-logs-windows.forwarded-default-2026.05.17-012831';
const BROADENED_INDEX = 'sysapp:*.ds-logs-windows.forwarded-default-2026.05.17-012831';
const EVENT_ID = 'AZ40wHwLBhzc64FIlyCY';

const foundHit = {
  _id: EVENT_ID,
  _index: 'sysapp:restored-.ds-logs-windows.forwarded-default-2026.05.17-012831',
  fields: { '@timestamp': ['2026-05-17T01:28:31.000Z'] },
};

const emptyResponse = {
  isRunning: false,
  isPartial: false,
  rawResponse: { hits: { hits: [] } },
  data: [],
  ecs: null,
};

const foundResponse = {
  isRunning: false,
  isPartial: false,
  rawResponse: { hits: { hits: [foundHit] } },
  data: [{ field: '@timestamp', values: ['2026-05-17T01:28:31.000Z'] }],
  ecs: { _id: EVENT_ID },
};

const addError = jest.fn();

// Emits `next`/`error` asynchronously (like the real search service) and returns a Subscription.
const asyncObservable = (emit: (handlers: { next: Function; error: Function }) => void) => ({
  subscribe: (handlers: { next: Function; error: Function }) => {
    const timer = setTimeout(() => emit(handlers), 0);
    return { unsubscribe: jest.fn(() => clearTimeout(timer)) };
  },
});

// Builds a `data.search.search` mock whose outcome is decided per requested index name.
const mockSearch = (outcomeFor: (indexName: string) => 'found' | 'empty' | 'error') => {
  const search = jest.fn((request: { indexName: string }) =>
    asyncObservable(({ next, error }) => {
      const outcome = outcomeFor(request.indexName);
      if (outcome === 'found') {
        next(foundResponse);
      } else if (outcome === 'error') {
        error(new Error("Cannot read properties of undefined (reading 'fields')"));
      } else {
        next(emptyResponse);
      }
    })
  );

  (useKibana as jest.Mock).mockReturnValue({ services: { data: { search: { search } } } });
  return search;
};

const renderDetails = () =>
  renderHook(() =>
    useTimelineEventsDetails({
      indexName: STALE_INDEX,
      eventId: EVENT_ID,
      runtimeMappings: {},
      skip: false,
    })
  );

describe('useTimelineEventsDetails - broadened index retry (SDH #1666)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAppToasts as jest.Mock).mockReturnValue({ addError });
  });

  it('retries against the broadened index and resolves the document when the primary index returns no hit', async () => {
    const search = mockSearch((indexName) => (indexName === BROADENED_INDEX ? 'found' : 'empty'));

    const { result } = renderDetails();

    await waitFor(() => expect(result.current[2]).toEqual(foundHit));

    // Two calls: primary (stale) then the broadened pattern.
    expect(search).toHaveBeenCalledTimes(2);
    expect(search.mock.calls[0][0]).toEqual(expect.objectContaining({ indexName: STALE_INDEX }));
    expect(search.mock.calls[1][0]).toEqual(
      expect.objectContaining({ indexName: BROADENED_INDEX })
    );
    expect(addError).not.toHaveBeenCalled();
  });

  it('retries against the broadened index when the primary lookup errors', async () => {
    const search = mockSearch((indexName) => (indexName === BROADENED_INDEX ? 'found' : 'error'));

    const { result } = renderDetails();

    await waitFor(() => expect(result.current[2]).toEqual(foundHit));
    expect(search).toHaveBeenCalledTimes(2);
    expect(addError).not.toHaveBeenCalled();
  });

  it('does not retry when the primary lookup succeeds', async () => {
    const search = mockSearch(() => 'found');

    const { result } = renderDetails();

    await waitFor(() => expect(result.current[2]).toEqual(foundHit));
    expect(search).toHaveBeenCalledTimes(1);
  });

  it('retries at most once and surfaces the error when the broadened index also fails', async () => {
    const search = mockSearch(() => 'error');

    const { result } = renderDetails();

    await waitFor(() => expect(addError).toHaveBeenCalledTimes(1));
    // Exactly two calls proves the single-retry guard prevents an infinite loop.
    expect(search).toHaveBeenCalledTimes(2);
    expect(result.current[2]).toBeUndefined();
  });
});
