/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { Router } from '@kbn/shared-ux-router';
import { SecurityRoutePageWrapper } from './security_route_page_wrapper';
import { SecurityPageName } from '../../../../common';
import { TestProviders } from '../../mock';
import { generateHistoryMock } from '../../utils/route/mocks';
import type { LinkInfo } from '../../links';
import { useLinkInfo } from '../../links';
import { useUpsellingPage } from '../../hooks/use_upselling';
import { SpyRoute } from '../../utils/route/spy_routes';

jest.mock('../../links');
jest.mock('../../hooks/use_upselling');
jest.mock('../../utils/route/spy_routes', () => ({
  SpyRoute: jest.fn(() => null),
}));

const mockUseLinkInfo = useLinkInfo as jest.Mock;
const mockUseUpsellingPage = useUpsellingPage as jest.Mock;

const defaultLinkInfo: LinkInfo = {
  id: SecurityPageName.exploreLanding,
  title: 'test',
  path: '/test',
};

const mockRedirect = jest.fn(() => null);
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Redirect: () => mockRedirect(),
}));

const TEST_COMPONENT_SUBJ = 'test-component';
const TestComponent = () => <div data-test-subj={TEST_COMPONENT_SUBJ} />;

const TEST_UPSELL_SUBJ = 'test-upsell-page';
const TestUpsellPage = () => <div data-test-subj={TEST_UPSELL_SUBJ} />;

const mockHistory = generateHistoryMock();

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <Router history={mockHistory}>
    <TestProviders>{children}</TestProviders>
  </Router>
);

describe('SecurityRoutePageWrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseLinkInfo.mockReturnValue(defaultLinkInfo);
    mockUseUpsellingPage.mockReturnValue(undefined);
  });

  it('should render children the link allowed', () => {
    const { getByTestId } = render(
      <SecurityRoutePageWrapper pageName={SecurityPageName.exploreLanding}>
        <TestComponent />
      </SecurityRoutePageWrapper>,
      { wrapper: Wrapper }
    );

    expect(getByTestId(TEST_COMPONENT_SUBJ)).toBeInTheDocument();
  });

  it('should render the upselling when it is returned', () => {
    mockUseUpsellingPage.mockReturnValue(TestUpsellPage);

    const { getByTestId } = render(
      <SecurityRoutePageWrapper pageName={SecurityPageName.exploreLanding}>
        <TestComponent />
      </SecurityRoutePageWrapper>,
      { wrapper: Wrapper }
    );

    expect(getByTestId(TEST_UPSELL_SUBJ)).toBeInTheDocument();
  });

  it('should redirect to landing when link is missing', () => {
    mockUseLinkInfo.mockReturnValue(undefined);

    render(
      <SecurityRoutePageWrapper pageName={SecurityPageName.exploreLanding}>
        <TestComponent />
      </SecurityRoutePageWrapper>,
      { wrapper: Wrapper }
    );

    expect(mockRedirect).toHaveBeenCalled();
  });

  it('should render NoPrivilegesPage when unauthorized', () => {
    mockUseLinkInfo.mockReturnValue({ ...defaultLinkInfo, unauthorized: true });

    const { getByTestId } = render(
      <SecurityRoutePageWrapper pageName={SecurityPageName.exploreLanding}>
        <TestComponent />
      </SecurityRoutePageWrapper>,
      { wrapper: Wrapper }
    );

    expect(getByTestId('noPrivilegesPage')).toBeInTheDocument();
  });

  it('should redirect when unavailable', () => {
    mockUseLinkInfo.mockReturnValue({ ...defaultLinkInfo, unavailable: true });

    render(
      <SecurityRoutePageWrapper pageName={SecurityPageName.exploreLanding}>
        <TestComponent />
      </SecurityRoutePageWrapper>,
      { wrapper: Wrapper }
    );

    expect(mockRedirect).toHaveBeenCalled();
  });

  describe('when omitSpyRoute flag is missing', () => {
    it('should render SpyRoute', () => {
      render(
        <SecurityRoutePageWrapper pageName={SecurityPageName.exploreLanding}>
          <TestComponent />
        </SecurityRoutePageWrapper>,
        { wrapper: Wrapper }
      );

      expect(SpyRoute).toHaveBeenCalled();
    });
  });

  describe('when omitSpyRoute flag is present', () => {
    it('should not render SpyRoute', () => {
      render(
        <SecurityRoutePageWrapper pageName={SecurityPageName.exploreLanding} omitSpyRoute>
          <TestComponent />
        </SecurityRoutePageWrapper>,
        { wrapper: Wrapper }
      );

      // SpyRoute was mocked, so if omitSpyRoute worked, it should not have been called
      expect(SpyRoute).not.toHaveBeenCalled();
    });
  });
});
