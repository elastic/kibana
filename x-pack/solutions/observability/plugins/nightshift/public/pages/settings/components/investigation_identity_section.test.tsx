/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { InvestigationIdentitySection } from './investigation_identity_section';
import { useDeveloperMode } from '../../../hooks/use_developer_mode';

jest.mock('../../../hooks/use_developer_mode');
const mockUseDeveloperMode = useDeveloperMode as jest.MockedFunction<typeof useDeveloperMode>;

let mockStatus: {
  isLoading: boolean;
  data?: Record<string, unknown>;
  error?: Error;
  refetch?: () => void;
};

jest.mock('../../../data/service_accounts/use_investigator_service_account', () => ({
  ...jest.requireActual('../../../data/service_accounts/use_investigator_service_account'),
  useInvestigatorServiceAccount: () => mockStatus,
}));

let mockDetection: {
  data?: Record<string, unknown>;
  isLoading?: boolean;
  isError?: boolean;
  error?: Error;
  refetch?: () => void;
} = {};
jest.mock('../../../data/service_accounts/use_detection_engine_service_account', () => ({
  useDetectionEngineServiceAccount: () => mockDetection,
}));

const status = (overrides: Record<string, unknown> = {}) => ({
  isLoading: false,
  data: {
    serviceAccountsEnabled: true,
    // Serverless assigns opaque ids.
    serviceAccountId: 'uiam-agent-1',
    role: '_nightshift_agent',
    bound: true,
    serviceAccounts: [
      { kind: 'agent', name: 'nightshift_agent', id: 'uiam-agent-1', role: '_nightshift_agent' },
      {
        kind: 'automations',
        name: 'nightshift_automations',
        id: 'uiam-automations-2',
        role: '_nightshift_automations',
      },
    ],
    boundWorkflows: [],
    workflowId: 'system-nightshift-investigation-bound-default',
    installed: true,
    enabled: true,
    ...overrides,
  },
});

const renderSection = () =>
  render(
    <I18nProvider>
      <InvestigationIdentitySection />
    </I18nProvider>
  );

describe('InvestigationIdentitySection', () => {
  beforeEach(() => {
    mockDetection = {
      data: { serviceAccountId: 'uiam-detection-3', role: '_nightshift_detection' },
    };
    mockUseDeveloperMode.mockReturnValue({
      isDeveloperMode: true,
      isSaving: false,
      setDeveloperMode: jest.fn(),
    });
  });

  it('hides the account details outside developer mode', () => {
    mockUseDeveloperMode.mockReturnValue({
      isDeveloperMode: false,
      isSaving: false,
      setDeveloperMode: jest.fn(),
    });
    mockStatus = status();
    renderSection();

    expect(screen.getByTestId('nightshiftServiceAccountOn')).toBeInTheDocument();
    const section = screen.getByTestId('nightshiftInvestigationIdentitySection');
    expect(section).not.toHaveTextContent('nightshift_agent');
    expect(section).not.toHaveTextContent('_nightshift_agent');
    expect(screen.queryByTestId('nightshiftServiceAccountOthers')).not.toBeInTheDocument();
  });

  it('shows the account Nightshift runs as, without a way to turn it off', () => {
    mockStatus = status();
    renderSection();

    expect(screen.getByTestId('nightshiftServiceAccountOn')).toBeInTheDocument();
    const section = screen.getByTestId('nightshiftInvestigationIdentitySection');
    expect(section).toHaveTextContent('nightshift_agent (uiam-agent-1)');
    expect(section).toHaveTextContent('_nightshift_agent');
    expect(screen.getByTestId('nightshiftServiceAccountOthers')).toHaveTextContent(
      'nightshift_automations (uiam-automations-2) · _nightshift_automations'
    );
    expect(screen.getByTestId('nightshiftServiceAccountOthers')).toHaveTextContent(
      'nightshift_detection (uiam-detection-3) · _nightshift_detection'
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('flags a space whose setup was removed', () => {
    mockStatus = status({ installed: false, enabled: null });
    renderSection();

    expect(screen.getByTestId('nightshiftServiceAccountOff')).toBeInTheDocument();
  });

  it('explains a failed status read and offers a retry', () => {
    const refetch = jest.fn();
    mockStatus = { isLoading: false, error: new Error('Forbidden'), refetch };
    renderSection();

    expect(screen.getByTestId('nightshiftServiceAccountError')).toHaveTextContent('Forbidden');
    screen.getByTestId('nightshiftServiceAccountRetry').click();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('waits for the detection status instead of reading the space as not set up', () => {
    mockStatus = status();
    mockDetection = { isLoading: true };
    renderSection();

    expect(screen.queryByTestId('nightshiftServiceAccountOff')).not.toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftServiceAccountOn')).not.toBeInTheDocument();
  });

  it('explains a failed detection status read and retries only that read', () => {
    const statusRefetch = jest.fn();
    const detectionRefetch = jest.fn();
    mockStatus = { ...status(), refetch: statusRefetch };
    mockDetection = {
      isLoading: false,
      isError: true,
      error: new Error('Service Unavailable'),
      refetch: detectionRefetch,
    };
    renderSection();

    expect(screen.getByTestId('nightshiftServiceAccountError')).toHaveTextContent(
      'Service Unavailable'
    );
    screen.getByTestId('nightshiftServiceAccountRetry').click();
    expect(detectionRefetch).toHaveBeenCalledTimes(1);
    expect(statusRefetch).not.toHaveBeenCalled();
  });
});
