/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EntityAnalyticsOverviewContent } from './routes';

jest.mock('./pages/threat_hunting_home_page', () => ({
  ThreatHuntingHomePage: jest.fn(() => <div data-test-subj="threatHuntingHome" />),
}));

jest.mock('./pages/entity_analytics_overview_page', () => ({
  OverviewDashboard: jest.fn(() => <div data-test-subj="legacyOverview" />),
}));

jest.mock('../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn(),
}));

const useIsExperimentalFeatureEnabledMock = jest.requireMock(
  '../common/hooks/use_experimental_features'
).useIsExperimentalFeatureEnabled as jest.Mock;

describe('EntityAnalyticsOverviewContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the threat hunting home when the experimental flag is enabled', () => {
    useIsExperimentalFeatureEnabledMock.mockReturnValue(true);

    render(<EntityAnalyticsOverviewContent />);

    expect(screen.getByTestId('threatHuntingHome')).toBeInTheDocument();
  });

  it('renders the legacy overview when the experimental flag is disabled', () => {
    useIsExperimentalFeatureEnabledMock.mockReturnValue(false);

    render(<EntityAnalyticsOverviewContent />);

    expect(screen.getByTestId('legacyOverview')).toBeInTheDocument();
  });
});
