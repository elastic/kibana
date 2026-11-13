/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { createMemoryHistory, type MemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import { getFlyoutManagerStore } from '@elastic/eui';
import { CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY } from '@kbn/agent-builder-browser';
import {
  STACKED_FLYOUTS_STATE_KEY,
  useInvestigationFlyoutBrowserHistory,
} from './use_investigation_flyout_browser_history';

const store = getFlyoutManagerStore();
const INVESTIGATION_FLYOUT_ID = 'investigationFlyout';
const QUEUE = { pathname: '/', search: '' };
const INVESTIGATION = { pathname: '/', search: '?selectedConversationId=conversation-1' };

const getSessionMainIds = () => store.getState().sessions.map(({ mainFlyoutId }) => mainFlyoutId);
const openInGroup = (flyoutId: string) =>
  act(() => {
    store.addFlyout(flyoutId, flyoutId, 'main', 'm', CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY);
  });
const readStacked = (history: MemoryHistory) =>
  (history.location.state as Record<string, unknown> | undefined)?.[STACKED_FLYOUTS_STATE_KEY];

const setup = (
  initialEntries: Array<{ pathname: string; search: string; state?: unknown }> = [
    QUEUE,
    INVESTIGATION,
  ]
) => {
  const history = createMemoryHistory({ initialEntries, initialIndex: initialEntries.length - 1 });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Router history={history}>{children}</Router>
  );
  const hook = renderHook<void, { conversationId?: string }>(
    ({ conversationId }) => useInvestigationFlyoutBrowserHistory(conversationId),
    { wrapper, initialProps: { conversationId: 'conversation-1' } }
  );
  return { history, ...hook };
};

describe('useInvestigationFlyoutBrowserHistory', () => {
  afterEach(() => {
    act(() => {
      while (store.getState().sessions.length > 0) {
        store.closeAllFlyouts();
      }
    });
  });

  it('pushes a history entry for a flyout stacked on the investigation flyout', () => {
    const { history } = setup();
    openInGroup(INVESTIGATION_FLYOUT_ID);

    openInGroup('entityFlyout');

    expect(history.index).toBe(2);
    expect(history.location.search).toBe(INVESTIGATION.search);
    expect(readStacked(history)).toBe(1);
  });

  it('does not push for the investigation flyout itself', () => {
    const { history } = setup();

    openInGroup(INVESTIGATION_FLYOUT_ID);

    expect(history.index).toBe(1);
  });

  it("returns to the investigation flyout on the browser's Back", () => {
    const { history } = setup();
    openInGroup(INVESTIGATION_FLYOUT_ID);
    openInGroup('entityFlyout');

    act(() => history.goBack());

    expect(getSessionMainIds()).toEqual([INVESTIGATION_FLYOUT_ID]);
    expect(history.location.search).toBe(INVESTIGATION.search);
    expect(history.index).toBe(1);
  });

  it('steps back one stacked flyout at a time', () => {
    const { history } = setup();
    openInGroup(INVESTIGATION_FLYOUT_ID);
    openInGroup('entityFlyout');
    openInGroup('alertFlyout');

    act(() => history.goBack());

    expect(getSessionMainIds()).toEqual([INVESTIGATION_FLYOUT_ID, 'entityFlyout']);
    expect(readStacked(history)).toBe(1);
  });

  it("drops the stacked flyout's entry when the flyout's own Back closes it", () => {
    const { history } = setup();
    openInGroup(INVESTIGATION_FLYOUT_ID);
    openInGroup('entityFlyout');

    act(() => store.goBack());

    expect(getSessionMainIds()).toEqual([INVESTIGATION_FLYOUT_ID]);
    expect(history.index).toBe(1);
    expect(readStacked(history) ?? 0).toBe(0);
  });

  it('leaves the history alone when the whole stack closes', () => {
    const { history } = setup();
    openInGroup(INVESTIGATION_FLYOUT_ID);
    openInGroup('entityFlyout');

    act(() => store.closeAllFlyouts());

    expect(history.index).toBe(2);
  });

  it('does not claim stacked flyouts that were not restored', () => {
    const { history } = setup([
      QUEUE,
      { ...INVESTIGATION, state: { [STACKED_FLYOUTS_STATE_KEY]: 2 } },
    ]);

    expect(readStacked(history)).toBe(0);
    expect(history.index).toBe(1);
  });

  it('ignores the stack when no investigation is selected', () => {
    const { history, rerender } = setup();
    rerender({ conversationId: undefined });

    openInGroup(INVESTIGATION_FLYOUT_ID);
    openInGroup('entityFlyout');

    expect(history.index).toBe(1);
  });
});
