/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { useFlyoutV2DocViewerState } from './use_flyout_v2_doc_viewer_state';
import type { UseFlyoutV2DocViewerStateParams } from './use_flyout_v2_doc_viewer_state';
import {
  claimDocViewerFlyoutChain,
  docViewerFlyoutChain,
  writeDocViewerFlyoutChain,
} from './flyout_v2_doc_viewer_chain';
import { useDocViewerFlyoutChainSessionKey } from './use_doc_viewer_flyout_chain_session_key';
import { useFlyoutApi } from '../../use_flyout_api';
import { createFlyoutApiMock } from '../../use_flyout_api.mock';
import { FLYOUT_ORIGIN } from '../../../common/lib/telemetry/events/flyout_v2/types';

jest.mock('../../use_flyout_api');

let mockDocViewerFlyoutId: string | undefined;
jest.mock('@kbn/unified-doc-viewer-plugin/public', () => ({
  useDocViewerFlyoutId: () => mockDocViewerFlyoutId,
}));

const mockFlyoutApi = createFlyoutApiMock();

const createHit = (id: string, index = '.alerts-security.alerts-default') =>
  ({
    id,
    raw: { _id: id, _index: index, fields: { 'kibana.alert.rule.name': ['rule'] } },
    flattened: {},
  } as unknown as DataTableRecord);

const hit = createHit('alert-1');

const analyzerDescriptor = {
  kind: 'analyzer',
  documentId: 'alert-1',
  indexName: '.alerts-security.alerts-default',
} as const;
const hostDescriptor = { kind: 'host', hostName: 'web-01' } as const;
const notesDescriptor = {
  kind: 'notes',
  documentId: 'alert-1',
  indexName: '.alerts-security.alerts-default',
} as const;

const getSessionKey = (record: DataTableRecord) =>
  renderHook(() => useDocViewerFlyoutChainSessionKey(record)).result.current;

const renderDocViewerState = (props: Partial<UseFlyoutV2DocViewerStateParams> = {}) =>
  renderHook(() => useFlyoutV2DocViewerState({ hit, ...props }));

const runTimers = () =>
  act(() => {
    jest.runAllTimers();
  });

describe('useFlyoutV2DocViewerState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (useFlyoutApi as jest.Mock).mockReturnValue(mockFlyoutApi);
    mockDocViewerFlyoutId = 'doc-viewer-1';
    docViewerFlyoutChain.sessionKey = undefined;
    docViewerFlyoutChain.isLive = false;
    docViewerFlyoutChain.stack = [];
    docViewerFlyoutChain.report = undefined;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('chain reporting', () => {
    it('reports flyout chain writes through onInitialStateChange while mounted', () => {
      const onInitialStateChange = jest.fn();
      renderDocViewerState({ onInitialStateChange });

      act(() => {
        writeDocViewerFlyoutChain([analyzerDescriptor, hostDescriptor], true);
      });

      expect(onInitialStateChange).toHaveBeenLastCalledWith({
        flyoutV2: [analyzerDescriptor, hostDescriptor],
      });

      act(() => {
        writeDocViewerFlyoutChain(null, false);
      });

      expect(onInitialStateChange).toHaveBeenLastCalledWith({ flyoutV2: undefined });
    });

    it('seeds the chain from the initial state', () => {
      renderDocViewerState({ initialState: { flyoutV2: [analyzerDescriptor] } });

      expect(docViewerFlyoutChain.stack).toEqual([analyzerDescriptor]);
    });

    it('keeps tracking the chain after unmount without calling the host', () => {
      const onInitialStateChange = jest.fn();
      const { unmount } = renderDocViewerState({
        onInitialStateChange,
        initialState: { flyoutV2: [analyzerDescriptor] },
      });
      runTimers();

      unmount();
      act(() => {
        writeDocViewerFlyoutChain(null, false);
      });

      expect(docViewerFlyoutChain.stack).toEqual([]);
      expect(docViewerFlyoutChain.report).toBeUndefined();
      expect(onInitialStateChange).not.toHaveBeenCalled();
    });
  });

  describe('remount in the same doc viewer session', () => {
    it('reports the live chain instead of reopening a flyout closed meanwhile', () => {
      const initialState = { flyoutV2: [analyzerDescriptor] };
      const first = renderDocViewerState({ initialState });
      runTimers();
      first.unmount();
      writeDocViewerFlyoutChain(null, false);
      mockFlyoutApi.openAnalyzer.mockClear();

      const onInitialStateChange = jest.fn();
      renderDocViewerState({ initialState, onInitialStateChange });
      runTimers();

      expect(onInitialStateChange).toHaveBeenCalledWith({ flyoutV2: undefined });
      expect(mockFlyoutApi.openAnalyzer).not.toHaveBeenCalled();
    });

    it('reports a chain opened meanwhile', () => {
      const first = renderDocViewerState();
      first.unmount();
      writeDocViewerFlyoutChain([analyzerDescriptor], true);

      const onInitialStateChange = jest.fn();
      renderDocViewerState({ onInitialStateChange });
      runTimers();

      expect(onInitialStateChange).toHaveBeenCalledWith({ flyoutV2: [analyzerDescriptor] });
      expect(mockFlyoutApi.openAnalyzer).not.toHaveBeenCalled();
    });

    it('reports flyouts opened from the doc viewer header before the first mount', () => {
      claimDocViewerFlyoutChain(getSessionKey(hit));
      writeDocViewerFlyoutChain([notesDescriptor], true);

      const onInitialStateChange = jest.fn();
      renderDocViewerState({
        initialState: { flyoutV2: [analyzerDescriptor] },
        onInitialStateChange,
      });
      runTimers();

      expect(onInitialStateChange).toHaveBeenCalledWith({ flyoutV2: [notesDescriptor] });
      expect(docViewerFlyoutChain.stack).toEqual([notesDescriptor]);
      expect(mockFlyoutApi.openAnalyzer).not.toHaveBeenCalled();
    });

    it('does not report when the host state already matches the chain', () => {
      const initialState = { flyoutV2: [analyzerDescriptor] };
      const first = renderDocViewerState({ initialState });
      runTimers();
      first.unmount();

      const onInitialStateChange = jest.fn();
      renderDocViewerState({ initialState, onInitialStateChange });

      expect(onInitialStateChange).not.toHaveBeenCalled();
    });
  });

  describe('restore', () => {
    it('reopens the flyout chain, reusing the displayed document for its tools', () => {
      renderDocViewerState({ initialState: { flyoutV2: [analyzerDescriptor, hostDescriptor] } });
      runTimers();

      expect(mockFlyoutApi.openAnalyzer).toHaveBeenCalledWith({
        hit,
        origin: FLYOUT_ORIGIN.URL_RESTORE,
      });
      expect(mockFlyoutApi.openHostFlyoutAsChild).toHaveBeenCalledWith(
        expect.objectContaining({ hostName: 'web-01', origin: FLYOUT_ORIGIN.URL_RESTORE })
      );
    });

    it('reuses the displayed attack for its tools, deriving their alert ids from it', () => {
      const attackHit = {
        ...createHit('attack-1', '.alerts-security.attack.discovery.alerts-default'),
        flattened: { 'kibana.alert.attack_discovery.alert_ids': ['a'] },
      } as DataTableRecord;
      renderHook(() =>
        useFlyoutV2DocViewerState({
          hit: attackHit,
          initialState: {
            flyoutV2: [
              {
                kind: 'attackCorrelations',
                attackId: 'attack-1',
                indexName: '.alerts-security.attack.discovery.alerts-default',
              },
            ],
          },
        })
      );
      runTimers();

      expect(mockFlyoutApi.openAttackCorrelations).toHaveBeenCalledWith(
        expect.objectContaining({ hit: attackHit, alertIds: ['a'] })
      );
    });

    it('rebuilds the displayed indicator for the IOC flyout', () => {
      const iocHit = createHit('indicator-1', 'logs-ti_abuse');
      renderHook(() =>
        useFlyoutV2DocViewerState({
          hit: iocHit,
          initialState: {
            flyoutV2: [
              { kind: 'ioc', indicatorId: 'indicator-1', indicatorIndex: 'logs-ti_abuse' },
            ],
          },
        })
      );
      runTimers();

      expect(mockFlyoutApi.openIocFlyout).toHaveBeenCalledWith(
        expect.objectContaining({
          indicator: expect.objectContaining({ _id: 'indicator-1', _index: 'logs-ti_abuse' }),
        })
      );
    });

    it('falls back to the document flyout when a tool targets another document', () => {
      const otherDocument = { ...analyzerDescriptor, documentId: 'alert-2' };
      renderDocViewerState({ initialState: { flyoutV2: [otherDocument] } });
      runTimers();

      expect(mockFlyoutApi.openAnalyzer).not.toHaveBeenCalled();
      expect(mockFlyoutApi.openDocumentFlyoutFromIndex).toHaveBeenCalledWith(
        expect.objectContaining({ documentId: 'alert-2' })
      );
    });

    it('restores a different document even if another one was tracked before', () => {
      claimDocViewerFlyoutChain(getSessionKey(createHit('alert-other')));
      writeDocViewerFlyoutChain([hostDescriptor], true);

      renderDocViewerState({ initialState: { flyoutV2: [analyzerDescriptor] } });
      runTimers();

      expect(docViewerFlyoutChain.sessionKey).toBe(getSessionKey(hit));
      expect(docViewerFlyoutChain.stack).toEqual([analyzerDescriptor]);
      expect(mockFlyoutApi.openAnalyzer).toHaveBeenCalledTimes(1);
    });

    it('restores the same document in another doc viewer instead of reusing its chain', () => {
      const first = renderDocViewerState();
      act(() => {
        writeDocViewerFlyoutChain([hostDescriptor], true);
      });
      first.unmount();

      // e.g. the document collapsed and expanded again, or shown in another Discover tab
      mockDocViewerFlyoutId = 'doc-viewer-2';
      const onInitialStateChange = jest.fn();
      renderDocViewerState({
        initialState: { flyoutV2: [analyzerDescriptor] },
        onInitialStateChange,
      });
      runTimers();

      expect(docViewerFlyoutChain.stack).toEqual([analyzerDescriptor]);
      expect(mockFlyoutApi.openAnalyzer).toHaveBeenCalledTimes(1);
      expect(onInitialStateChange).not.toHaveBeenCalled();
    });

    it('restores when only a flyout of a previous session closed in this one', () => {
      claimDocViewerFlyoutChain(getSessionKey(hit));
      writeDocViewerFlyoutChain(null, false);

      renderDocViewerState({ initialState: { flyoutV2: [analyzerDescriptor] } });
      runTimers();

      expect(mockFlyoutApi.openAnalyzer).toHaveBeenCalledTimes(1);
    });

    it("reopens a root opened as the doc viewer's child as its child", () => {
      renderDocViewerState({ initialState: { flyoutV2: [{ ...hostDescriptor, asChild: true }] } });
      runTimers();

      expect(mockFlyoutApi.openHostFlyoutAsChild).toHaveBeenCalledWith(
        expect.objectContaining({ hostName: 'web-01', origin: FLYOUT_ORIGIN.URL_RESTORE })
      );
      expect(mockFlyoutApi.openHostFlyout).not.toHaveBeenCalled();
    });

    it('restores only once when its dependencies change', () => {
      const { rerender } = renderDocViewerState({
        initialState: { flyoutV2: [analyzerDescriptor] },
      });
      runTimers();

      const nextFlyoutApi = createFlyoutApiMock();
      (useFlyoutApi as jest.Mock).mockReturnValue(nextFlyoutApi);
      rerender();
      runTimers();

      expect(mockFlyoutApi.openAnalyzer).toHaveBeenCalledTimes(1);
      expect(nextFlyoutApi.openAnalyzer).not.toHaveBeenCalled();
    });

    it('restores on the next mount when unmounted before the chain reopened', () => {
      const initialState = { flyoutV2: [analyzerDescriptor] };
      const first = renderDocViewerState({ initialState });
      first.unmount();
      runTimers();

      expect(mockFlyoutApi.openAnalyzer).not.toHaveBeenCalled();

      renderDocViewerState({ initialState });
      runTimers();

      expect(mockFlyoutApi.openAnalyzer).toHaveBeenCalledTimes(1);
    });
  });
});
