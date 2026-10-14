/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { useKibana } from '../../hooks/use_kibana';
import { SearchHomepagePage } from './search_homepage';

jest.mock('../../hooks/use_kibana', () => ({ useKibana: jest.fn() }));
jest.mock('../../hooks/use_authenticated_user', () => ({
  useAuthenticatedUser: () => ({ user: undefined }),
}));
jest.mock('@kbn/shared-ux-page-kibana-template', () => {
  const Template = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  Template.Section = Template;
  return { KibanaPageTemplate: Template };
});
jest.mock('@kbn/shared-components', () => ({
  TrialUsageBadge: () => <div data-test-subj="trialUsageBadge" />,
  CloudLinks: () => null,
}));
jest.mock('@kbn/search-shared-ui', () => ({ KibanaVersionBadge: () => null }));
jest.mock('./basic_metric_badges', () => ({ BasicMetricBadges: () => null }));
jest.mock('./connect_to_elasticsearch', () => ({ ConnectToElasticsearch: () => null }));
jest.mock('./search_homepage_body', () => ({ SearchHomepageBody: () => null }));
jest.mock('./license_badge', () => ({ LicenseBadge: () => null }));

const mockUseKibana = useKibana as jest.Mock;

const renderPage = ({
  isInTrial,
  isServerlessEnabled,
}: {
  isInTrial: boolean;
  isServerlessEnabled: boolean;
}) => {
  mockUseKibana.mockReturnValue({
    services: {
      cloud: { isInTrial: () => isInTrial, isServerlessEnabled, isCloudEnabled: true },
      kibanaVersion: '9.6.0',
    },
  });
  render(
    <EuiThemeProvider>
      <SearchHomepagePage />
    </EuiThemeProvider>
  );
};

describe('SearchHomepagePage', () => {
  it('shows the trial badge while a Cloud Hosted deployment is in trial', () => {
    renderPage({ isInTrial: true, isServerlessEnabled: false });

    expect(screen.getByTestId('trialUsageBadge')).toBeInTheDocument();
  });

  it('hides the trial badge on Serverless, which shows it in the header', () => {
    renderPage({ isInTrial: true, isServerlessEnabled: true });

    expect(screen.queryByTestId('trialUsageBadge')).not.toBeInTheDocument();
  });

  it('hides the trial badge outside of a trial', () => {
    renderPage({ isInTrial: false, isServerlessEnabled: false });

    expect(screen.queryByTestId('trialUsageBadge')).not.toBeInTheDocument();
  });
});
