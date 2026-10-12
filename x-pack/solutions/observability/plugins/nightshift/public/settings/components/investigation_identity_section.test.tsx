/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { InvestigationIdentitySection } from './investigation_identity_section';

const mockMutate = jest.fn();
let mockStatus: { isLoading: boolean; data?: Record<string, unknown> };

jest.mock('../hooks/use_investigator_service_account', () => ({
  useInvestigatorServiceAccount: () => mockStatus,
  useSetInvestigatorServiceAccount: () => ({ mutate: mockMutate, isLoading: false }),
}));

const status = (overrides: Record<string, unknown> = {}) => ({
  isLoading: false,
  data: {
    serviceAccountsEnabled: true,
    serviceAccountId: 'kibana/nightshift_investigator',
    workflowId: 'system-nightshift-investigation-bound-default',
    installed: false,
    enabled: null,
    ...overrides,
  },
});

const renderSection = (canManage = true) =>
  render(
    <I18nProvider>
      <InvestigationIdentitySection canManage={canManage} />
    </I18nProvider>
  );

describe('InvestigationIdentitySection', () => {
  beforeEach(() => jest.clearAllMocks());

  it('offers to enable the service account when the space is not bound', () => {
    mockStatus = status();
    renderSection();

    expect(screen.getByTestId('nightshiftServiceAccountOff')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('nightshiftToggleServiceAccount'));
    expect(mockMutate).toHaveBeenCalledWith('enable');
  });

  it('shows the bound account and offers to switch back', () => {
    mockStatus = status({ installed: true, enabled: true });
    renderSection();

    expect(screen.getByTestId('nightshiftServiceAccountOn')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('nightshiftToggleServiceAccount'));
    expect(mockMutate).toHaveBeenCalledWith('disable');
  });

  it('disables the action without manage permission', () => {
    mockStatus = status();
    renderSection(false);

    expect(screen.getByTestId('nightshiftToggleServiceAccount')).toBeDisabled();
  });

  it('explains when service accounts are turned off', () => {
    mockStatus = status({ serviceAccountsEnabled: false });
    renderSection();

    expect(screen.queryByTestId('nightshiftToggleServiceAccount')).not.toBeInTheDocument();
    expect(
      screen.getByText('Service accounts are turned off in this deployment')
    ).toBeInTheDocument();
  });
});
