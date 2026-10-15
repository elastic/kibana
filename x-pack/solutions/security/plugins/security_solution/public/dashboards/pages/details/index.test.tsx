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
import { getESQLAdHocDataview } from '@kbn/esql-utils';
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

jest.mock('@kbn/esql-utils', () => {
  const actual = jest.requireActual('@kbn/esql-utils');
  return {
    ...actual,
    getESQLAdHocDataview: jest.fn(),
  };
});

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

const lensPanel = (esql: string) => ({
  attributes: {
    state: {
      datasourceStates: {
        textBased: {
          layers: {
            layer: { query: { esql } },
          },
        },
      },
    },
  },
});

describe('DashboardView', () => {
  beforeEach(() => {
    (useCapabilities as unknown as jest.Mock).mockReturnValue({
      show: true,
      showWriteControls: true,
    });
    (useDashboardRenderer as jest.Mock).mockReturnValue(emptyRenderer);
    (getESQLAdHocDataview as jest.Mock).mockReset();
    (SiemSearchBar as jest.Mock).mockClear();
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

  test('passes click-time data views from panel queries to the search bar', async () => {
    const templateDataViewId = 'd6c911aa50e2dafcebcedfa50190d5c03bbac0070c96d6b16feb18aa1f84b5da';
    const panels: Record<string, object> = {
      panelA: lensPanel('FROM filebeat-* | STATS count = COUNT(*)'),
      panelB: lensPanel('FROM winlogbeat-* | STATS count = COUNT(*)'),
    };
    const dataViews$ = new BehaviorSubject([{ id: templateDataViewId }]);
    const dashboardContainer = {
      dataViews$,
      title$: new BehaviorSubject('Dashboard'),
      children$: new BehaviorSubject({ panelA: {}, panelB: {} }),
      getDashboardPanelFromId: (panelId: string) => ({
        type: 'lens',
        serializedState: panels[panelId],
      }),
    };
    (getESQLAdHocDataview as jest.Mock).mockImplementation(
      async ({ query }: { query: string }) => ({
        id: `click:${query}`,
      })
    );
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
          additionalDataViews: [
            { id: templateDataViewId },
            { id: 'click:FROM filebeat-*' },
            { id: 'click:FROM winlogbeat-*' },
          ],
        }),
        expect.anything()
      );
    });
    expect(getESQLAdHocDataview).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'FROM filebeat-*' })
    );
    expect(getESQLAdHocDataview).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'FROM winlogbeat-*' })
    );

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

  test('keeps published data views for library panels that omit attributes', async () => {
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

    render(
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
    expect(getESQLAdHocDataview).not.toHaveBeenCalled();
  });
});
