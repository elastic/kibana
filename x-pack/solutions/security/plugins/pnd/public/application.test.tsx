/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { MemoryRouter } from '@kbn/shared-ux-router';
import { SECURITY_UI_APP_ID, SecurityPageName } from '@kbn/security-solution-navigation';
import { PndRoutes } from './routes';

jest.mock('./pages/chats', () => ({
  ChatsPage: () => <div data-test-subj="pndChatsPage" />,
}));
jest.mock('./pages/conversations', () => ({
  ConversationsPage: () => <div data-test-subj="pndConversationsPage" />,
}));
jest.mock('./pages/executions', () => ({
  ExecutionsPage: () => <div data-test-subj="pndExecutionsPage" />,
}));
jest.mock('./pages/settings', () => ({
  SettingsPage: () => <div data-test-subj="pndSettingsPage" />,
}));
/**
 * The Watches section owns its own sub-table, so it is one entry here and its literal-before-param
 * ordering is pinned by `pages/watches/routes.test.tsx` instead.
 */
jest.mock('./pages/watches/routes', () => ({
  WatchesRoutes: () => <div data-test-subj="pndWatchesRoutes" />,
}));
jest.mock('./components/placeholder_page', () => ({
  PlaceholderPage: ({ title }: { title: string }) => (
    <div data-test-subj="pndPlaceholderPage">{title}</div>
  ),
}));

const mockNavigateToApp = jest.fn();

/**
 * Reads the location back out, which is the only way to assert where a `Redirect` landed: the route
 * it lands on renders a mocked page, so the page alone cannot tell `/` from `/` with the overlay open.
 */
const LocationProbe: React.FC = () => {
  const { pathname, search } = useLocation();

  return <div data-test-subj="pndTestLocation">{`${pathname}${search}`}</div>;
};

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <PndRoutes navigateToApp={mockNavigateToApp} />
      <LocationProbe />
    </MemoryRouter>
  );

describe('PndRoutes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the conversations queue at the root', () => {
    renderAt('/');

    expect(screen.getByTestId('pndConversationsPage')).toBeInTheDocument();
  });

  it('renders the chats page', () => {
    renderAt('/chats');

    expect(screen.getByTestId('pndChatsPage')).toBeInTheDocument();
  });

  it('renders the chats page for a deep link to one conversation', () => {
    renderAt('/chats?conversationId=3f2504e0-4f89-11d3-9a0c-0305e82c3301');

    expect(screen.getByTestId('pndChatsPage')).toBeInTheDocument();
  });

  it('does not fall through to the brief for a chats deep link', () => {
    renderAt('/chats?conversationId=3f2504e0-4f89-11d3-9a0c-0305e82c3301');

    expect(screen.queryByTestId('pndConversationsPage')).not.toBeInTheDocument();
  });

  it('renders the settings page', () => {
    renderAt('/settings');

    expect(screen.getByTestId('pndSettingsPage')).toBeInTheDocument();
  });

  it('hands the whole Watches section to its own route table', () => {
    renderAt('/watches');

    expect(screen.getByTestId('pndWatchesRoutes')).toBeInTheDocument();
  });

  it('hands a Watches sub-path to that same table rather than matching it here', () => {
    renderAt('/watches/activity');

    expect(screen.getByTestId('pndWatchesRoutes')).toBeInTheDocument();
  });

  it('renders the four-phase executions page for one attack discovery', () => {
    renderAt('/executions/alert-1');

    expect(screen.getByTestId('pndExecutionsPage')).toBeInTheDocument();
  });

  it('renders the executions page without an attack discovery id', () => {
    renderAt('/executions');

    expect(screen.getByTestId('pndExecutionsPage')).toBeInTheDocument();
  });

  /**
   * #284440's two `/investigations/*` paths are kept as **deep links into the flyout**, per decision 1
   * of the 2026-08-17 sync: the flyout is the only detail surface, so the URL contract survives and
   * the detail page it used to render does not. Both URLs are pinned, and the literal-`proposals`
   * route stays above the bare param route (`routes.tsx` says why that ordering is the durable one).
   *
   * These two tests replace the pair that pinned the *absence* of the routes, written when the only
   * thing behind them was the mock lane. What they assert now is where the route goes, which is the
   * honest form of the same guarantee: the mock detail page still cannot come back by URL.
   */
  const INVESTIGATION_DEEP_LINKS = [
    '/investigations/inv-1',
    '/investigations/inv-1/proposals/proposal-1',
  ] as const;

  it.each(INVESTIGATION_DEEP_LINKS)('opens the lifecycle flyout for %s', (path) => {
    renderAt(path);

    expect(screen.getByTestId('pndTestLocation')).toHaveTextContent('?lifecycle=inv-1');
  });

  it.each(INVESTIGATION_DEEP_LINKS)('lands %s on the queue, with the overlay over it', (path) => {
    renderAt(path);

    expect(screen.getByTestId('pndTestLocation')).toHaveTextContent('/?lifecycle=inv-1');
  });

  it.each(INVESTIGATION_DEEP_LINKS)('renders the queue behind the overlay for %s', (path) => {
    renderAt(path);

    expect(screen.getByTestId('pndConversationsPage')).toBeInTheDocument();
  });

  it('percent-encodes a discovery id that needs it rather than opening a second param', () => {
    renderAt('/investigations/ad%201%2F2');

    expect(screen.getByTestId('pndTestLocation')).toHaveTextContent('?lifecycle=ad+1%2F2');
  });

  it.each(['/alerts', '/records', '/threat-hunt', '/streams'])(
    'renders a placeholder at %s',
    (path) => {
      renderAt(path);

      expect(screen.getByTestId('pndPlaceholderPage')).toBeInTheDocument();
    }
  );

  it('redirects /attacks to the security solution attacks page', () => {
    renderAt('/attacks');

    expect(mockNavigateToApp).toHaveBeenCalledWith(SECURITY_UI_APP_ID, {
      deepLinkId: SecurityPageName.attacks,
      replace: true,
    });
  });
});
