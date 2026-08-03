/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route } from '@kbn/shared-ux-router';
import { RuleDetailsRedirect, RuleDetailsTabGuard } from './routes';
import { useUserPrivileges } from '../common/components/user_privileges';
import { useEndpointExceptionsCapability } from '../exceptions/hooks/use_endpoint_exceptions_capability';
import { RuleDetailTabs } from '../detection_engine/rule_details_ui/pages/rule_details/use_rule_details_tabs';

jest.mock('../common/components/user_privileges');
jest.mock('../exceptions/hooks/use_endpoint_exceptions_capability');
// Mock RuleDetailsPage to display the current tab from route params
jest.mock('../detection_engine/rule_details_ui/pages/rule_details', () => {
  // import useParams directly from react-router-dom because the wrapper @kbn/shared-ux-router does not expose it
  const useParams = jest.requireActual('react-router-dom').useParams;
  return {
    RuleDetailsPage: () => {
      const { tabName } = useParams();
      return <div data-test-subj={`ruleDetailsPage-${tabName}`} />;
    },
  };
});

const mockUseUserPrivileges = useUserPrivileges as jest.MockedFunction<typeof useUserPrivileges>;
const mockUseEndpointExceptionsCapability = useEndpointExceptionsCapability as jest.MockedFunction<
  typeof useEndpointExceptionsCapability
>;

const ruleId = 'test-rule-id';

describe('RuleDetailsRedirect', () => {
  const doRender = (initialPath: string): { pathname: string; search: string } => {
    let pathname = '';
    let search = '';
    render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Route path="/rules/id/:detailName" exact>
          <RuleDetailsRedirect />
        </Route>
        <Route
          path="*"
          render={({ location }) => {
            pathname = location.pathname;
            search = location.search;
            return null;
          }}
        />
      </MemoryRouter>
    );
    return {
      pathname,
      search,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to the correct path with default landing tab', () => {
    const { pathname } = doRender(`/rules/id/${ruleId}`);
    expect(pathname).toBe(`/rules/id/${ruleId}/${RuleDetailTabs.overview}`);
  });

  it('preserves query parameters during redirect', () => {
    const { pathname, search } = doRender(`/rules/id/${ruleId}?foo=bar&baz=qux`);
    expect(pathname).toBe(`/rules/id/${ruleId}/${RuleDetailTabs.overview}`);
    expect(search).toBe('?foo=bar&baz=qux');
  });
});

describe('RuleDetailsTabGuard', () => {
  const doRender = (initialPath: string) => {
    const renderResult = render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Route path="/rules/id/:detailName/:tabName">
          <RuleDetailsTabGuard />
        </Route>
      </MemoryRouter>
    );

    const getExpectedLandingTab = (tabName: string) =>
      renderResult.getByTestId(`ruleDetailsPage-${tabName}`);

    return { getExpectedLandingTab };
  };

  const defaultPrivileges = {
    alertsPrivileges: { alerts: { read: true } },
    rulesPrivileges: { exceptions: { read: true } },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUserPrivileges.mockReturnValue(
      defaultPrivileges as ReturnType<typeof useUserPrivileges>
    );
    mockUseEndpointExceptionsCapability.mockReturnValue(true);
  });

  describe('when user has access to a tab', () => {
    it('renders RuleDetailsPage for alerts tab when user can read alerts', () => {
      const { getExpectedLandingTab } = doRender(`/rules/id/${ruleId}/${RuleDetailTabs.alerts}`);
      expect(getExpectedLandingTab(RuleDetailTabs.alerts)).toBeInTheDocument();
    });

    it('renders RuleDetailsPage for exceptions tab when user can read exceptions', () => {
      const { getExpectedLandingTab } = doRender(
        `/rules/id/${ruleId}/${RuleDetailTabs.exceptions}`
      );
      expect(getExpectedLandingTab(RuleDetailTabs.exceptions)).toBeInTheDocument();
    });

    it('renders RuleDetailsPage for endpoint exceptions when user can read endpoint exceptions', () => {
      const { getExpectedLandingTab } = doRender(
        `/rules/id/${ruleId}/${RuleDetailTabs.endpointExceptions}`
      );
      expect(getExpectedLandingTab(RuleDetailTabs.endpointExceptions)).toBeInTheDocument();
    });

    it('renders RuleDetailsPage for execution results tab', () => {
      const { getExpectedLandingTab } = doRender(
        `/rules/id/${ruleId}/${RuleDetailTabs.executionResults}`
      );
      expect(getExpectedLandingTab(RuleDetailTabs.executionResults)).toBeInTheDocument();
    });
  });

  describe('when user does not have access to a tab', () => {
    const defaultLandingTab = RuleDetailTabs.overview;
    beforeEach(() => {
      mockUseUserPrivileges.mockReturnValue({
        alertsPrivileges: { alerts: { read: false } },
        rulesPrivileges: { exceptions: { read: false } },
      } as ReturnType<typeof useUserPrivileges>);
      mockUseEndpointExceptionsCapability.mockReturnValue(false);
    });

    it('redirects to the default landing tab when user does not have access to alerts', () => {
      const { getExpectedLandingTab } = doRender(`/rules/id/${ruleId}/${RuleDetailTabs.alerts}`);
      expect(getExpectedLandingTab(defaultLandingTab)).toBeInTheDocument();
    });

    it('redirects to the default landing tab when user does not have access to exceptions', () => {
      const { getExpectedLandingTab } = doRender(
        `/rules/id/${ruleId}/${RuleDetailTabs.exceptions}`
      );
      expect(getExpectedLandingTab(defaultLandingTab)).toBeInTheDocument();
    });

    it('redirects to the default landing tab when user does not have access to endpoint exceptions', () => {
      const { getExpectedLandingTab } = doRender(
        `/rules/id/${ruleId}/${RuleDetailTabs.endpointExceptions}`
      );
      expect(getExpectedLandingTab(defaultLandingTab)).toBeInTheDocument();
    });
  });
});
