/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@kbn/shared-ux-router';
import { DashboardView } from '.';
import { useCapabilities } from '../../../common/lib/kibana';
import { TestProviders } from '../../../common/mock';
import { SiemSearchBar } from '../../../common/components/search_bar';
import { useDashboardRenderer } from '../../hooks/use_dashboard_renderer';

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useParams: jest.fn().mockReturnValue({ detailName: 'mockSavedObjectId' }),
  };
});

jest.mock('../../../common/lib/kibana', () => {
  const actual = jest.requireActual('../../../common/lib/kibana');
  return {
    ...actual,
    useCapabilities: jest.fn().mockReturnValue({ show: true, showWriteControls: true }),
  };
});

jest.mock('../../components/dashboard_renderer', () => ({
  DashboardRenderer: jest
    .fn()
    .mockImplementation((props) => (
      <div data-test-subj={`dashboard-view-${props.savedObjectId}`} />
    )),
}));

jest.mock('../../hooks/use_dashboard_renderer', () => ({
  useDashboardRenderer: jest.fn(() => ({
    dashboardContainer: undefined,
    dashboardInternalApi: undefined,
    handleDashboardLoaded: jest.fn(),
  })),
}));

jest.mock('../../../common/components/search_bar', () => ({
  SiemSearchBar: jest.fn(() => null),
}));

type Action = 'PUSH' | 'POP' | 'REPLACE';
const pop: Action = 'POP';
const location = {
  pathname: '/network',
  search: '',
  state: '',
  hash: '',
};
const mockHistory = {
  length: 2,
  location,
  action: pop,
  push: jest.fn(),
  replace: jest.fn(),
  go: jest.fn(),
  goBack: jest.fn(),
  goForward: jest.fn(),
  block: jest.fn(),
  createHref: jest.fn(),
  listen: jest.fn(),
};

const emptyRenderer = {
  dashboardContainer: undefined,
  dashboardInternalApi: undefined,
  handleDashboardLoaded: jest.fn(),
};

describe('DashboardView', () => {
  beforeEach(() => {
    (useCapabilities as unknown as jest.Mock).mockReturnValue({
      show: true,
      showWriteControls: true,
    });
    (useDashboardRenderer as jest.Mock).mockReturnValue(emptyRenderer);
    (SiemSearchBar as unknown as jest.Mock).mockClear();
  });
  test('render when no error state', () => {
    const { queryByTestId } = render(
      <Router history={mockHistory}>
        <DashboardView initialViewMode={'view'} />
      </Router>,
      { wrapper: TestProviders }
    );

    expect(queryByTestId(`dashboard-view-mockSavedObjectId`)).toBeInTheDocument();
  });

  test('render a prompt when error state exists', () => {
    (useCapabilities as unknown as jest.Mock).mockReturnValue({
      show: false,
      showWriteControls: true,
    });
    const { queryByTestId } = render(
      <Router history={mockHistory}>
        <DashboardView initialViewMode={'view'} />
      </Router>,
      { wrapper: TestProviders }
    );

    expect(queryByTestId(`dashboard-view-mockSavedObjectId`)).not.toBeInTheDocument();
    expect(queryByTestId(`dashboard-view-error-prompt-wrapper`)).toBeInTheDocument();
  });

  test('render dashboard view with height', () => {
    const { queryByTestId } = render(
      <Router history={mockHistory}>
        <DashboardView initialViewMode={'view'} />
      </Router>,
      { wrapper: TestProviders }
    );

    expect(queryByTestId(`dashboard-view-wrapper`)).toHaveStyle({
      'min-height': `calc(100vh - 140px)`,
    });
  });

  test('passes published data views to the search bar', async () => {
    const libraryDataView = { id: 'library-data-view' };
    const dataViews$ = new BehaviorSubject([libraryDataView]);
    const dashboardContainer = {
      dataViews$,
      title$: new BehaviorSubject('Dashboard'),
      children$: new BehaviorSubject({ libraryPanel: {} }),
      getDashboardPanelFromId: () => ({
        type: 'lens',
        serializedState: { ref_id: 'saved-lens-id' },
      }),
    };
    (useDashboardRenderer as jest.Mock).mockReturnValue({
      dashboardContainer,
      dashboardInternalApi: undefined,
      handleDashboardLoaded: jest.fn(),
    });

    const { rerender } = render(
      <Router history={mockHistory}>
        <DashboardView initialViewMode={'view'} />
      </Router>,
      { wrapper: TestProviders }
    );

    await waitFor(() => {
      expect(SiemSearchBar).toHaveBeenLastCalledWith(
        expect.objectContaining({
          additionalDataViews: [libraryDataView],
        }),
        expect.anything()
      );
    });

    (useDashboardRenderer as jest.Mock).mockReturnValue(emptyRenderer);
    // initialViewMode must change so React.memo does not skip the update.
    rerender(
      <Router history={mockHistory}>
        <DashboardView initialViewMode={'edit'} />
      </Router>
    );

    await waitFor(() => {
      expect(SiemSearchBar).toHaveBeenLastCalledWith(
        expect.objectContaining({ additionalDataViews: undefined }),
        expect.anything()
      );
    });
  });
});
