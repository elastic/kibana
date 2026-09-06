/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { AuthenticatedUser } from '@kbn/core-security-common';
import { useKibana } from '../hooks/use_kibana';
import { useAuthenticatedUser } from '../hooks/use_authenticated_user';
import { useDeploymentStats } from '../hooks/use_deployment_stats';
import { HomePageBanner } from './home_page_banner';
import { HomePage } from './home_page';

jest.mock('../hooks/use_kibana', () => ({ useKibana: jest.fn() }));
jest.mock('../hooks/use_authenticated_user', () => ({ useAuthenticatedUser: jest.fn() }));
jest.mock('../hooks/use_deployment_stats', () => ({ useDeploymentStats: jest.fn() }));

jest.mock('@kbn/vectordb-onboarding', () => ({
  ConnectToProject: () => <div data-test-subj="connectToProject" />,
  useOnboardingCredentials: () => ({ elasticsearchUrl: null, apiKey: null, isLoading: false }),
}));

jest.mock('@kbn/shared-components', () => ({
  TrialUsageBadge: () => <div data-test-subj="trialUsageBadge" />,
}));

jest.mock('./home_page_banner', () => ({ HomePageBanner: jest.fn(() => null) }));
jest.mock('./add_data_section', () => ({
  AddDataSection: () => <div data-test-subj="addDataSection" />,
}));
jest.mock('./chat_with_data_section', () => ({
  ChatWithYourDataSection: () => <div data-test-subj="chatWithDataSection" />,
}));

const mockUseKibana = useKibana as jest.Mock;
const mockUseAuthenticatedUser = useAuthenticatedUser as jest.Mock;
const mockUseDeploymentStats = useDeploymentStats as jest.Mock;
const mockHomePageBanner = HomePageBanner as unknown as jest.Mock;

const DOCS_URL = 'https://elastic.co/docs/vector-database';

const stats = {
  indicesCount: 3,
  documentsCount: 42,
  vectorCount: 120,
  storeSizeBytes: 2048,
  dashboardsCount: 5,
  starredDashboardsCount: 4,
  workflowsCount: 9,
  workflowsRunningCount: 6,
  apiKeysCount: 7,
  expiringApiKeysCount: 8,
};

const emptyStats = {
  indicesCount: 0,
  documentsCount: 0,
  vectorCount: 0,
  storeSizeBytes: 0,
  dashboardsCount: 0,
  starredDashboardsCount: 0,
  workflowsCount: 0,
  workflowsRunningCount: 0,
  apiKeysCount: 0,
  expiringApiKeysCount: 0,
};

describe('HomePage', () => {
  const navigateToApp = jest.fn();
  const isInTrial = jest.fn();

  const mockServices = ({
    cloud = { isInTrial },
    canMonitorAllIndices = true,
  }: { cloud?: object | null; canMonitorAllIndices?: boolean } = {}) => {
    mockUseKibana.mockReturnValue({
      services: {
        cloud,
        application: {
          navigateToApp,
          capabilities: { vectordbIndexStats: { canMonitorAllIndices } },
        },
        docLinks: { links: { enterpriseSearch: { vectorDatabaseFullTextSearch: DOCS_URL } } },
      },
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    isInTrial.mockReturnValue(false);
    mockServices();
    mockUseAuthenticatedUser.mockReturnValue({ user: undefined });
    mockUseDeploymentStats.mockReturnValue({ stats, isLoading: false });
    mockHomePageBanner.mockImplementation(() => null);
  });

  describe('the welcome title', () => {
    const user = (overrides: Partial<AuthenticatedUser>) =>
      mockUseAuthenticatedUser.mockReturnValue({ user: overrides as AuthenticatedUser });

    it('greets the user by full name', () => {
      user({ full_name: 'Jane Doe', email: 'jane@elastic.co' });

      render(<HomePage />);

      expect(screen.getByRole('heading', { name: 'Welcome, Jane Doe' })).toBeInTheDocument();
    });

    it('falls back to the email when there is no full name', () => {
      user({ full_name: '', email: 'jane@elastic.co' });

      render(<HomePage />);

      expect(screen.getByRole('heading', { name: 'Welcome, jane@elastic.co' })).toBeInTheDocument();
    });

    it('greets an unidentified user without a name', () => {
      mockUseAuthenticatedUser.mockReturnValue({ user: undefined });

      render(<HomePage />);

      expect(screen.getByRole('heading', { name: 'Welcome' })).toBeInTheDocument();
    });
  });

  describe('the trial badge', () => {
    it('is shown while the project is in trial', () => {
      isInTrial.mockReturnValue(true);

      render(<HomePage />);

      expect(screen.getByTestId('trialUsageBadge')).toBeInTheDocument();
    });

    it('is hidden outside of a trial', () => {
      isInTrial.mockReturnValue(false);

      render(<HomePage />);

      expect(screen.queryByTestId('trialUsageBadge')).not.toBeInTheDocument();
    });

    it('is hidden when the cloud service is unavailable', () => {
      // in trial, so the badge can only be hidden because the service is missing
      isInTrial.mockReturnValue(true);
      mockServices({ cloud: null });

      render(<HomePage />);

      expect(screen.queryByTestId('trialUsageBadge')).not.toBeInTheDocument();
    });
  });

  describe('the vectors stat', () => {
    it('is shown to a caller that can monitor every index', () => {
      render(<HomePage />);

      expect(screen.getByTestId('homePageDataCard-vectors')).toBeInTheDocument();
    });

    it('is hidden from a caller that cannot monitor every index', () => {
      mockServices({ canMonitorAllIndices: false });

      render(<HomePage />);

      expect(screen.queryByTestId('homePageDataCard-vectors')).not.toBeInTheDocument();
      expect(screen.getByTestId('homePageDataCard-totalIndices')).toBeInTheDocument();
    });

    it('is still shown when the caller may see the count but it could not be computed', () => {
      mockUseDeploymentStats.mockReturnValue({
        stats: { ...stats, vectorCount: null },
        isLoading: false,
      });

      render(<HomePage />);

      expect(screen.getByTestId('homePageDataCard-vectors')).toBeInTheDocument();
    });
  });

  describe('the onboarding banner', () => {
    const bannerProps = () => mockHomePageBanner.mock.calls[0][0];

    it('receives hasData=true when there is at least one index', () => {
      mockUseDeploymentStats.mockReturnValue({
        stats: { ...emptyStats, indicesCount: 1 },
        isLoading: false,
      });

      render(<HomePage />);

      expect(bannerProps()).toEqual(expect.objectContaining({ hasData: true }));
    });

    it('receives hasData=true when there is at least one vector', () => {
      mockUseDeploymentStats.mockReturnValue({
        stats: { ...emptyStats, vectorCount: 1 },
        isLoading: false,
      });

      render(<HomePage />);

      expect(bannerProps()).toEqual(expect.objectContaining({ hasData: true }));
    });

    it('receives hasData=false when there are no indices and no vectors', () => {
      mockUseDeploymentStats.mockReturnValue({ stats: emptyStats, isLoading: false });

      render(<HomePage />);

      expect(bannerProps()).toEqual(expect.objectContaining({ hasData: false }));
    });

    it('receives hasData=true when the counts are unavailable', () => {
      // a user without access to the stats may well have data, so don't nudge them to set up
      mockUseDeploymentStats.mockReturnValue({
        stats: { ...emptyStats, indicesCount: null, vectorCount: null },
        isLoading: false,
      });

      render(<HomePage />);

      expect(bannerProps()).toEqual(expect.objectContaining({ hasData: true }));
    });

    it('receives isLoading=true while the stats are in flight', () => {
      mockUseDeploymentStats.mockReturnValue({ stats: emptyStats, isLoading: true });

      render(<HomePage />);

      expect(bannerProps()).toEqual(expect.objectContaining({ isLoading: true }));
    });
  });
});
