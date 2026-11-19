/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import type { Location, LocationDescriptorObject } from 'history';
import { getFlyoutManagerStore } from '@elastic/eui';
import { CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY } from '@kbn/agent-builder-browser';
import { SELECTED_CONVERSATION_ID_PARAM } from './conversations_url_params';

/** History entry state: how many flyout Back steps sit on top of the investigation flyout at this entry. */
export const STACKED_FLYOUTS_STATE_KEY = 'alertZeroInvestigationStackedFlyouts';

/** A flyout stack the flyout's own Back can return to: a main flyout, with one of its earlier children. */
interface BackStep {
  mainFlyoutId: string;
  childFlyoutId?: string;
}

/**
 * The investigation flyout's history group as the flyout's own Back walks it, oldest first: each
 * session's earlier children (Back pops those first), then the session itself. A session's only
 * child is not a step of its own, since Back closes it together with its main flyout.
 */
const getBackSteps = (): BackStep[] =>
  getFlyoutManagerStore()
    .getState()
    .sessions.filter(({ historyKey }) => historyKey === CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY)
    .flatMap(({ mainFlyoutId, childHistory }) => [
      ...childHistory.map(({ flyoutId }) => ({ mainFlyoutId, childFlyoutId: flyoutId })),
      { mainFlyoutId },
    ]);

const countStacked = (steps: BackStep[]): number => Math.max(steps.length - 1, 0);

const asStateRecord = (state: unknown): Record<string, unknown> =>
  typeof state === 'object' && state !== null ? (state as Record<string, unknown>) : {};

const readStacked = ({ state }: Location): number => {
  const stacked = asStateRecord(state)[STACKED_FLYOUTS_STATE_KEY];
  return typeof stacked === 'number' ? stacked : 0;
};

const withStacked = (location: Location, stacked: number): LocationDescriptorObject => ({
  ...location,
  state: { ...asStateRecord(location.state), [STACKED_FLYOUTS_STATE_KEY]: stacked },
});

/**
 * Gives each flyout stacked on the investigation flyout (an Impact entity, an alert, ...) its own
 * browser history entry, so the browser's Back steps back one flyout, the same as the flyout's own
 * Back button, rather than closing the investigation underneath the stacked flyouts.
 *
 * Opening the investigation pushes the entry that Back closes it from (see
 * `useConversationsUrlParams`); entries pushed here keep that URL and only record the stack depth
 * in the entry state. The flyout's own Back rewinds the browser history to match.
 */
export const useInvestigationFlyoutBrowserHistory = (conversationId?: string): void => {
  const history = useHistory();

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    const store = getFlyoutManagerStore();
    const isThisInvestigation = ({ search }: Location) =>
      new URLSearchParams(search).get(SELECTED_CONVERSATION_ID_PARAM) === conversationId;

    // The depth of the entry the browser is on, or heading to: `history.go` lands asynchronously.
    let entryStacked = readStacked(history.location);

    // Scoped history cannot go back past the entry the app loaded on (`go` is then a no-op), so the
    // current entry is corrected first: it must not keep claiming flyouts if it stays current.
    const goToStacked = (stacked: number) => {
      const delta = stacked - entryStacked;
      entryStacked = stacked;
      history.replace(withStacked(history.location, stacked));
      history.go(delta);
    };

    // Stacked flyouts are not restored on reload, nor once their stack was closed (with its close
    // button, or by picking another investigation) and Back lands on their entries. Return to the
    // entry of the flyouts that are open, so Back is not spent on entries that change nothing.
    const openStacked = countStacked(getBackSteps());
    if (entryStacked > openStacked) {
      goToStacked(openStacked);
    }

    const syncHistory = () => {
      const steps = getBackSteps();
      // The whole group closed: the investigation flyout's own close updates the URL.
      if (steps.length === 0 || !isThisInvestigation(history.location)) {
        return;
      }

      const stacked = countStacked(steps);
      if (stacked > entryStacked) {
        for (let depth = entryStacked + 1; depth <= stacked; depth++) {
          history.push(withStacked(history.location, depth));
        }
      } else if (stacked < entryStacked) {
        // The flyout's own Back closed them: drop their entries too.
        goToStacked(stacked);
      }
    };

    // Moving to an earlier flyout can take several store updates (session, then child); sync the
    // history once they settle, rather than to each intermediate stack.
    let isSyncScheduled = false;
    let isDisposed = false;
    const unsubscribe = store.subscribe(() => {
      if (isSyncScheduled) {
        return;
      }
      isSyncScheduled = true;
      queueMicrotask(() => {
        isSyncScheduled = false;
        if (!isDisposed) {
          syncHistory();
        }
      });
    });

    const unlisten = history.listen((location, action) => {
      if (!isThisInvestigation(location)) {
        return;
      }
      entryStacked = readStacked(location);
      if (action !== 'POP') {
        return;
      }

      const steps = getBackSteps();
      const stacked = countStacked(steps);
      if (entryStacked < stacked) {
        const { mainFlyoutId, childFlyoutId } = steps[entryStacked];
        store.goToFlyout(mainFlyoutId, 'main');
        if (childFlyoutId) {
          store.goToFlyout(childFlyoutId, 'child');
        }
      } else if (entryStacked > stacked) {
        // Forward onto a flyout that is gone: rewinding would leave Forward stuck on this entry.
        entryStacked = stacked;
        history.replace(withStacked(location, stacked));
      }
    });

    return () => {
      isDisposed = true;
      unsubscribe();
      unlisten();
    };
  }, [conversationId, history]);
};
