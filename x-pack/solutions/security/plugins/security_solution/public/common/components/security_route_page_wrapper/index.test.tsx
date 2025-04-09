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
import { useLinkInfo } from '../../links';
import { useUpsellingPage } from '../../hooks/use_upselling';
import { SpyRoute } from '../../utils/route/spy_routes';

jest.mock('../../links');
jest.mock('../../hooks/use_upselling');
jest.mock('../../utils/route/spy_routes', () => ({
  SpyRoute: jest.fn(() => null),
}));

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
const mockHistory = generateHistoryMock();

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <Router history={mockHistory}>
    <TestProviders>{children}</TestProviders>
  </Router>
);

describe('SecurityRoutePageWrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render UpsellPage when it is available', () => {
    const TEST_ID = 'test-upsell-page';
    const TestUpsellPage = () => <div data-test-subj={TEST_ID} />;

    (useLinkInfo as jest.Mock).mockReturnValue(defaultLinkInfo);
    (useUpsellingPage as jest.Mock).mockReturnValue(TestUpsellPage);

    const { getByTestId } = render(
      <SecurityRoutePageWrapper pageName={SecurityPageName.exploreLanding}>
        <TestComponent />
      </SecurityRoutePageWrapper>,
      { wrapper: Wrapper }
    );

    expect(getByTestId(TEST_ID)).toBeInTheDocument();
  });

  it('should redirect when link missing and redirectOnMissing flag present', () => {
    (useLinkInfo as jest.Mock).mockReturnValue(undefined);
    (useUpsellingPage as jest.Mock).mockReturnValue(undefined);

    const { getByTestId } = render(
      <SecurityRoutePageWrapper pageName={SecurityPageName.exploreLanding} redirectOnMissing>
        <TestComponent />
      </SecurityRoutePageWrapper>,
      { wrapper: Wrapper }
    );

    expect(getByTestId(REDIRECT_COMPONENT_SUBJ)).toBeInTheDocument();
  });

  it('should redirect when link missing and redirectIfUnauthorized flag present', () => {
    (useLinkInfo as jest.Mock).mockReturnValue(undefined);
    (useUpsellingPage as jest.Mock).mockReturnValue(undefined);

    const { getByTestId } = render(
      <SecurityRoutePageWrapper pageName={SecurityPageName.exploreLanding} redirectIfUnauthorized>
        <TestComponent />
      </SecurityRoutePageWrapper>,
      { wrapper: Wrapper }
    );

    expect(getByTestId(REDIRECT_COMPONENT_SUBJ)).toBeInTheDocument();
  });

  it('should redirect when link is unauthorized and redirectIfUnauthorized flag present', () => {
    (useLinkInfo as jest.Mock).mockReturnValue({ ...defaultLinkInfo, unauthorized: true });
    (useUpsellingPage as jest.Mock).mockReturnValue(undefined);

    const { getByTestId } = render(
      <SecurityRoutePageWrapper pageName={SecurityPageName.exploreLanding} redirectIfUnauthorized>
        <TestComponent />
      </SecurityRoutePageWrapper>,
      { wrapper: Wrapper }
    );

    expect(getByTestId(REDIRECT_COMPONENT_SUBJ)).toBeInTheDocument();
  });

  it('should render NoPrivilegesPage when link missing and UpsellPage is undefined', () => {
    (useLinkInfo as jest.Mock).mockReturnValue(undefined);
    (useUpsellingPage as jest.Mock).mockReturnValue(undefined);

    const { getByTestId } = render(
      <SecurityRoutePageWrapper pageName={SecurityPageName.exploreLanding}>
        <TestComponent />
      </SecurityRoutePageWrapper>,
      { wrapper: Wrapper }
    );

    expect(getByTestId('noPrivilegesPage')).toBeInTheDocument();
  });

  it('should render NoPrivilegesPage when unauthorized and UpsellPage is undefined', () => {
    (useLinkInfo as jest.Mock).mockReturnValue({ ...defaultLinkInfo, unauthorized: true });
    (useUpsellingPage as jest.Mock).mockReturnValue(undefined);

    const { getByTestId } = render(
      <SecurityRoutePageWrapper pageName={SecurityPageName.exploreLanding}>
        <TestComponent />
      </SecurityRoutePageWrapper>,
      { wrapper: Wrapper }
    );

    expect(getByTestId('noPrivilegesPage')).toBeInTheDocument();
  });

  it('should render children when authorized', () => {
    (useLinkInfo as jest.Mock).mockReturnValue(defaultLinkInfo);
    (useUpsellingPage as jest.Mock).mockReturnValue(undefined);

    const { getByTestId } = render(
      <SecurityRoutePageWrapper pageName={SecurityPageName.exploreLanding}>
        <TestComponent />
      </SecurityRoutePageWrapper>,
      { wrapper: Wrapper }
    );

    expect(getByTestId(TEST_COMPONENT_SUBJ)).toBeInTheDocument();
  });
  it('should not render SpyRoute when omitSpyRoute is set to true', () => {
    (useLinkInfo as jest.Mock).mockReturnValue(defaultLinkInfo);
    (useUpsellingPage as jest.Mock).mockReturnValue(undefined);

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
