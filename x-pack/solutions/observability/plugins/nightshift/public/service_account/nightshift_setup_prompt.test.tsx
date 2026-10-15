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
  serviceAccountId: 'kibana/nightshift-agent-default',
  role: 'nightshift_agent_default',
  bound: false,
  serviceAccounts: [],
  boundWorkflows: [],
  workflowId: 'system-nightshift-investigation-bound-default',
  installed: false,
  enabled: null,
  slackThreadInstalled: false,
  ...overrides,
});

const renderPrompt = (props: { canManage: boolean; serviceAccountsEnabled?: boolean }) =>
  render(
    <I18nProvider>
      <NightshiftSetupPrompt
        canManage={props.canManage}
        status={status({ serviceAccountsEnabled: props.serviceAccountsEnabled ?? true })}
      />
    </I18nProvider>
  );

describe('NightshiftSetupPrompt', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lets an admin enable the service account', () => {
    renderPrompt({ canManage: true });

    fireEvent.click(screen.getByTestId('nightshiftSetUpServiceAccount'));
    expect(mockMutate).toHaveBeenCalledTimes(1);
  });

  it('tells other users to ask an administrator', () => {
    renderPrompt({ canManage: false });

    expect(screen.getByTestId('nightshiftSetupAskAdmin')).toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftSetUpServiceAccount')).not.toBeInTheDocument();
  });

  it('explains the missing setting when service accounts are turned off', () => {
    renderPrompt({ canManage: true, serviceAccountsEnabled: false });

    expect(screen.getByTestId('nightshiftSetupServiceAccountsOff')).toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftSetUpServiceAccount')).not.toBeInTheDocument();
  });
});
