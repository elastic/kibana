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

/** History entry state: how many flyouts are stacked on the investigation flyout at this entry. */
export const STACKED_FLYOUTS_STATE_KEY = 'alertZeroInvestigationStackedFlyouts';

/** Main flyout ids of the investigation flyout's history group, the investigation flyout first. */
const getGroupFlyoutIds = (): string[] =>
  getFlyoutManagerStore()
    .getState()
    .sessions.filter(({ historyKey }) => historyKey === CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY)
    .map(({ mainFlyoutId }) => mainFlyoutId);

const countStacked = (groupFlyoutIds: string[]): number => Math.max(groupFlyoutIds.length - 1, 0);

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

    let stacked = countStacked(getGroupFlyoutIds());

    // Stacked flyouts are not restored on reload or Forward, so the entry must not claim any.
    if (readStacked(history.location) > stacked) {
      history.replace(withStacked(history.location, stacked));
    }

    const unsubscribe = store.subscribe(() => {
      const groupFlyoutIds = getGroupFlyoutIds();
      const nextStacked = countStacked(groupFlyoutIds);
      if (nextStacked === stacked) {
        return;
      }
      stacked = nextStacked;

      // The whole group closed: the investigation flyout's own close updates the URL.
      if (groupFlyoutIds.length === 0 || !isThisInvestigation(history.location)) {
        return;
      }

      const entryStacked = readStacked(history.location);
      if (nextStacked > entryStacked) {
        for (let depth = entryStacked + 1; depth <= nextStacked; depth++) {
          history.push(withStacked(history.location, depth));
        }
      } else if (nextStacked < entryStacked) {
        // The flyout's own Back closed them: drop their entries too.
        history.go(nextStacked - entryStacked);
      }
    });

    const unlisten = history.listen((location, action) => {
      if (action !== 'POP' || !isThisInvestigation(location)) {
        return;
      }

      const entryStacked = readStacked(location);
      if (entryStacked < stacked) {
        const targetFlyoutId = getGroupFlyoutIds()[entryStacked];
        if (targetFlyoutId) {
          store.goToFlyout(targetFlyoutId, 'main');
        }
      } else if (entryStacked > stacked) {
        history.replace(withStacked(location, stacked));
      }
    });

    return () => {
      unsubscribe();
      unlisten();
    };
  }, [conversationId, history]);
};
