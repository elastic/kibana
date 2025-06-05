/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { Router } from '@kbn/shared-ux-router';
import { SecurityRoutePageWrapper } from '.';
import { SecurityPageName } from '../../../../common';
import { TestProviders } from '../../mock';
import { generateHistoryMock } from '../../utils/route/mocks';
import type { LinkInfo } from '../../links';
import { useLinkInfo, useNavLinkExists } from '../../links';
import { useUpsellingPage } from '../../hooks/use_upselling';
import { SpyRoute } from '../../utils/route/spy_routes';

jest.mock('../../links');
jest.mock('../../hooks/use_upselling');
jest.mock('../../utils/route/spy_routes', () => ({
  SpyRoute: jest.fn(() => null),
}));

const mockUseLinkInfo = useLinkInfo as jest.Mock;
const mockUseNavLinkExists = useNavLinkExists as jest.Mock;
const mockUseUpsellingPage = useUpsellingPage as jest.Mock;

const defaultLinkInfo: LinkInfo = {
  id: SecurityPageName.exploreLanding,
  title: 'test',
  path: '/test',
};

const REDIRECT_COMPONENT_SUBJ = 'redirect-component';
const mockRedirect = jest.fn(() => <div data-test-subj={REDIRECT_COMPONENT_SUBJ} />);
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
    mockUseNavLinkExists.mockReturnValue(true);
    mockUseUpsellingPage.mockReturnValue(undefined);
  });

  it('should render UpsellPage when it is available', () => {
    mockUseUpsellingPage.mockReturnValue(TestUpsellPage);

    const { getByTestId } = render(
      <SecurityRoutePageWrapper pageName={SecurityPageName.exploreLanding}>
        <TestComponent />
      </SecurityRoutePageWrapper>,
      { wrapper: Wrapper }
    );

    expect(getByTestId(TEST_UPSELL_SUBJ)).toBeInTheDocument();
  });

  it('should render NoPrivilegesPage when link missing', () => {
    mockUseLinkInfo.mockReturnValue(undefined);
    mockUseNavLinkExists.mockReturnValue(false);

    const { getByTestId } = render(
      <SecurityRoutePageWrapper pageName={SecurityPageName.exploreLanding}>
        <TestComponent />
      </SecurityRoutePageWrapper>,
      { wrapper: Wrapper }
    );

    expect(getByTestId('noPrivilegesPage')).toBeInTheDocument();
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

  it('should render children when authorized', () => {
    mockUseLinkInfo.mockReturnValue(defaultLinkInfo);
    mockUseUpsellingPage.mockReturnValue(undefined);

    const { getByTestId } = render(
      <SecurityRoutePageWrapper pageName={SecurityPageName.exploreLanding}>
        <TestComponent />
      </SecurityRoutePageWrapper>,
      { wrapper: Wrapper }
    );

    expect(getByTestId(TEST_COMPONENT_SUBJ)).toBeInTheDocument();
  });

  describe('with redirectOnMissing flag', () => {
    it('should redirect when app link is missing', () => {
      mockUseLinkInfo.mockReturnValue(undefined);

      const { getByTestId } = render(
        <SecurityRoutePageWrapper pageName={SecurityPageName.exploreLanding} redirectOnMissing>
          <TestComponent />
        </SecurityRoutePageWrapper>,
        { wrapper: Wrapper }
      );

      expect(getByTestId(REDIRECT_COMPONENT_SUBJ)).toBeInTheDocument();
    });

    it('should redirect when the nav link does not exist', () => {
      mockUseNavLinkExists.mockReturnValue(false);

      const { getByTestId } = render(
        <SecurityRoutePageWrapper pageName={SecurityPageName.exploreLanding} redirectOnMissing>
          <TestComponent />
        </SecurityRoutePageWrapper>,
        { wrapper: Wrapper }
      );

      expect(getByTestId(REDIRECT_COMPONENT_SUBJ)).toBeInTheDocument();
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

    it('should render UpsellPage when it is available', () => {
      mockUseUpsellingPage.mockReturnValue(TestUpsellPage);

      const { getByTestId } = render(
        <SecurityRoutePageWrapper pageName={SecurityPageName.exploreLanding}>
          <TestComponent />
        </SecurityRoutePageWrapper>,
        { wrapper: Wrapper }
      );

      expect(getByTestId(TEST_UPSELL_SUBJ)).toBeInTheDocument();
    });
  });

  describe('when omitSpyRoute flag', () => {
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
