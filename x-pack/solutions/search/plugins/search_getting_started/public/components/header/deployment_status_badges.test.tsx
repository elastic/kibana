/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { useKibana } from '../../hooks/use_kibana';
import { DeploymentStatusBadges } from './deployment_status_badges';

jest.mock('../../hooks/use_kibana', () => ({ useKibana: jest.fn() }));
jest.mock('@kbn/shared-components', () => ({
  TrialUsageBadge: () => <div data-test-subj="trialUsageBadge" />,
}));
jest.mock('@kbn/search-shared-ui', () => ({
  KibanaVersionBadge: () => <div data-test-subj="kibanaVersionBadge" />,
}));

const mockUseKibana = useKibana as jest.Mock;

const renderBadges = ({
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
  render(<DeploymentStatusBadges />);
};

describe('DeploymentStatusBadges', () => {
  it('shows the trial badge while a Cloud Hosted deployment is in trial', () => {
    renderBadges({ isInTrial: true, isServerlessEnabled: false });

    expect(screen.getByTestId('trialUsageBadge')).toBeInTheDocument();
  });

  it('hides the trial badge on Serverless, which shows it in the header', () => {
    renderBadges({ isInTrial: true, isServerlessEnabled: true });

    expect(screen.queryByTestId('trialUsageBadge')).not.toBeInTheDocument();
  });

  it('hides the trial badge outside of a trial', () => {
    renderBadges({ isInTrial: false, isServerlessEnabled: false });

    expect(screen.queryByTestId('trialUsageBadge')).not.toBeInTheDocument();
  });
});
