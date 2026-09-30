/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, MockedFunction } from 'vitest';
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react';

import type { SecurityIntegrationsGridTabsProps } from './security_integrations_grid_tabs';
import { SecurityIntegrationsGridTabs } from './security_integrations_grid_tabs';
import * as module from '@kbn/fleet-plugin/public';
import { TestProviders } from '../../../mock';
import {
  useStoredIntegrationSearchTerm,
  useStoredIntegrationTabId,
} from '../hooks/use_stored_state';
import { INTEGRATION_TABS } from '../configs/integration_tabs_configs';
import { mockReportLinkClick } from '../hooks/__mocks__/mocks';
import type { AvailablePackages } from './with_available_packages';

vi.mock('../hooks/integration_context');
vi.mock('../hooks/use_stored_state');
vi.mock('../../kibana', async () => {
  const mocked = {
    ...(await vi.importActual('../../kibana')),
    useNavigation: vi.fn().mockReturnValue({
      navigateTo: vi.fn(),
      getAppUrl: vi.fn(),
    }),
  };
  return { ...mocked, default: mocked };
});

const mockPackageList = vi.fn<
  (
    ...args: Array<{ showSearchTools?: boolean; searchTerm: string; list: unknown[] }>
  ) => React.JSX.Element
>(() => <div data-test-subj="packageList" />);

vi.mock('@kbn/fleet-plugin/public');
vi.spyOn(module, 'PackageList').mockImplementation(() =>
  Promise.resolve({ PackageListGrid: mockPackageList })
);

const mockUseStoredIntegrationTabId = useStoredIntegrationTabId as MockedFunction<
  typeof useStoredIntegrationTabId
>;
const mockUseStoredIntegrationSearchTerm = useStoredIntegrationSearchTerm as MockedFunction<
  typeof useStoredIntegrationSearchTerm
>;

describe('IntegrationsCardGridTabsComponent', () => {
  const mockSetTabId = vi.fn();
  const mockSetCategory = vi.fn();
  const mockSetSelectedSubCategory = vi.fn();
  const mockSetSearchTerm = vi.fn();
  const props: SecurityIntegrationsGridTabsProps = {
    activeIntegrationsCount: 1,
    isAgentRequired: false,
    availablePackages: {
      isLoading: false,
      setCategory: mockSetCategory,
      setSelectedSubCategory: mockSetSelectedSubCategory,
      setSearchTerm: mockSetSearchTerm,
      searchTerm: 'new search term',
    } as unknown as AvailablePackages,
    integrationList: [],
    selectedTab: INTEGRATION_TABS[0],
    setSelectedTabId: mockSetTabId,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseStoredIntegrationTabId.mockReturnValue([INTEGRATION_TABS[0].id, vi.fn()]);
    mockUseStoredIntegrationSearchTerm.mockReturnValue(['', vi.fn()]);
  });

  it('renders loading skeleton when data is loading', () => {
    const testProps = {
      ...props,
      availablePackages: {
        ...props.availablePackages,
        isLoading: true,
      },
    };
    const { getByTestId } = render(<SecurityIntegrationsGridTabs {...testProps} />, {
      wrapper: TestProviders,
    });

    expect(getByTestId('loadingPackages')).toBeInTheDocument();
  });

  it('renders the package list when data is available', async () => {
    const { getByTestId } = render(<SecurityIntegrationsGridTabs {...props} />, {
      wrapper: TestProviders,
    });

    await waitFor(() => {
      expect(getByTestId('packageList')).toBeInTheDocument();
    });
  });

  it('saves the selected tab to storage', () => {
    (useStoredIntegrationTabId as Mock).mockReturnValue(['recommended', mockSetTabId]);

    const { getByTestId } = render(<SecurityIntegrationsGridTabs {...props} />, {
      wrapper: TestProviders,
    });

    const tabButton = getByTestId('securitySolutionIntegrationsTab-user');

    act(() => {
      fireEvent.click(tabButton);
    });
    expect(mockSetTabId).toHaveBeenCalledWith('user');
  });

  it('tracks the tab clicks', () => {
    (useStoredIntegrationTabId as Mock).mockReturnValue(['recommended', mockSetTabId]);

    const { getByTestId } = render(<SecurityIntegrationsGridTabs {...props} />, {
      wrapper: TestProviders,
    });

    const tabButton = getByTestId('securitySolutionIntegrationsTab-user');

    act(() => {
      fireEvent.click(tabButton);
    });

    expect(mockReportLinkClick).toHaveBeenCalledWith('tab_user');
  });

  it('renders no search tools when showSearchTools is false', async () => {
    render(<SecurityIntegrationsGridTabs {...props} />, { wrapper: TestProviders });

    await waitFor(() => {
      expect(mockPackageList.mock.calls[0][0].showSearchTools).toEqual(false);
    });
  });

  it('updates the search term when the search input changes', async () => {
    const mockSetSearchTermToStorage = vi.fn();
    (useStoredIntegrationSearchTerm as Mock).mockReturnValue([
      'new search term',
      mockSetSearchTermToStorage,
    ]);

    render(<SecurityIntegrationsGridTabs {...props} />, { wrapper: TestProviders });

    await waitFor(() => {
      expect(mockPackageList.mock.calls[0][0].searchTerm).toEqual('new search term');
    });
  });

  it('renders auto-import card if appendAutoImport is true', async () => {
    render(
      <SecurityIntegrationsGridTabs
        {...props}
        selectedTab={{ ...INTEGRATION_TABS[0], appendAutoImportCard: true }}
        setSelectedTabId={mockSetTabId}
      />,
      { wrapper: TestProviders }
    );

    await waitFor(() => {
      expect(mockPackageList.mock.calls[0][0].list).toEqual([
        expect.objectContaining({ id: 'placeholder:auto_import' }),
      ]);
    });
  });
});
