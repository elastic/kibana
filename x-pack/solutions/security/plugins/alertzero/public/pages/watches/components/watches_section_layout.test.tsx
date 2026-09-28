/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import {
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_HUNT_ID,
  SYSTEM_SECURITY_WATCH_IDS,
  SYSTEM_SECURITY_WATCH_OFFICER_ID,
  createCatalogWatchPlaceholder,
} from '@kbn/alertzero-common';
import { useWatches } from '../../../hooks/use_watches_api';
import { WatchesSectionLayout } from './watches_section_layout';

jest.mock('../../../hooks/use_watches_api');

/**
 * Chrome `AppHeader` reads Kibana chrome hooks. The stub records `spacing` so the shell test can
 * assert compact without mounting that tree.
 */
jest.mock('@kbn/app-header', () => ({
  AppHeader: ({ title, spacing }: { title: string; spacing?: string }) => (
    <header data-test-subj="appHeader" data-spacing={spacing}>
      <h1>{title}</h1>
    </header>
  ),
}));

const mockUseWatches = jest.mocked(useWatches);

const catalogWatches = SYSTEM_SECURITY_WATCH_IDS.map((id) => createCatalogWatchPlaceholder(id));

const renderShell = (active = SYSTEM_SECURITY_WATCH_FLOOR_ID) => {
  mockUseWatches.mockReturnValue({
    data: { watches: catalogWatches },
    isLoading: false,
  } as never);

  const history = createMemoryHistory({
    initialEntries: [`/watches/${active}`],
  });

  render(
    <Router history={history}>
      <WatchesSectionLayout active={active} title="Triage Watch">
        <div data-test-subj="shell-body">body</div>
      </WatchesSectionLayout>
    </Router>
  );

  return history;
};

describe('WatchesSectionLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps the sidebar, compact header, and page body on one shell', () => {
    renderShell();

    expect(screen.getByTestId('alertZeroWatchesSectionLayout')).toBeInTheDocument();
    expect(screen.getByTestId('alertZeroWatchesSubnav')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Watches' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /collapse/i })).not.toBeInTheDocument();

    const header = screen.getByTestId('appHeader');
    expect(header).toHaveAttribute('data-spacing', 'compact');
    expect(header).toHaveTextContent('Triage Watch');
    expect(screen.queryByTestId('appHeaderDescription')).not.toBeInTheDocument();
    expect(screen.getByTestId('shell-body')).toHaveTextContent('body');
  });

  it('marks the active Watch, omits Officer, and navigates from a nav item', () => {
    const history = renderShell(SYSTEM_SECURITY_WATCH_FLOOR_ID);
    const nav = screen.getByTestId('alertZeroWatchesSubnav');

    expect(
      within(nav).getByTestId(`alertZeroWatchesSubnav-${SYSTEM_SECURITY_WATCH_FLOOR_ID}`)
    ).toHaveAttribute('aria-current', 'page');
    expect(
      within(nav).getByTestId(`alertZeroWatchesSubnav-${SYSTEM_SECURITY_WATCH_HUNT_ID}`)
    ).not.toHaveAttribute('aria-current');
    expect(
      within(nav).queryByTestId(`alertZeroWatchesSubnav-${SYSTEM_SECURITY_WATCH_OFFICER_ID}`)
    ).not.toBeInTheDocument();

    fireEvent.click(
      within(nav).getByTestId(`alertZeroWatchesSubnav-${SYSTEM_SECURITY_WATCH_HUNT_ID}`)
    );
    expect(history.location.pathname).toBe(`/watches/${SYSTEM_SECURITY_WATCH_HUNT_ID}`);
  });
});
