/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { SecurityPageName } from '../../../app/types';
import { TestProviders } from '../../../common/mock';
import { DashboardsLandingPage } from '.';
import { useCapabilities } from '../../../common/lib/kibana';
import { METRIC_TYPE, TELEMETRY_EVENT } from '../../../common/lib/telemetry/constants';
import * as telemetry from '../../../common/lib/telemetry/track';
import { MOCK_TAG_NAME } from '../../../common/containers/tags/__mocks__/api';
import { DashboardContextProvider } from '../../context/dashboard_context';
import { act } from 'react-dom/test-utils';
import type { NavigationLink } from '../../../common/links/types';
import { DashboardListingTable } from '@kbn/dashboard-plugin/public';
import { DASHBOARDS_PAGE_SECTION_CUSTOM } from './translations';

jest.mock('../../../common/containers/tags/api');
jest.mock('../../../common/lib/kibana');
jest.mock('../../../common/utils/route/spy_routes', () => ({ SpyRoute: () => null }));
jest.mock('@kbn/dashboard-plugin/public', () => ({
  DashboardListingTable: jest.fn().mockReturnValue(<span data-test-subj="dashboardsTable" />),
  DashboardTopNav: jest.fn().mockReturnValue(<span data-test-subj="dashboardTopNav" />),
}));

const mockUseContractComponents = jest.fn(() => ({}));
jest.mock('../../../common/hooks/use_contract_component', () => ({
  useContractComponents: () => mockUseContractComponents(),
}));

const DEFAULT_DASHBOARD_CAPABILITIES = { show: true, createNew: true };
const mockUseCapabilities = useCapabilities as jest.Mock;
mockUseCapabilities.mockReturnValue(DEFAULT_DASHBOARD_CAPABILITIES);
const spyTrack = jest.spyOn(telemetry, 'track');

const OVERVIEW_ITEM_LABEL = 'Overview';
const DETECTION_RESPONSE_ITEM_LABEL = 'Detection & Response';

const APP_DASHBOARD_LINKS: NavigationLink = {
  id: SecurityPageName.dashboards,
  title: 'Dashboards',
  links: [
    {
      id: SecurityPageName.overview,
      title: OVERVIEW_ITEM_LABEL,
      description: '',
      landingIcon: 'testIcon1',
    },
    {
      id: SecurityPageName.detectionAndResponse,
      title: DETECTION_RESPONSE_ITEM_LABEL,
      description: '',
      landingIcon: 'testIcon2',
    },
  ],
};
const URL = '/path/to/dashboards';

const mockAppManageLink = jest.fn(() => APP_DASHBOARD_LINKS);
jest.mock('../../../common/links/nav_links', () => ({
  useRootNavLink: () => mockAppManageLink(),
}));

const CREATE_DASHBOARD_LINK = { isLoading: false, url: URL };
const mockUseCreateSecurityDashboard = jest.fn(() => CREATE_DASHBOARD_LINK);
jest.mock('../../hooks/use_create_security_dashboard_link', () => {
  const actual = jest.requireActual('../../hooks/use_create_security_dashboard_link');
  return {
    ...actual,
    useCreateSecurityDashboardLink: () => mockUseCreateSecurityDashboard(),
  };
});

const TestComponent = () => (
  <TestProviders>
    <DashboardContextProvider>
      <DashboardsLandingPage />
    </DashboardContextProvider>
  </TestProviders>
);

const renderDashboardLanding = async () => {
  await act(async () => {
    render(<TestComponent />);
  });
};

describe('Dashboards landing', () => {
  beforeEach(() => {
    mockUseCapabilities.mockReturnValue(DEFAULT_DASHBOARD_CAPABILITIES);
    mockUseCreateSecurityDashboard.mockReturnValue(CREATE_DASHBOARD_LINK);
  });

  describe('Dashboards default links', () => {
    it('should render custom dashboard listing title', async () => {
      await renderDashboardLanding();

      expect(screen.queryByText(DASHBOARDS_PAGE_SECTION_CUSTOM)).toBeInTheDocument();
    });

    it('should render items', async () => {
      await renderDashboardLanding();

      expect(screen.queryByText(OVERVIEW_ITEM_LABEL)).toBeInTheDocument();
      expect(screen.queryByText(DETECTION_RESPONSE_ITEM_LABEL)).toBeInTheDocument();
    });

    it('should render items in the same order as defined', async () => {
      mockAppManageLink.mockReturnValueOnce({
        ...APP_DASHBOARD_LINKS,
      });
      await renderDashboardLanding();

      const renderedItems = screen.queryAllByTestId('LandingImageCard-item');

      expect(renderedItems[0]).toHaveTextContent(OVERVIEW_ITEM_LABEL);
      expect(renderedItems[1]).toHaveTextContent(DETECTION_RESPONSE_ITEM_LABEL);
    });

    it('should not render items if all items filtered', async () => {
      mockAppManageLink.mockReturnValue({
        ...APP_DASHBOARD_LINKS,
        links: [],
      });
      await renderDashboardLanding();

      expect(screen.queryByText(OVERVIEW_ITEM_LABEL)).not.toBeInTheDocument();
      expect(screen.queryByText(DETECTION_RESPONSE_ITEM_LABEL)).not.toBeInTheDocument();
    });
  });

  describe('Security Dashboards', () => {
    it('should render dashboards table', async () => {
      await renderDashboardLanding();

      expect(screen.getByTestId('dashboardsTable')).toBeInTheDocument();
    });

    it('should call DashboardListingTable with correct initialFilter', async () => {
      await renderDashboardLanding();

      expect((DashboardListingTable as jest.Mock).mock.calls[0][0].initialFilter).toEqual(
        `tag:("${MOCK_TAG_NAME}")`
      );
    });

    it('should not render dashboards table if no read capability', async () => {
      mockUseCapabilities.mockReturnValue({
        ...DEFAULT_DASHBOARD_CAPABILITIES,
        show: false,
      });
      await renderDashboardLanding();

      expect(screen.queryByTestId('dashboardsTable')).not.toBeInTheDocument();
    });

    it('should not render loading icon if no read capability', async () => {
      mockUseCapabilities.mockReturnValue({
        ...DEFAULT_DASHBOARD_CAPABILITIES,
        show: false,
      });
      await renderDashboardLanding();

      expect(screen.queryByTestId('dashboardLoadingIcon')).not.toBeInTheDocument();
    });

    describe('Create Security Dashboard button', () => {
      it('should render', async () => {
        await renderDashboardLanding();

        expect(screen.getByTestId('createDashboardButton')).toBeInTheDocument();
      });

      it('should not render if no write capability', async () => {
        mockUseCapabilities.mockReturnValue({
          ...DEFAULT_DASHBOARD_CAPABILITIES,
          createNew: false,
        });
        await renderDashboardLanding();

        expect(screen.queryByTestId('createDashboardButton')).not.toBeInTheDocument();
      });

      it('should be enabled when link loaded', async () => {
        await renderDashboardLanding();

        expect(screen.getByTestId('createDashboardButton')).not.toHaveAttribute('disabled');
      });

      it('should be disabled when link is not loaded', async () => {
        mockUseCreateSecurityDashboard.mockReturnValue({ isLoading: true, url: '' });
        await renderDashboardLanding();

        expect(screen.getByTestId('createDashboardButton')).toHaveAttribute('disabled');
      });

      it('should link to correct href', async () => {
        await renderDashboardLanding();

        expect(screen.getByTestId('createDashboardButton')).toHaveAttribute('href', URL);
      });

      it('should send telemetry', async () => {
        await renderDashboardLanding();
        screen.getByTestId('createDashboardButton').click();
        expect(spyTrack).toHaveBeenCalledWith(METRIC_TYPE.CLICK, TELEMETRY_EVENT.CREATE_DASHBOARD);
      });
    });
  });

  it('should render callout when available', async () => {
    const DashboardsLandingCallout = () => <span data-test-subj="callout-test" />;
    mockUseContractComponents.mockReturnValue({ DashboardsLandingCallout });

    await renderDashboardLanding();

    expect(screen.queryByTestId('callout-test')).toBeInTheDocument();
  });
});
