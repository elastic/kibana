/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTabbedContent,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiTabbedContentTab } from '@elastic/eui';
import { useHistory, useLocation } from 'react-router-dom';

import {
  buildLifecycleTabSearch,
  clearLifecycleSearch,
  isLifecycleTabId,
  readLifecycleTabId,
} from './helpers/lifecycle_search_params';
import { LifecycleOverviewTab } from './tabs/overview_tab';
import { LifecycleTimelineTab } from './tabs/timeline_tab';
import * as i18n from './translations';

export interface LifecycleFlyoutProps {
  correlationId: string;
}

/**
 * The overlay chrome for one discovery: a title, two tabs, and the two ways out.
 *
 * Two tabs per **decision 1** of the 2026-08-17 Experience/UX sync — Overview and Timeline. The three
 * tabs that used to sit between them are sections inside Overview; see `tabs/overview_tab` for which
 * went where and why.
 *
 * Split from `LifecycleFlyoutHost` so that everything below this point has a **definite**
 * `correlationId`. The host decides whether an overlay is open; this decides what it looks
 * like, and neither has to thread an `undefined` id through a tab that cannot render without one.
 *
 * Both the discovery and the active tab live in the location's search string rather than in state:
 * a reload reopens the tab the analyst was reading, and a lifecycle worth talking about can be
 * pasted into a chat and land on the right tab.
 *
 * Switching tabs `replace`s. Opening the overlay added exactly one history entry, so if a tab click
 * pushed another, Back would walk back through every tab visited instead of closing the overlay —
 * which is the one thing Back is for here.
 */
export const LifecycleFlyout: React.FC<LifecycleFlyoutProps> = ({ correlationId }) => {
  const history = useHistory();
  const { pathname, search } = useLocation();
  const titleId = useGeneratedHtmlId({ prefix: 'pndLifecycleFlyoutTitle' });

  const onClose = useCallback(() => {
    history.replace({ pathname, search: clearLifecycleSearch(search) });
  }, [history, pathname, search]);

  const onOpenFullPage = useCallback(() => {
    history.push({ pathname: `/executions/${encodeURIComponent(correlationId)}` });
  }, [correlationId, history]);

  const tabs: EuiTabbedContentTab[] = useMemo(
    () => [
      {
        content: <LifecycleOverviewTab correlationId={correlationId} />,
        'data-test-subj': 'pndLifecycleTab-overview',
        id: 'overview',
        name: i18n.TAB_OVERVIEW,
      },
      {
        content: <LifecycleTimelineTab correlationId={correlationId} />,
        'data-test-subj': 'pndLifecycleTab-timeline',
        id: 'timeline',
        name: i18n.TAB_TIMELINE,
      },
    ],
    [correlationId]
  );

  const selectedTabId = readLifecycleTabId(search);
  // `readLifecycleTabId` is total, so this only falls back if a tab id is ever removed from
  // `LIFECYCLE_TAB_IDS` without its tab being removed here.
  const selectedTab = tabs.find(({ id }) => id === selectedTabId) ?? tabs[0];

  const onTabClick = useCallback(
    ({ id }: EuiTabbedContentTab) => {
      if (!isLifecycleTabId(id)) {
        return;
      }

      history.replace({ pathname, search: buildLifecycleTabSearch(search, id) });
    },
    [history, pathname, search]
  );

  return (
    <EuiFlyout
      aria-labelledby={titleId}
      data-test-subj="pndLifecycleFlyout"
      onClose={onClose}
      ownFocus
      size="l"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>{i18n.FLYOUT_TITLE}</h2>
        </EuiTitle>
        <EuiText color="subdued" data-test-subj="pndLifecycleFlyoutSubtitle" size="xs">
          {i18n.flyoutSubtitle(correlationId)}
        </EuiText>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {/*
          ⛔ Never pass `autoFocus="selected"` here. `EuiTabbedContent` leaves
          `state.selectedTabId` **undefined** whenever it is controlled — the constructor only sets
          it when `props.selectedTab` is absent — but `focusTab` still runs
          `querySelector('#' + state.selectedTabId).focus()`. The first focus into the tab list then
          dereferences `null` and throws, and since the overlay sits inside the app's error boundary
          the entire PND app blanks out, not just the flyout. Measured in a real browser: one tab
          click emptied `/app/pnd`. `lifecycle_flyout_host.test.tsx` pins this with a `focusin`.
        */}
        <EuiTabbedContent
          data-test-subj="pndLifecycleFlyoutTabs"
          onTabClick={onTabClick}
          selectedTab={selectedTab}
          tabs={tabs}
        />
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="pndLifecycleFlyoutClose"
              flush="left"
              iconType="cross"
              onClick={onClose}
            >
              {i18n.CLOSE}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="pndLifecycleFlyoutFullPage"
              iconType="popout"
              onClick={onOpenFullPage}
            >
              {i18n.OPEN_FULL_PAGE}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
