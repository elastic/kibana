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
const getCurrentChildId = () => store.getState().sessions.at(-1)?.childFlyoutId;
// Store updates sync the history in a microtask, which an async `act` flushes.
const actAsync = (callback: () => void) =>
  act(async () => {
    callback();
  });
const openInGroup = (flyoutId: string) =>
  actAsync(() => {
    store.addFlyout(flyoutId, flyoutId, 'main', 'm', CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY);
  });
const openChild = (flyoutId: string) =>
  actAsync(() => {
    store.addFlyout(flyoutId, flyoutId, 'child', 's');
  });
const readStacked = (history: MemoryHistory) =>
  (history.location.state as Record<string, unknown> | undefined)?.[STACKED_FLYOUTS_STATE_KEY];

const setup = (
  initialEntries: Array<{ pathname: string; search: string; state?: unknown }> = [
    QUEUE,
    INVESTIGATION,
  ],
  { canRewind = true }: { canRewind?: boolean } = {}
) => {
  const history = createMemoryHistory({ initialEntries, initialIndex: initialEntries.length - 1 });
  if (!canRewind) {
    // Like Kibana's scoped history after a reload: it cannot go back past the entry it loaded on.
    jest.spyOn(history, 'go').mockImplementation(() => {});
  }
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

  it('pushes a history entry for a flyout stacked on the investigation flyout', async () => {
    const { history } = setup();
    await openInGroup(INVESTIGATION_FLYOUT_ID);

    await openInGroup('entityFlyout');

    expect(history.index).toBe(2);
    expect(history.location.search).toBe(INVESTIGATION.search);
    expect(readStacked(history)).toBe(1);
  });

  it('does not push for the investigation flyout itself', async () => {
    const { history } = setup();

    await openInGroup(INVESTIGATION_FLYOUT_ID);

    expect(history.index).toBe(1);
  });

  it("returns to the investigation flyout on the browser's Back", async () => {
    const { history } = setup();
    await openInGroup(INVESTIGATION_FLYOUT_ID);
    await openInGroup('entityFlyout');

    await actAsync(() => history.goBack());

    expect(getSessionMainIds()).toEqual([INVESTIGATION_FLYOUT_ID]);
    expect(history.location.search).toBe(INVESTIGATION.search);
    expect(history.index).toBe(1);
  });

  it('steps back one stacked flyout at a time', async () => {
    const { history } = setup();
    await openInGroup(INVESTIGATION_FLYOUT_ID);
    await openInGroup('entityFlyout');
    await openInGroup('alertFlyout');

    await actAsync(() => history.goBack());

    expect(getSessionMainIds()).toEqual([INVESTIGATION_FLYOUT_ID, 'entityFlyout']);
    expect(readStacked(history)).toBe(1);
    expect(history.index).toBe(2);
  });

  it('does not push for the only child of a stacked flyout, which Back closes with it', async () => {
    const { history } = setup();
    await openInGroup(INVESTIGATION_FLYOUT_ID);
    await openInGroup('toolFlyout');

    await openChild('alertFlyout');

    expect(history.index).toBe(2);
    expect(readStacked(history)).toBe(1);
  });

  it("steps back through a stacked flyout's earlier children", async () => {
    const { history } = setup();
    await openInGroup(INVESTIGATION_FLYOUT_ID);
    await openInGroup('toolFlyout');
    await openChild('firstAlertFlyout');
    await openChild('secondAlertFlyout');
    expect(history.index).toBe(3);
    expect(readStacked(history)).toBe(2);

    await actAsync(() => history.goBack());

    expect(getSessionMainIds()).toEqual([INVESTIGATION_FLYOUT_ID, 'toolFlyout']);
    expect(getCurrentChildId()).toBe('firstAlertFlyout');
    expect(history.index).toBe(2);

    await actAsync(() => history.goBack());

    expect(getSessionMainIds()).toEqual([INVESTIGATION_FLYOUT_ID]);
    expect(history.index).toBe(1);
  });

  it('returns to an earlier child of a flyout below the top one', async () => {
    const { history } = setup();
    await openInGroup(INVESTIGATION_FLYOUT_ID);
    await openInGroup('toolFlyout');
    await openChild('firstAlertFlyout');
    await openChild('secondAlertFlyout');
    await openInGroup('entityFlyout');
    expect(history.index).toBe(4);

    await actAsync(() => history.go(-2));

    expect(getSessionMainIds()).toEqual([INVESTIGATION_FLYOUT_ID, 'toolFlyout']);
    expect(getCurrentChildId()).toBe('firstAlertFlyout');
    expect(history.index).toBe(2);
  });

  it("drops the stacked flyout's entry when the flyout's own Back closes it", async () => {
    const { history } = setup();
    await openInGroup(INVESTIGATION_FLYOUT_ID);
    await openInGroup('entityFlyout');

    await actAsync(() => store.goBack());

    expect(getSessionMainIds()).toEqual([INVESTIGATION_FLYOUT_ID]);
    expect(history.index).toBe(1);
    expect(readStacked(history) ?? 0).toBe(0);
  });

  it("drops an earlier child's entry when the flyout's own Back returns past it", async () => {
    const { history } = setup();
    await openInGroup(INVESTIGATION_FLYOUT_ID);
    await openInGroup('toolFlyout');
    await openChild('firstAlertFlyout');
    await openChild('secondAlertFlyout');

    await actAsync(() => store.goBack());

    expect(getCurrentChildId()).toBe('firstAlertFlyout');
    expect(history.index).toBe(2);
    expect(readStacked(history)).toBe(1);
  });

  it('leaves the history alone when the whole stack closes', async () => {
    const { history } = setup();
    await openInGroup(INVESTIGATION_FLYOUT_ID);
    await openInGroup('entityFlyout');

    await actAsync(() => store.closeAllFlyouts());

    expect(history.index).toBe(2);
  });

  it('returns to the entry of the open flyouts when landing on stacked flyouts that are gone', () => {
    const { history } = setup([
      QUEUE,
      INVESTIGATION,
      { ...INVESTIGATION, state: { [STACKED_FLYOUTS_STATE_KEY]: 1 } },
      { ...INVESTIGATION, state: { [STACKED_FLYOUTS_STATE_KEY]: 2 } },
    ]);

    expect(history.index).toBe(1);
    expect(readStacked(history) ?? 0).toBe(0);
  });

  it('stops claiming stacked flyouts that are gone when the history cannot rewind', async () => {
    const { history } = setup(
      [QUEUE, INVESTIGATION, { ...INVESTIGATION, state: { [STACKED_FLYOUTS_STATE_KEY]: 1 } }],
      { canRewind: false }
    );

    expect(history.index).toBe(2);
    expect(readStacked(history)).toBe(0);

    await openInGroup(INVESTIGATION_FLYOUT_ID);
    await openInGroup('entityFlyout');
    expect(history.index).toBe(3);

    await actAsync(() => history.goBack());

    expect(getSessionMainIds()).toEqual([INVESTIGATION_FLYOUT_ID]);
    expect(history.index).toBe(2);
  });

  it('does not claim a stacked flyout that is gone when going Forward onto its entry', async () => {
    const { history } = setup();
    await openInGroup(INVESTIGATION_FLYOUT_ID);
    await openInGroup('entityFlyout');
    await actAsync(() => history.goBack());

    await actAsync(() => history.goForward());

    expect(getSessionMainIds()).toEqual([INVESTIGATION_FLYOUT_ID]);
    expect(history.index).toBe(2);
    expect(readStacked(history)).toBe(0);
  });

  it('ignores the stack when no investigation is selected', async () => {
    const { history, rerender } = setup();
    rerender({ conversationId: undefined });

    await openInGroup(INVESTIGATION_FLYOUT_ID);
    await openInGroup('entityFlyout');

    expect(history.index).toBe(1);
  });
});
