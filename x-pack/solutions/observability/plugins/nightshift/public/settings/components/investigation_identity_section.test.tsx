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
    serviceAccountId: 'kibana/nightshift-agent-default',
    role: 'nightshift_agent_default',
    bound: true,
    serviceAccounts: [
      { kind: 'agent', id: 'kibana/nightshift-agent-default', role: 'nightshift_agent_default' },
      { kind: 'relay', id: 'kibana/relay-default', role: 'nightshift_agent_default' },
    ],
    boundWorkflows: [],
    workflowId: 'system-nightshift-investigation-bound-default',
    installed: true,
    enabled: true,
    slackThreadInstalled: true,
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
    expect(screen.getByText('kibana/nightshift-agent-default')).toBeInTheDocument();
    expect(screen.getByText('nightshift_agent_default')).toBeInTheDocument();
    expect(screen.getByText('kibana/relay-default')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('flags a space whose setup was removed', () => {
    mockStatus = status({ installed: false, enabled: null });
    renderSection();

    expect(screen.getByTestId('nightshiftServiceAccountOff')).toBeInTheDocument();
  });
});
