/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { ViewDocument } from './view_document';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../../common/constants';
import type { Ping } from '../../../../../../common/runtime_types';

const mockUseEsDocSearch = vi.fn().mockReturnValue([0, null, vi.fn()]);
vi.mock('@kbn/unified-doc-viewer-plugin/public', () => {
      const mocked = {
      useEsDocSearch: (args: unknown) => mockUseEsDocSearch(args),
      UnifiedDocViewer: () => null,
    };
      return { ...mocked, default: mocked };
    });

const mockLocalDataView = { id: 'local-dv', getIndexPattern: () => SYNTHETICS_INDEX_PATTERN };
vi.mock('../../../contexts/synthetics_data_view_context', () => {
      const mocked = {
      useSyntheticsDataView: () => mockLocalDataView,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../../hooks/use_date_format', () => {
      const mocked = {
      useDateFormat: () => (s: string) => `formatted:${s}`,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../monitors_page/overview/overview/monitor_detail_flyout', () => {
      const mocked = {
      LoadingState: () => null,
    };
      return { ...mocked, default: mocked };
    });

const mockDataViewsCreate = vi.fn();
vi.mock('@kbn/kibana-react-plugin/public', () => {
      const mocked = {
      useKibana: () => ({
        services: {
          dataViews: { create: mockDataViewsCreate },
        },
      }),
    };
      return { ...mocked, default: mocked };
    });

// useFetcher runs the producer once on mount in this minimal stub. Tests that
// need the error path mutate mockFetcherReturn before rendering.
const mockFetcherProducers: Array<() => Promise<unknown>> = [];
let mockFetcherReturn: { data?: unknown; loading: boolean; error?: Error | undefined } = {
  data: undefined,
  loading: true,
  error: undefined,
};
vi.mock('@kbn/observability-shared-plugin/public', () => {
      const mocked = {
      useFetcher: (producer: () => Promise<unknown>) => {
        mockFetcherProducers.push(producer);
        return mockFetcherReturn;
      },
    };
      return { ...mocked, default: mocked };
    });

const basePing: Ping = {
  docId: 'doc-1',
  '@timestamp': '2024-01-01T00:00:00.000Z',
  monitor: {
    id: 'mon-1',
    name: 'mon',
    type: 'http',
    status: 'up',
    check_group: 'cg',
    duration: { us: 0 },
  },
  observer: { geo: { name: 'us-east' }, name: 'us-east' },
} as unknown as Ping;

const remotePing: Ping = { ...basePing, remote: { remoteName: 'cluster1' } } as unknown as Ping;

describe('ViewDocument', () => {
  beforeEach(() => {
    mockUseEsDocSearch.mockClear();
    mockDataViewsCreate.mockReset();
    mockFetcherProducers.length = 0;
    mockFetcherReturn = { data: undefined, loading: true, error: undefined };
  });

  it('targets the local synthetics index and the local data view for a local ping', () => {
    render(<ViewDocument ping={basePing} />);

    expect(mockUseEsDocSearch).toHaveBeenCalledTimes(1);
    const args = mockUseEsDocSearch.mock.calls[0][0];
    expect(args.index).toBe(SYNTHETICS_INDEX_PATTERN);
    expect(args.dataView).toBe(mockLocalDataView);
    expect(args.id).toBe('doc-1');
  });

  it('does not create an ad-hoc data view for local pings', () => {
    render(<ViewDocument ping={basePing} />);

    // useFetcher's producer is captured by the mock; for the local case
    // running it should be a no-op (indexPattern is undefined).
    expect(mockFetcherProducers).toHaveLength(1);
    return mockFetcherProducers[0]().then((result) => {
      expect(result).toBeUndefined();
      expect(mockDataViewsCreate).not.toHaveBeenCalled();
    });
  });

  it('targets the CCS-prefixed index for a remote ping', () => {
    render(<ViewDocument ping={remotePing} />);

    expect(mockUseEsDocSearch).toHaveBeenCalledTimes(1);
    const args = mockUseEsDocSearch.mock.calls[0][0];
    expect(args.index).toBe(`cluster1:${SYNTHETICS_INDEX_PATTERN}`);
  });

  it('builds an ad-hoc DataView for remote pings via dataViews.create', () => {
    const adHocDataView = { id: 'remote-dv' };
    mockDataViewsCreate.mockResolvedValueOnce(adHocDataView);

    render(<ViewDocument ping={remotePing} />);

    expect(mockFetcherProducers).toHaveLength(1);
    return mockFetcherProducers[0]().then((result) => {
      expect(mockDataViewsCreate).toHaveBeenCalledWith({
        title: `cluster1:${SYNTHETICS_INDEX_PATTERN}`,
      });
      expect(result).toBe(adHocDataView);
    });
  });

  it('skips the ES doc search until the ad-hoc remote DataView has resolved', () => {
    render(<ViewDocument ping={remotePing} />);

    const args = mockUseEsDocSearch.mock.calls[0][0];
    expect(args.skip).toBe(true);
  });

  it('surfaces an inline error callout when the remote DataView build fails', () => {
    mockFetcherReturn = {
      data: undefined,
      loading: false,
      error: new Error('remote cluster unavailable'),
    };

    const { getByTestId } = render(<ViewDocument ping={remotePing} />);

    fireEvent.click(getByTestId('syntheticsViewDocumentButton'));

    expect(document.body.textContent).toContain('Unable to load document from remote cluster');
    expect(document.body.textContent).toContain('remote cluster unavailable');
  });
});
