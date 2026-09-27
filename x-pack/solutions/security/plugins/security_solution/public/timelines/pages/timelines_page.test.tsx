/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { TimelinesPage } from './timelines_page';
import { TestProviders } from '../../common/mock';
import { useUserPrivileges } from '../../common/components/user_privileges';
import { useDataView } from '../../data_view_manager/hooks/use_data_view';
import { withMatchedIndices } from '../../data_view_manager/hooks/__mocks__/use_data_view';
import {
  IMPORT_TIMELINE_MENU_ITEM_TEST_ID,
  NEW_TIMELINE_MENU_ITEM_TEST_ID,
} from './header/use_timelines_header_menu';

jest.mock('react-router-dom', () => {
  const originalModule = jest.requireActual('react-router-dom');

  return {
    ...originalModule,
    useParams: jest.fn().mockReturnValue({
      tabName: 'default',
    }),
  };
});
jest.mock('../../overview/components/events_by_dataset');
jest.mock('../../common/components/user_privileges');
jest.mock('../../common/hooks/use_experimental_features');
jest.mock('../components/open_timeline', () => ({
  StatefulOpenTimeline: () => <div data-test-subj="stateful-open-timeline" />,
}));
// SecurityRoutePageWrapper redirects away when a page has no registered link info; give the
// timelines route a minimal, available and authorized link so the page content renders.
jest.mock('../../common/links', () => ({
  useLinkInfo: jest.fn().mockReturnValue({ id: 'timelines' }),
}));

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <TestProviders>
    <MemoryRouter>{children}</MemoryRouter>
  </TestProviders>
);

const renderPage = () => render(<TimelinesPage />, { wrapper: Wrapper });

describe('TimelinesPage', () => {
  it('should render landing page if no indicesExist', () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      timelinePrivileges: { crud: true },
    });

    renderPage();

    expect(screen.queryByTestId(APP_HEADER_TEST_SUBJECTS.root)).not.toBeInTheDocument();
    expect(screen.queryByTestId('stateful-open-timeline')).not.toBeInTheDocument();
  });

  it('should show the correct elements if user has crud and indices exist', async () => {
    jest.mocked(useDataView).mockImplementation(withMatchedIndices);
    (useUserPrivileges as jest.Mock).mockReturnValue({
      timelinePrivileges: { crud: true },
    });

    renderPage();

    expect(screen.getByTestId('stateful-open-timeline')).toBeInTheDocument();

    await openAppMenuOverflow();
    expect(screen.getByTestId(NEW_TIMELINE_MENU_ITEM_TEST_ID)).toBeInTheDocument();
    expect(screen.getByTestId(IMPORT_TIMELINE_MENU_ITEM_TEST_ID)).toBeInTheDocument();
  });

  it('should not show the import action if user does not have crud privileges, but should show the new timeline action', async () => {
    jest.mocked(useDataView).mockImplementation(withMatchedIndices);
    (useUserPrivileges as jest.Mock).mockReturnValue({
      timelinePrivileges: { crud: false, read: true },
    });

    renderPage();

    expect(screen.getByTestId('stateful-open-timeline')).toBeInTheDocument();

    await openAppMenuOverflow();
    expect(screen.getByTestId(NEW_TIMELINE_MENU_ITEM_TEST_ID)).toBeInTheDocument();
    expect(screen.queryByTestId(IMPORT_TIMELINE_MENU_ITEM_TEST_ID)).not.toBeInTheDocument();
  });
});
