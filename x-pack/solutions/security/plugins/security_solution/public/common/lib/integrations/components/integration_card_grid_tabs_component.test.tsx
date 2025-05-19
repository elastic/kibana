/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react';

import { IntegrationsCardGridTabsComponent } from './integration_card_grid_tabs_component';
import * as module from '@kbn/fleet-plugin/public';

import {
  useStoredIntegrationSearchTerm,
  useStoredIntegrationTabId,
} from '../hooks/use_stored_state';
import { INTEGRATION_TABS } from '../configs/integration_tabs_configs';
import { mockReportLinkClick } from '../hooks/__mocks__/mocks';

jest.mock('../hooks/integration_context');
jest.mock('../hooks/use_stored_state');
jest.mock('../../kibana', () => ({
  ...jest.requireActual('../../kibana'),
  useNavigation: jest.fn().mockReturnValue({
    navigateTo: jest.fn(),
    getAppUrl: jest.fn(),
  }),
}));

const mockPackageList = jest.fn<
  React.JSX.Element,
  Array<{ showSearchTools?: boolean; searchTerm: string }>
>(() => <div data-test-subj="packageList" />);

jest.mock('@kbn/fleet-plugin/public');
jest
  .spyOn(module, 'PackageList')
  .mockImplementation(() => Promise.resolve({ PackageListGrid: mockPackageList }));

describe('IntegrationsCardGridTabsComponent', () => {
  const mockSetTabId = jest.fn();
  const mockSetCategory = jest.fn();
  const mockSetSelectedSubCategory = jest.fn();
  const mockSetSearchTerm = jest.fn();
  const props = {
    installedIntegrationsCount: 1,
    isAgentRequired: false,
    availablePackagesResult: {
      isLoading: false,
      setCategory: mockSetCategory,
      setSelectedSubCategory: mockSetSelectedSubCategory,
      setSearchTerm: mockSetSearchTerm,
      searchTerm: 'new search term',
    },
    integrationList: [],
    selectedTabResult: {
      selectedTab: INTEGRATION_TABS[0],
      toggleIdSelected: INTEGRATION_TABS[0].id,
      setSelectedTabIdToStorage: mockSetTabId,
      integrationTabs: INTEGRATION_TABS,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useStoredIntegrationTabId as jest.Mock).mockReturnValue([INTEGRATION_TABS[0].id, jest.fn()]);
    (useStoredIntegrationSearchTerm as jest.Mock).mockReturnValue(['', jest.fn()]);
  });

  it('renders loading skeleton when data is loading', () => {
    const testProps = {
      ...props,
      availablePackagesResult: {
        ...props.availablePackagesResult,
        isLoading: true,
      },
    };
    const { getByTestId } = render(<IntegrationsCardGridTabsComponent {...testProps} />);

    expect(getByTestId('loadingPackages')).toBeInTheDocument();
  });

  it('renders the package list when data is available', async () => {
    const { getByTestId } = render(<IntegrationsCardGridTabsComponent {...props} />);

    await waitFor(() => {
      expect(getByTestId('packageList')).toBeInTheDocument();
    });
  });

  it('saves the selected tab to storage', () => {
    (useStoredIntegrationTabId as jest.Mock).mockReturnValue(['recommended', mockSetTabId]);

    const { getByTestId } = render(<IntegrationsCardGridTabsComponent {...props} />);

    const tabButton = getByTestId('user');

    act(() => {
      fireEvent.click(tabButton);
    });
    expect(mockSetTabId).toHaveBeenCalledWith('user');
  });

  it('tracks the tab clicks', () => {
    (useStoredIntegrationTabId as jest.Mock).mockReturnValue(['recommended', mockSetTabId]);

    const { getByTestId } = render(<IntegrationsCardGridTabsComponent {...props} />);

    const tabButton = getByTestId('user');

    act(() => {
      fireEvent.click(tabButton);
    });

    expect(mockReportLinkClick).toHaveBeenCalledWith('tab_user');
  });

  it('renders no search tools when showSearchTools is false', async () => {
    render(<IntegrationsCardGridTabsComponent {...props} />);

    await waitFor(() => {
      expect(mockPackageList.mock.calls[0][0].showSearchTools).toEqual(false);
    });
  });

  it('updates the search term when the search input changes', async () => {
    const mockSetSearchTermToStorage = jest.fn();
    (useStoredIntegrationSearchTerm as jest.Mock).mockReturnValue([
      'new search term',
      mockSetSearchTermToStorage,
    ]);

    render(<IntegrationsCardGridTabsComponent {...props} />);

    await waitFor(() => {
      expect(mockPackageList.mock.calls[0][0].searchTerm).toEqual('new search term');
    });
  });
});
