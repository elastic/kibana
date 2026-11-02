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
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { createCatalogWatchPlaceholder, SYSTEM_SECURITY_WATCH_IDS } from '@kbn/alertzero-common';
import { useHuntLibrary, useHuntLibraryDetail } from '../../hooks/use_hunt_library_api';
import { useWatches } from '../../hooks/use_watches_api';
import { WatchesRoutes } from '../watches/routes';
import { HUNT_LIBRARY_PATH } from './paths';
import { makeDetail, makeHunt, unavailable } from './test_fixtures';

jest.mock('../../hooks/use_watches_api');
jest.mock('../../hooks/use_hunt_library_api');
jest.mock('@kbn/kibana-react-plugin/public', () => ({ useKibana: jest.fn() }));
jest.mock('@kbn/app-header', () => ({
  AppHeader: ({ title }: { title: string }) => (
    <header data-test-subj="appHeader">
      <h1>{title}</h1>
    </header>
  ),
}));

const lsass = makeHunt();
const okta = makeHunt({
  id: 'okta_spray',
  name: 'Okta password spraying',
  platform: ['identity'],
  mitreTechniques: ['T1110.003'],
  availability: unavailable([{ reason: 'unavailable_index', details: ['logs-okta*'] }]),
});

const renderPage = (initialPath: string = HUNT_LIBRARY_PATH) => {
  const history = createMemoryHistory({ initialEntries: [initialPath] });
  render(
    <Router history={history}>
      <WatchesRoutes />
    </Router>
  );
  return history;
};

describe('Hunt library page', () => {
  beforeEach(() => {
    jest.mocked(useWatches).mockReturnValue({
      data: { watches: SYSTEM_SECURITY_WATCH_IDS.map((id) => createCatalogWatchPlaceholder(id)) },
      isLoading: false,
    } as never);
    jest.mocked(useKibana).mockReturnValue({
      services: { docLinks: { links: { siem: { guide: 'https://www.elastic.co/guide' } } } },
    } as never);
    jest.mocked(useHuntLibrary).mockReturnValue({
      data: { hunts: [lsass, okta] },
      isLoading: false,
      isError: false,
    } as never);
    jest
      .mocked(useHuntLibraryDetail)
      .mockReturnValue({ data: makeDetail(), isLoading: false, isError: false } as never);
  });

  it('is served ahead of the /watches/:watchId route and marks its nav entry active', () => {
    const history = renderPage();

    expect(screen.getByTestId('alertZeroHuntLibraryPage')).toBeInTheDocument();
    expect(screen.getByTestId('appHeader')).toHaveTextContent('Hunt library');
    expect(
      within(screen.getByTestId('alertZeroWatchesSubnav')).getByTestId(
        'alertZeroWatchesSubnav-huntLibrary'
      )
    ).toHaveAttribute('aria-current', 'page');
    expect(history.location.pathname).toBe(HUNT_LIBRARY_PATH);
  });

  it('lists each hunt with the caller availability badge', () => {
    renderPage();

    expect(screen.getByTestId('alertZeroHuntRow-rare_lsass_process_access')).toHaveTextContent(
      'Rare LSASS Process Access'
    );
    expect(
      screen.getByTestId('alertZeroHuntAvailability-rare_lsass_process_access')
    ).toHaveTextContent('Available');
    expect(screen.getByTestId('alertZeroHuntAvailability-okta_spray')).toHaveTextContent(
      'Data not found'
    );
  });

  it('shows a loading state, then an error state with a retry', () => {
    const refetch = jest.fn();
    jest
      .mocked(useHuntLibrary)
      .mockReturnValue({ data: undefined, isLoading: true, isError: false } as never);
    renderPage();
    expect(screen.getByLabelText('Loading hunts…')).toBeInTheDocument();
    expect(screen.queryByTestId('alertZeroHuntLibraryTable')).not.toBeInTheDocument();
    jest.mocked(useHuntLibrary).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    } as never);
    renderPage();

    fireEvent.click(screen.getAllByTestId('alertZeroHuntLibraryRetry')[0]);
    expect(refetch).toHaveBeenCalled();
  });

  it('filters by search and availability, and clears the filters from the empty state', () => {
    renderPage();

    fireEvent.change(screen.getByTestId('alertZeroHuntLibrarySearch'), {
      target: { value: 'spraying' },
    });
    expect(
      screen.queryByTestId('alertZeroHuntRow-rare_lsass_process_access')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('alertZeroHuntRow-okta_spray')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('alertZeroHuntLibraryAvailabilityFilter'), {
      target: { value: 'available' },
    });
    expect(screen.getByTestId('alertZeroHuntLibraryNoResults')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('alertZeroHuntLibraryClearFilters'));
    expect(screen.getByTestId('alertZeroHuntRow-rare_lsass_process_access')).toBeInTheDocument();
    expect(screen.getByTestId('alertZeroHuntRow-okta_spray')).toBeInTheDocument();
  });

  it('opens the detail flyout from a hunt, keeps it in the URL and closes it', () => {
    const history = renderPage();

    fireEvent.click(screen.getByTestId('alertZeroHuntOpen-rare_lsass_process_access'));

    expect(screen.getByTestId('alertZeroHuntDetailFlyout')).toBeInTheDocument();
    expect(history.location.search).toBe('?hunt=rare_lsass_process_access');
    expect(useHuntLibraryDetail).toHaveBeenCalledWith('rare_lsass_process_access');

    fireEvent.click(screen.getByLabelText('Close this dialog'));
    expect(screen.queryByTestId('alertZeroHuntDetailFlyout')).not.toBeInTheDocument();
    expect(history.location.search).toBe('');
  });

  it('opens the flyout straight from a linked URL', () => {
    renderPage(`${HUNT_LIBRARY_PATH}?hunt=okta_spray`);

    expect(screen.getByTestId('alertZeroHuntDetailFlyout')).toBeInTheDocument();
    expect(useHuntLibraryDetail).toHaveBeenCalledWith('okta_spray');
  });

  it('gives each hunt link an href so it can open in a new tab', () => {
    renderPage();

    expect(screen.getByTestId('alertZeroHuntOpen-okta_spray')).toHaveAttribute(
      'href',
      expect.stringContaining('hunt=okta_spray')
    );
  });
});
