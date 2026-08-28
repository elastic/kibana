/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import { useFlyoutV2UrlWriter } from './flyout_v2_url_writer';
import { FLYOUT_V2_URL_PARAM } from './flyout_v2_url_param';
import { documentFlyoutHistoryKey } from '../constants/flyout_history';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const renderWriter = (
  history = createMemoryHistory(),
  urlParamKey: string = FLYOUT_V2_URL_PARAM
) => {
  const wrapper: React.FC<{ children?: React.ReactNode }> = ({ children }) =>
    React.createElement(Router, { history }, children as React.ReactElement);
  const { result } = renderHook(() => useFlyoutV2UrlWriter(urlParamKey, documentFlyoutHistoryKey), {
    wrapper,
  });
  return { result, history };
};

const getParam = (history: ReturnType<typeof createMemoryHistory>, key = FLYOUT_V2_URL_PARAM) =>
  new URLSearchParams(history.location.search).get(key);

const docDescriptor = (id: string) =>
  ({ kind: 'document' as const, documentId: id, indexName: 'idx' } as const);

const analyzerDescriptor = (id: string) =>
  ({ kind: 'analyzer' as const, documentId: id, indexName: 'idx' } as const);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useFlyoutV2UrlWriter', () => {
  describe('writeOnOpen — start mode (default)', () => {
    it('writes the descriptor to the URL', () => {
      const { result, history } = renderWriter();

      act(() => {
        result.current.writeOnOpen(docDescriptor('doc-1'));
      });

      expect(getParam(history)).not.toBeNull();
      expect(history.location.search).toContain('doc-1');
    });

    it('replaces any existing URL array with [descriptor]', () => {
      const { result, history } = renderWriter();

      act(() => {
        result.current.writeOnOpen(docDescriptor('doc-1'));
      });
      act(() => {
        result.current.writeOnOpen(analyzerDescriptor('doc-2'));
      });

      // URL should contain only the second descriptor
      expect(history.location.search).not.toContain('doc-1');
      expect(history.location.search).toContain('doc-2');
      expect(history.location.search).toContain('analyzer');
    });

    it('uses history.replace (not push): does not grow history.length', () => {
      const { result, history } = renderWriter();
      const initialLength = history.length;

      act(() => {
        result.current.writeOnOpen(docDescriptor('doc-1'));
      });
      act(() => {
        result.current.writeOnOpen(docDescriptor('doc-2'));
      });

      expect(history.length).toBe(initialLength);
    });
  });

  describe('writeOnOpen — inherit mode', () => {
    it('appends the descriptor to the existing URL array', () => {
      const { result, history } = renderWriter();

      act(() => {
        result.current.writeOnOpen(analyzerDescriptor('doc-1'));
      });
      act(() => {
        result.current.writeOnOpen(docDescriptor('doc-1'), 'inherit');
      });

      const raw = getParam(history);
      expect(raw).not.toBeNull();
      // Both kinds should appear in the rison-encoded array
      expect(history.location.search).toContain('analyzer');
      expect(history.location.search).toContain('document');
    });

    it('replaces the child (keeps the root) when inherit is called again — [root, newChild]', () => {
      const { result, history } = renderWriter();

      act(() => {
        result.current.writeOnOpen(analyzerDescriptor('tool-doc')); // root (tool), session start
      });
      act(() => {
        result.current.writeOnOpen(docDescriptor('child-1'), 'inherit'); // first child
      });
      act(() => {
        // A child opened from within the first child (e.g. tool -> document -> host) REPLACES the
        // previous child. The root is kept and the array stays capped at 2 — critically, it is the
        // NEWEST child that is kept, not dropped.
        result.current.writeOnOpen(docDescriptor('child-2'), 'inherit');
      });

      expect(getParam(history)).not.toBeNull();
      expect(history.location.search).toContain('tool-doc'); // root (analyzer) kept
      expect(history.location.search).toContain('child-2'); // newest child present
      expect(history.location.search).not.toContain('child-1'); // previous child replaced
    });
  });

  describe('buildOnClose — generation-guarded close', () => {
    it('clears the URL param when the fallback is null (top-level close)', () => {
      const { result, history } = renderWriter();

      let onClose!: () => void;
      act(() => {
        result.current.writeOnOpen(docDescriptor('doc-1'));
        onClose = result.current.buildOnClose(null);
      });

      act(() => {
        onClose();
      });

      expect(getParam(history)).toBeNull();
    });

    it('reverts to [fallback] when the flyout that opened it closes normally', () => {
      const { result, history } = renderWriter();

      let onClose!: () => void;
      act(() => {
        result.current.writeOnOpen(analyzerDescriptor('doc-1'));
        onClose = result.current.buildOnClose(docDescriptor('doc-1'));
      });

      act(() => {
        onClose();
      });

      expect(history.location.search).toContain('doc-1');
      expect(history.location.search).not.toContain('analyzer');
    });

    it('does NOT revert when a newer writeOnOpen superseded the current one (cascade-eviction)', () => {
      const { result, history } = renderWriter();

      let toolOnClose!: () => void;
      act(() => {
        result.current.writeOnOpen(analyzerDescriptor('doc-1'));
        toolOnClose = result.current.buildOnClose(docDescriptor('doc-1'));
      });

      // A newer flyout opens after the tool (e.g. clicking a node opens a child document)
      act(() => {
        result.current.writeOnOpen(docDescriptor('doc-2'));
      });

      // EUI cascades the tool's close as a side effect of the child opening
      act(() => {
        toolOnClose();
      });

      // The child's descriptor must still be in the URL — the tool's stale onClose is a no-op
      expect(history.location.search).toContain('doc-2');
      expect(history.location.search).not.toContain('analyzer');
    });

    it('does revert when it is the most-recent write and nothing newer has superseded it', () => {
      const { result, history } = renderWriter();

      let mainOnClose!: () => void;
      act(() => {
        result.current.writeOnOpen(docDescriptor('doc-1'));
        mainOnClose = result.current.buildOnClose(null);
      });

      act(() => {
        mainOnClose();
      });

      expect(getParam(history)).toBeNull();
    });

    it('most-recent-write wins: the last buildOnClose is the one that can revert', () => {
      const { result, history } = renderWriter();

      let firstOnClose!: () => void;
      let secondOnClose!: () => void;

      act(() => {
        result.current.writeOnOpen(docDescriptor('doc-1'));
        firstOnClose = result.current.buildOnClose(null);
      });
      act(() => {
        result.current.writeOnOpen(docDescriptor('doc-2'));
        secondOnClose = result.current.buildOnClose(docDescriptor('doc-1'));
      });

      // First onClose is now stale — should not revert
      act(() => {
        firstOnClose();
      });
      expect(history.location.search).toContain('doc-2');

      // Second onClose is current — should revert to doc-1
      act(() => {
        secondOnClose();
      });
      expect(history.location.search).toContain('doc-1');
    });

    it('clears the param when a root and its child both close together (full-session close)', () => {
      // Regression test: root (tool, session:'start') opens, then a child opens on top of it
      // (session:'inherit'). Closing the WHOLE session (root + child dismissed together, e.g. the
      // tools flyout is closed which also closes its child) must clear the param entirely — not
      // leave the child's revert-to-root fallback as a stale final state.
      const { result, history } = renderWriter();

      let rootOnClose!: () => void;
      let childOnClose!: () => void;

      act(() => {
        result.current.writeOnOpen(analyzerDescriptor('tool-doc')); // root (tool), session start
        rootOnClose = result.current.buildOnClose(null);
      });
      act(() => {
        result.current.writeOnOpen(docDescriptor('child-1'), 'inherit'); // child
        childOnClose = result.current.buildOnClose(analyzerDescriptor('tool-doc'));
      });

      // EUI fires the CHILD's cascade onClose first (reverts to [root] as an intermediate step)...
      act(() => {
        childOnClose();
      });
      expect(history.location.search).toContain('tool-doc');

      // ...then the ROOT's own onClose fires (the final close of the whole session) and must be
      // allowed to clear the param, even though its generation is older than the child's.
      act(() => {
        rootOnClose();
      });
      expect(getParam(history)).toBeNull();
    });

    it('does not let a stale eviction through just because a sibling happens to still be open', () => {
      // Guards against a naive "count reaches 0" only implementation: the evicted tool's onClose
      // must stay suppressed while the flyout that replaced it (doc-2) is still open.
      const { result, history } = renderWriter();

      let toolOnClose!: () => void;
      act(() => {
        result.current.writeOnOpen(analyzerDescriptor('doc-1'));
        toolOnClose = result.current.buildOnClose(docDescriptor('doc-1'));
      });
      act(() => {
        result.current.writeOnOpen(docDescriptor('doc-2')); // new root, evicts the tool
      });

      act(() => {
        toolOnClose(); // cascade-eviction side effect of doc-2 opening
      });

      expect(history.location.search).toContain('doc-2');
      expect(history.location.search).not.toContain('analyzer');
    });
  });

  describe('generation isolation across urlParamKey contexts', () => {
    it('a write on a different urlParamKey does NOT invalidate the current context onClose', () => {
      const historyA = createMemoryHistory();
      const { result: resultA } = renderWriter(historyA, FLYOUT_V2_URL_PARAM);
      const { result: resultB } = renderWriter(historyA, 'flyoutV2Timeline');

      let onCloseA!: () => void;
      act(() => {
        resultA.current.writeOnOpen(docDescriptor('doc-A'));
        onCloseA = resultA.current.buildOnClose(null);
      });

      // Write on a different param key (timeline context)
      act(() => {
        resultB.current.writeOnOpen(docDescriptor('doc-B'));
      });

      // onCloseA should still fire (its context was not superseded)
      act(() => {
        onCloseA();
      });

      expect(getParam(historyA, FLYOUT_V2_URL_PARAM)).toBeNull();
    });
  });

  describe('no-op when history is not usable', () => {
    it('writeOnOpen is a no-op when history has no location', () => {
      // Pass no Router wrapper — useHistory returns a minimal mock that lacks location
      // The hook degrades gracefully without throwing
      expect(() => {
        const wrapper: React.FC<{ children?: React.ReactNode }> = ({ children }) =>
          children as React.ReactElement;
        renderHook(() => useFlyoutV2UrlWriter(FLYOUT_V2_URL_PARAM, documentFlyoutHistoryKey), {
          wrapper,
        });
      }).not.toThrow();
    });
  });
});
