/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { PHASE_CATALOG, PND_CONVERSATIONS_URL, PND_PROPOSALS_URL } from '@kbn/pnd-common';

import { PND_EXECUTION_CORRELATED_HEADER } from '../../../common/constants';
import { renderWithPndProviders } from '../test_utils/render_with_pnd_providers';
import { createHttpResponse } from '../../test_helpers/create_http_response';
import { LifecycleFlyoutHost } from './lifecycle_flyout_host';
import { useOpenLifecycle } from './use_open_lifecycle';

const get = jest.fn(async (path: string) => {
  if (path === PND_CONVERSATIONS_URL) {
    return { conversations: [], total: 0 };
  }
  if (path === PND_PROPOSALS_URL) {
    return { groups: [], total: 0 };
  }

  return createHttpResponse({
    body: {
      correlationId: 'ad-1',
      steps: PHASE_CATALOG.map(({ id, liveness }) => ({
        deepLinkPath: `/system-security-watch-deep?tab=executions&executionId=run-1&stepExecutionId=${id}-step`,
        phaseStepId: id,
        status: liveness === 'live' ? ('completed' as const) : ('upstream' as const),
        stepExecutionId: `${id}-step`,
        workflowId: 'system-security-watch-deep',
        workflowRunId: 'run-1',
      })),
    },
    headers: { [PND_EXECUTION_CORRELATED_HEADER]: 'true' },
  });
});

/** Stands in for the list row the overlay is opened from: the queue at `/`, the ledger, a chat row. */
const TriggerRow: React.FC = () => {
  const openLifecycle = useOpenLifecycle('ad-1');

  return (
    <button data-test-subj="pndTestTriggerRow" onClick={openLifecycle} type="button">
      {'View lifecycle'}
    </button>
  );
};

const services = {
  application: {
    getUrlForApp: (appId: string, { path }: { path: string }) => `/s/agent-4/app/${appId}${path}`,
    navigateToApp: jest.fn(),
  },
  http: { get },
};

const render = (route: string) =>
  renderWithPndProviders(<LifecycleFlyoutHost />, { route, services });

describe('LifecycleFlyoutHost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing while the overlay is closed', () => {
    render('/watches/activity');

    expect(screen.queryByTestId('pndLifecycleFlyout')).not.toBeInTheDocument();
  });

  it('reads nothing while the overlay is closed', () => {
    render('/watches/activity');

    expect(get).not.toHaveBeenCalled();
  });

  it('opens the overlay for the discovery in the search string', () => {
    render('/watches/activity?lifecycle=ad-1');

    expect(screen.getByTestId('pndLifecycleFlyout')).toBeInTheDocument();
  });

  it('names the discovery it is showing', () => {
    render('/watches/activity?lifecycle=ad-1');

    expect(screen.getByTestId('pndLifecycleFlyoutSubtitle')).toHaveTextContent('ad-1');
  });

  /**
   * *"Flyout and chat case headers drop the same type tags (Sub-investigation, Investigation,
   * Incident)"* — 2026-08-18. This header never carried one, because the overlay is keyed on a
   * discovery rather than on a conversation, so the assertion is a **pin** rather than a change:
   * `ConversationKindBadge` is the only component that renders one of those three labels, and it
   * must not reach this chrome. The chat case header dropped its own instance in the same commit.
   */
  it('carries no conversation type tag in its header', () => {
    render('/watches/activity?lifecycle=ad-1');

    expect(
      within(screen.getByTestId('pndLifecycleFlyout')).queryByTestId('pndConversationKindBadge')
    ).not.toBeInTheDocument();
  });

  it('renders none of the three container type labels as text either', () => {
    render('/watches/activity?lifecycle=ad-1');

    const flyout = within(screen.getByTestId('pndLifecycleFlyout'));

    expect(
      ['Investigation', 'Sub-investigation', 'Incident'].some(
        (label) => flyout.queryByText(label) != null
      )
    ).toBe(false);
  });

  /**
   * The same rule, once every section on the Overview panel has resolved. `kibana-phf4.26` wrote its
   * pin against a flyout whose default panel was the summary alone; folding Attachments, Review
   * tuning and Lifecycle into that panel put three more bodies of copy inside the assertion's scope,
   * so the loaded state is where the rule can now actually be broken.
   */
  it('still renders none of them once every Overview section has loaded', async () => {
    render('/watches/activity?lifecycle=ad-1');

    await waitFor(() => expect(screen.getByTestId('pndLifecycleView')).toBeInTheDocument());

    const flyout = within(screen.getByTestId('pndLifecycleFlyout'));

    expect(
      ['Investigation', 'Sub-investigation', 'Incident'].some(
        (label) => flyout.queryByText(label) != null
      )
    ).toBe(false);
  });

  it('renders the container-agnostic lifecycle view inside the overlay', async () => {
    render('/watches/activity?lifecycle=ad-1');

    await waitFor(() => expect(screen.getByTestId('pndLifecycleView')).toBeInTheDocument());
  });

  it('closes by dropping the overlay params and nothing else', () => {
    const { history } = render('/watches/activity?bucket=tune&lifecycle=ad-1');

    fireEvent.click(screen.getByTestId('pndLifecycleFlyoutClose'));

    expect(history.location.search).toBe('?bucket=tune');
  });

  it('closes by dropping the tab param as well, so no orphan tab is left behind', () => {
    const { history } = render(
      '/watches/activity?bucket=tune&lifecycle=ad-1&lifecycleTab=timeline'
    );

    fireEvent.click(screen.getByTestId('pndLifecycleFlyoutClose'));

    expect(history.location.search).toBe('?bucket=tune');
  });

  it('stays on the page it was opened over when it closes', () => {
    const { history } = render('/watches/activity?lifecycle=ad-1');

    fireEvent.click(screen.getByTestId('pndLifecycleFlyoutClose'));

    expect(history.location.pathname).toBe('/watches/activity');
  });

  it('closes without adding a history entry, so Back does not reopen it', () => {
    const { history } = render('/watches/activity?lifecycle=ad-1');
    const before = history.length;

    fireEvent.click(screen.getByTestId('pndLifecycleFlyoutClose'));

    expect(history.length).toBe(before);
  });

  it('hands off to the full-page route', () => {
    const { history } = render('/watches/activity?lifecycle=ad-1');

    fireEvent.click(screen.getByTestId('pndLifecycleFlyoutFullPage'));

    expect(history.location.pathname).toBe('/executions/ad-1');
  });

  it('drops the overlay param when it hands off to the full-page route', () => {
    const { history } = render('/watches/activity?lifecycle=ad-1');

    fireEvent.click(screen.getByTestId('pndLifecycleFlyoutFullPage'));

    expect(history.location.search).toBe('');
  });

  it('keeps a discovery id that needs encoding intact through the full-page route', () => {
    const { history } = render('/watches/activity?lifecycle=ad%201%2F2');

    fireEvent.click(screen.getByTestId('pndLifecycleFlyoutFullPage'));

    // `history` runs `decodeURI` over the pathname it is given, which decodes `%20` but leaves the
    // reserved `%2F` alone — so assert the round trip rather than the intermediate spelling.
    expect(decodeURIComponent(history.location.pathname)).toBe('/executions/ad 1/2');
  });

  describe('tabs', () => {
    /**
     * Decision 1 of the 2026-08-17 Experience/UX sync: *"Flyout goes to tabs: an Overview tab
     * (description, related items, fields table, attachments) and a separate Timeline tab"*. Exactly
     * two, which is why this asserts the whole list rather than a membership.
     */
    it('renders the two tabs decision 1 names, in the documented order', () => {
      render('/watches/activity?lifecycle=ad-1');

      expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
        'Overview',
        'Timeline',
      ]);
    });

    it('opens on Overview when the URL names no tab', () => {
      render('/watches/activity?lifecycle=ad-1');

      expect(screen.getByTestId('pndLifecyclePanel-overview')).toBeInTheDocument();
    });

    it('opens on Timeline when the URL names it, so a reload reopens the tab that was being read', () => {
      render('/watches/activity?lifecycle=ad-1&lifecycleTab=timeline');

      expect(screen.getByTestId('pndLifecyclePanel-timeline')).toBeInTheDocument();
    });

    /**
     * The three ids that used to be tabs of their own are now sections inside Overview, so a link a
     * colleague pasted before decision 1 must still land on the content it named — not on an empty
     * flyout, and not on a tab bar with a selected tab that has no panel.
     */
    it.each(['attachments', 'tuning', 'lifecycle'] as const)(
      'lands a retired ?lifecycleTab=%s on Overview, which is where that section now lives',
      (retiredTabId) => {
        render(`/watches/activity?lifecycle=ad-1&lifecycleTab=${retiredTabId}`);

        expect(screen.getByTestId('pndLifecyclePanel-overview')).toBeInTheDocument();
      }
    );

    it.each(['summary', 'attachments', 'tuning', 'lifecycle'] as const)(
      'holds the %s section on the Overview panel, so nothing the five tabs showed is unreachable',
      (sectionId) => {
        render('/watches/activity?lifecycle=ad-1');

        expect(
          within(screen.getByTestId('pndLifecyclePanel-overview')).getByTestId(
            `pndLifecycleSection-${sectionId}`
          )
        ).toBeInTheDocument();
      }
    );

    it('falls back to Overview for a tab the flyout does not have', () => {
      render('/watches/activity?lifecycle=ad-1&lifecycleTab=nope');

      expect(screen.getByTestId('pndLifecyclePanel-overview')).toBeInTheDocument();
    });

    it('renders one panel at a time', () => {
      render('/watches/activity?lifecycle=ad-1&lifecycleTab=timeline');

      expect(screen.queryByTestId('pndLifecyclePanel-overview')).not.toBeInTheDocument();
    });

    it('puts the tab it switched to in the URL', () => {
      const { history } = render('/watches/activity?lifecycle=ad-1');

      fireEvent.click(screen.getByTestId('pndLifecycleTab-timeline'));

      expect(history.location.search).toBe('?lifecycle=ad-1&lifecycleTab=timeline');
    });

    it('renders the panel it switched to', () => {
      render('/watches/activity?lifecycle=ad-1');

      fireEvent.click(screen.getByTestId('pndLifecycleTab-timeline'));

      expect(screen.getByTestId('pndLifecyclePanel-timeline')).toBeInTheDocument();
    });

    it('keeps the params the page already had when it switches tab', () => {
      const { history } = render('/watches/activity?bucket=tune&lifecycle=ad-1');

      fireEvent.click(screen.getByTestId('pndLifecycleTab-timeline'));

      expect(history.location.search).toBe('?bucket=tune&lifecycle=ad-1&lifecycleTab=timeline');
    });

    it('stays on the page it was opened over when it switches tab', () => {
      const { history } = render('/watches/activity?lifecycle=ad-1');

      fireEvent.click(screen.getByTestId('pndLifecycleTab-timeline'));

      expect(history.location.pathname).toBe('/watches/activity');
    });

    /**
     * The load-bearing one: `replace`, never `push`. Opening the overlay added exactly one history
     * entry, so if switching tabs added more, Back would walk the analyst through every tab they
     * visited instead of closing the overlay.
     */
    it('switches tab without adding a history entry', () => {
      const { history } = render('/watches/activity?lifecycle=ad-1');
      const before = history.length;

      fireEvent.click(screen.getByTestId('pndLifecycleTab-timeline'));

      expect(history.length).toBe(before);
    });

    it('leaves Back pointing at the page the overlay was opened over, whatever tabs were visited', () => {
      const { history } = renderWithPndProviders(
        <>
          <TriggerRow />
          <LifecycleFlyoutHost />
        </>,
        { route: '/watches/activity', services }
      );

      fireEvent.click(screen.getByTestId('pndTestTriggerRow'));
      fireEvent.click(screen.getByTestId('pndLifecycleTab-timeline'));
      fireEvent.click(screen.getByTestId('pndLifecycleTab-overview'));
      act(() => history.goBack());

      expect(history.location.search).toBe('');
    });

    /**
     * ⚠️ Regression, found in a real browser and reproducible here only through `focusin`.
     *
     * `EuiTabbedContent` never populates `state.selectedTabId` while it is **controlled** (the
     * constructor sets it only when `props.selectedTab` is absent), but `focusTab` still does
     * `tabsRef.querySelector('#' + state.selectedTabId).focus()`. With `autoFocus="selected"` the
     * first focus into the tab list therefore resolves `#undefined` to `null` and throws, and
     * because the flyout is inside the app's error boundary the whole PND app blanks — losing the
     * page behind the overlay, not just the overlay. Verified: clicking any tab in the browser took
     * `/app/pnd` down to an empty shell.
     *
     * So the overlay keeps EUI's default `autoFocus="initial"`, whose `initializeFocus` is a no-op.
     */
    it('survives focus entering the tab list', () => {
      render('/watches/activity?lifecycle=ad-1');

      fireEvent.focusIn(screen.getByRole('tablist'));

      expect(screen.getByTestId('pndLifecycleFlyout')).toBeInTheDocument();
    });

    it('closes the overlay when Back is pressed after visiting other tabs', () => {
      const { history } = renderWithPndProviders(
        <>
          <TriggerRow />
          <LifecycleFlyoutHost />
        </>,
        { route: '/watches/activity', services }
      );

      fireEvent.click(screen.getByTestId('pndTestTriggerRow'));
      fireEvent.click(screen.getByTestId('pndLifecycleTab-timeline'));
      act(() => history.goBack());

      expect(screen.queryByTestId('pndLifecycleFlyout')).not.toBeInTheDocument();
    });
  });

  /**
   * ⚠️ `EuiFlyout` renders as a bare `<div data-eui="EuiFlyout" role="dialog">` under Kibana's Jest
   * setup — no class, no `tabindex`, no `aria-labelledby`, and **no focus trap**. (Reproduced with a
   * bare `<EuiFlyout>` outside PND, and visible in core's own flyout snapshots.) So the two halves of
   * focus management — focus entering the overlay, and returning to the row that opened it — cannot
   * be asserted here at all: `document.activeElement` never leaves `<body>`. They are verified in a
   * real browser instead, and recorded on the bead.
   *
   * What this block pins is everything the stub still lets us prove: that the preconditions for EUI's
   * own focus return hold (the triggering row stays mounted behind the overlay) and that the title
   * the dialog is labelled by really exists and is addressable.
   */
  describe('accessibility preconditions the Jest flyout stub can still prove', () => {
    const renderWithTrigger = () =>
      renderWithPndProviders(
        <>
          <TriggerRow />
          <LifecycleFlyoutHost />
        </>,
        { route: '/watches/activity', services }
      );

    it('leaves the row that opened it mounted, so EUI has somewhere to return focus to', () => {
      renderWithTrigger();

      fireEvent.click(screen.getByTestId('pndTestTriggerRow'));

      expect(screen.getByTestId('pndTestTriggerRow')).toBeInTheDocument();
    });

    it('opens over the list rather than navigating away from it', () => {
      const { history } = renderWithTrigger();

      fireEvent.click(screen.getByTestId('pndTestTriggerRow'));

      expect(history.location.pathname).toBe('/watches/activity');
    });

    it('gives the overlay a heading, which is what the dialog is labelled by', () => {
      render('/watches/activity?lifecycle=ad-1');

      expect(screen.getByRole('heading', { name: /four-phase lifecycle/i })).toBeInTheDocument();
    });

    it('gives that heading an id, so `aria-labelledby` has something to point at', () => {
      render('/watches/activity?lifecycle=ad-1');

      expect(screen.getByRole('heading', { name: /four-phase lifecycle/i }).id).not.toBe('');
    });
  });
});
