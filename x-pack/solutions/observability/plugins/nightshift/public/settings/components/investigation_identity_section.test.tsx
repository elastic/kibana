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

let mockStatus: { isLoading: boolean; data?: Record<string, unknown> };

jest.mock('../../service_account/use_investigator_service_account', () => ({
  ...jest.requireActual('../../service_account/use_investigator_service_account'),
  useInvestigatorServiceAccount: () => mockStatus,
}));

const status = (overrides: Record<string, unknown> = {}) => ({
  isLoading: false,
  data: {
    serviceAccountsEnabled: true,
    serviceAccountId: 'kibana/nightshift_agent',
    role: 'nightshift_agent',
    bound: true,
    serviceAccounts: [
      { kind: 'agent', id: 'kibana/nightshift_agent', role: 'nightshift_agent' },
      {
        kind: 'automations',
        id: 'kibana/nightshift_automations',
        role: 'nightshift_automations',
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
    expect(screen.getByText('kibana/nightshift_agent')).toBeInTheDocument();
    expect(screen.getByText('nightshift_agent')).toBeInTheDocument();
    expect(screen.getByText('kibana/nightshift_automations')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('flags a space whose setup was removed', () => {
    mockStatus = status({ installed: false, enabled: null });
    renderSection();

    expect(screen.getByTestId('nightshiftServiceAccountOff')).toBeInTheDocument();
  });
});
