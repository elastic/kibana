/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import type { InvestigationFlyoutTab } from '@kbn/agentic-investigations-common';
import { INVESTIGATION_FLYOUT_TABS } from '@kbn/agentic-investigations-common';

export const SELECTED_CONVERSATION_ID_PARAM = 'selectedConversationId';
export const SHOW_PARAM = 'show';

/** Tab a newly opened flyout lands on. Written into the URL rather than assumed. */
const DEFAULT_TAB: InvestigationFlyoutTab = 'overview';

const isFlyoutTab = (value: string | null): value is InvestigationFlyoutTab =>
  value !== null && INVESTIGATION_FLYOUT_TABS.includes(value as InvestigationFlyoutTab);

export interface ConversationsUrlParams {
  /** Conversation whose details flyout is open, from the URL. */
  selectedConversationId?: string;
  /**
   * Tab the flyout shows. Undefined while a bare conversation id is being completed, and for a
   * `show` the app does not recognize — an unrecognized tab opens nothing.
   */
  show?: InvestigationFlyoutTab;
  selectConversation: (id: string) => void;
  showTab: (tab: InvestigationFlyoutTab) => void;
  /** Closes the flyout, leaving a history entry so Back reopens it. */
  clearSelectedConversation: () => void;
  /**
   * Drops a conversation the queue does not have, without leaving a history entry. Back would
   * otherwise return to the bad id and re-run the not-found handling on every press.
   */
  dismissMissingConversation: () => void;
}

/**
 * Keeps the details flyout in the URL so it survives a reload, a shared link, and a round trip
 * through the chats page.
 *
 * Opening and closing push, so Back closes the flyout; switching tabs replaces, so a Back press
 * is not spent per tab.
 */
export const useConversationsUrlParams = (): ConversationsUrlParams => {
  const history = useHistory();
  const { pathname, search } = useLocation();

  const { selectedConversationId, show, hasShowParam } = useMemo(() => {
    const params = new URLSearchParams(search);
    const tab = params.get(SHOW_PARAM);

    return {
      selectedConversationId: params.get(SELECTED_CONVERSATION_ID_PARAM) ?? undefined,
      show: isFlyoutTab(tab) ? tab : undefined,
      // Distinguishes "no tab named" from "tab named but unrecognised"; only the former is
      // completed below. Kept internal, since callers only care whether they have a valid tab.
      hasShowParam: tab !== null,
    };
  }, [search]);

  const navigate = useCallback(
    (mutate: (params: URLSearchParams) => void, { replace }: { replace: boolean }) => {
      const params = new URLSearchParams(search);
      mutate(params);

      const nextSearch = params.toString();
      const location = { pathname, search: nextSearch ? `?${nextSearch}` : '' };

      if (replace) {
        history.replace(location);
      } else {
        history.push(location);
      }
    },
    [history, pathname, search]
  );

  const selectConversation = useCallback(
    (id: string) =>
      navigate(
        (params) => {
          params.set(SELECTED_CONVERSATION_ID_PARAM, id);
          // Written out rather than left implicit, so the URL always names the tab on screen and
          // is complete enough to share straight from the address bar.
          params.set(SHOW_PARAM, DEFAULT_TAB);
        },
        { replace: false }
      ),
    [navigate]
  );

  const showTab = useCallback(
    (tab: InvestigationFlyoutTab) =>
      navigate((params) => params.set(SHOW_PARAM, tab), { replace: true }),
    [navigate]
  );

  const clearParams = useCallback(
    (replace: boolean) =>
      navigate(
        (params) => {
          params.delete(SELECTED_CONVERSATION_ID_PARAM);
          params.delete(SHOW_PARAM);
        },
        { replace }
      ),
    [navigate]
  );

  const clearSelectedConversation = useCallback(() => clearParams(false), [clearParams]);
  const dismissMissingConversation = useCallback(() => clearParams(true), [clearParams]);

  // A link carrying only a conversation id is completed rather than ignored, so the address bar
  // always names the tab on screen. `replace`, not `push`: pushing would make Back return to the
  // bare URL, which would immediately complete itself again and trap the user. The ref keeps that
  // guarantee local instead of resting on the router reporting the new search synchronously.
  const completedIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (
      !selectedConversationId ||
      show ||
      hasShowParam ||
      completedIdRef.current === selectedConversationId
    ) {
      return;
    }
    completedIdRef.current = selectedConversationId;
    showTab(DEFAULT_TAB);
  }, [hasShowParam, selectedConversationId, show, showTab]);

  return {
    selectedConversationId,
    show,
    selectConversation,
    showTab,
    clearSelectedConversation,
    dismissMissingConversation,
  };
};
