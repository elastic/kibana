/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import { useFlyoutV2DocViewerState } from './use_flyout_v2_doc_viewer_state';
import type { UseFlyoutV2DocViewerStateParams } from './use_flyout_v2_doc_viewer_state';
import { flyoutV2DocViewerStateSchema } from './flyout_v2_doc_viewer_state_schema';
import type { FlyoutV2UrlParamValue } from './flyout_v2_url_param';
import { getFlyoutV2StateSink } from './flyout_v2_state_sink';
import { hasOpenFlyoutV2 } from './flyout_v2_url_writer';
import { useFlyoutApi } from '../../use_flyout_api';
import { createFlyoutApiMock } from '../../use_flyout_api.mock';
import { FLYOUT_ORIGIN } from '../../../common/lib/telemetry/events/flyout_v2/types';

jest.mock('../../use_flyout_api');
jest.mock('./flyout_v2_url_writer', () => ({ hasOpenFlyoutV2: jest.fn(() => false) }));

const mockFlyoutApi = createFlyoutApiMock();

const hit = {
  id: 'alert-1',
  raw: { _id: 'alert-1', _index: '.alerts-security.alerts-default' },
  flattened: {},
} as unknown as DataTableRecord;

const analyzerDescriptor = {
  kind: 'analyzer',
  documentId: 'alert-1',
  indexName: '.alerts-security.alerts-default',
} as const;
const hostDescriptor = { kind: 'host', hostName: 'web-01' } as const;

const renderDocViewerState = (props: Partial<UseFlyoutV2DocViewerStateParams> = {}) =>
  renderHook(() => useFlyoutV2DocViewerState({ hit, ...props }));

describe('useFlyoutV2DocViewerState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (useFlyoutApi as jest.Mock).mockReturnValue(mockFlyoutApi);
    (hasOpenFlyoutV2 as jest.Mock).mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('state sink', () => {
    it('reports flyout chain writes through onInitialStateChange', () => {
      const onInitialStateChange = jest.fn();
      renderDocViewerState({ onInitialStateChange });

      const sink = getFlyoutV2StateSink(DOC_VIEWER_FLYOUT_HISTORY_KEY);
      act(() => {
        sink?.write([analyzerDescriptor, hostDescriptor]);
      });

      expect(onInitialStateChange).toHaveBeenLastCalledWith({
        flyoutV2: [analyzerDescriptor, hostDescriptor],
      });
      expect(sink?.read()).toEqual([analyzerDescriptor, hostDescriptor]);

      act(() => {
        sink?.write(null);
      });

      expect(onInitialStateChange).toHaveBeenLastCalledWith({ flyoutV2: undefined });
      expect(sink?.read()).toEqual([]);
    });

    it('seeds the sink from the initial state', () => {
      renderDocViewerState({ initialState: { flyoutV2: [analyzerDescriptor] } });

      expect(getFlyoutV2StateSink(DOC_VIEWER_FLYOUT_HISTORY_KEY)?.read()).toEqual([
        analyzerDescriptor,
      ]);
    });

    it('unregisters the sink on unmount', () => {
      const { unmount } = renderDocViewerState();

      unmount();

      expect(getFlyoutV2StateSink(DOC_VIEWER_FLYOUT_HISTORY_KEY)).toBeUndefined();
    });
  });

  describe('restore', () => {
    it('reopens the flyout chain, reusing the displayed document for its tools', () => {
      renderDocViewerState({ initialState: { flyoutV2: [analyzerDescriptor, hostDescriptor] } });

      act(() => {
        jest.runAllTimers();
      });

      expect(mockFlyoutApi.openAnalyzer).toHaveBeenCalledWith({
        hit,
        origin: FLYOUT_ORIGIN.URL_RESTORE,
      });
      expect(mockFlyoutApi.openHostFlyoutAsChild).toHaveBeenCalledWith(
        expect.objectContaining({ hostName: 'web-01', origin: FLYOUT_ORIGIN.URL_RESTORE })
      );
    });

    it('falls back to the document flyout when a tool targets another document', () => {
      const otherDocument = { ...analyzerDescriptor, documentId: 'alert-2' };
      renderDocViewerState({ initialState: { flyoutV2: [otherDocument] } });

      act(() => {
        jest.runAllTimers();
      });

      expect(mockFlyoutApi.openAnalyzer).not.toHaveBeenCalled();
      expect(mockFlyoutApi.openDocumentFlyoutFromIndex).toHaveBeenCalledWith(
        expect.objectContaining({ documentId: 'alert-2' })
      );
    });

    it('does not reopen a chain that is already open', () => {
      (hasOpenFlyoutV2 as jest.Mock).mockReturnValue(true);
      renderDocViewerState({ initialState: { flyoutV2: [analyzerDescriptor] } });

      act(() => {
        jest.runAllTimers();
      });

      expect(mockFlyoutApi.openAnalyzer).not.toHaveBeenCalled();
    });

    it('restores only once when its dependencies change', () => {
      const { rerender } = renderDocViewerState({
        initialState: { flyoutV2: [analyzerDescriptor] },
      });

      act(() => {
        jest.runAllTimers();
      });

      const nextFlyoutApi = createFlyoutApiMock();
      (useFlyoutApi as jest.Mock).mockReturnValue(nextFlyoutApi);
      rerender();
      act(() => {
        jest.runAllTimers();
      });

      expect(mockFlyoutApi.openAnalyzer).toHaveBeenCalledTimes(1);
      expect(nextFlyoutApi.openAnalyzer).not.toHaveBeenCalled();
    });
  });
});

describe('flyoutV2DocViewerStateSchema', () => {
  it('accepts a root and child descriptor', () => {
    const state = { flyoutV2: [analyzerDescriptor, hostDescriptor] };

    expect(flyoutV2DocViewerStateSchema.safeParse(state)).toEqual({
      success: true,
      data: state,
    });
  });

  it('accepts string array fields', () => {
    const state: { flyoutV2: FlyoutV2UrlParamValue } = {
      flyoutV2: [{ kind: 'cspVulnerability', vulnerabilityId: ['CVE-1', 'CVE-2'] }],
    };

    expect(flyoutV2DocViewerStateSchema.safeParse(state).success).toBe(true);
  });

  it.each([
    ['an unknown kind', { flyoutV2: [{ kind: 'unknown', id: 'x' }] }],
    ['more than two descriptors', { flyoutV2: [hostDescriptor, hostDescriptor, hostDescriptor] }],
    ['an empty chain', { flyoutV2: [] }],
    ['an unbounded string', { flyoutV2: [{ kind: 'host', hostName: 'a'.repeat(1025) }] }],
    ['a non-string field', { flyoutV2: [{ kind: 'host', hostName: 42 }] }],
  ])('rejects %s', (_, state) => {
    expect(flyoutV2DocViewerStateSchema.safeParse(state).success).toBe(false);
  });
});
