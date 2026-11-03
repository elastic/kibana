/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { NightshiftSetupPrompt } from './nightshift_setup_prompt';

const mockMutate = jest.fn();

jest.mock('./use_investigator_service_account', () => ({
  useSetUpNightshiftServiceAccount: () => ({ mutate: mockMutate, isLoading: false }),
}));

const status = (overrides: Record<string, unknown> = {}) => ({
  serviceAccountsEnabled: true,
  canModifyBoundWorkflows: true,
  serviceAccountId: null,
  role: 'nightshift_agent',
  bound: false,
  serviceAccounts: [],
  boundWorkflows: [],
  workflowId: 'system-nightshift-investigation-bound-default',
  installed: false,
  enabled: null,
  ...overrides,
});

const renderPrompt = (overrides: Record<string, unknown> = {}) =>
  render(
    <I18nProvider>
      <NightshiftSetupPrompt status={status(overrides)} />
    </I18nProvider>
  );

describe('NightshiftSetupPrompt', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lets a user with manage_security enable Nightshift', () => {
    renderPrompt();

    expect(screen.getByText('One-time admin setup required for this space')).toBeInTheDocument();
    expect(screen.getByText('nightshift_agent')).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftSetupPrivilegesLink')).toHaveAttribute('target', '_blank');
    fireEvent.click(screen.getByTestId('nightshiftSetUpServiceAccount'));
    expect(mockMutate).toHaveBeenCalledTimes(1);
  });

  it('tells users without manage_security to ask an administrator', () => {
    renderPrompt({ canModifyBoundWorkflows: false });

    expect(screen.getByTestId('nightshiftSetupAskAdmin')).toHaveTextContent('manage_security');
    expect(screen.getByTestId('nightshiftSetUpServiceAccount')).toBeDisabled();
  });

  it('explains the missing setting when service accounts are turned off', () => {
    renderPrompt({ serviceAccountsEnabled: false });

    expect(screen.getByTestId('nightshiftSetupServiceAccountsOff')).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftSetUpServiceAccount')).toBeDisabled();
  });
});
