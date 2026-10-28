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

let mockStatus: {
  isLoading: boolean;
  data?: Record<string, unknown>;
  error?: Error;
  refetch?: () => void;
};

jest.mock('../../service_account/use_investigator_service_account', () => ({
  ...jest.requireActual('../../service_account/use_investigator_service_account'),
  useInvestigatorServiceAccount: () => mockStatus,
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
});
