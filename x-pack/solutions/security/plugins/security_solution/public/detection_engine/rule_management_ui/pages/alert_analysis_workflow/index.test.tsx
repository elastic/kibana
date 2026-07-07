/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { focusManager } from '@kbn/react-query';
import { coreMock } from '@kbn/core/public/mocks';
import { TestProviders } from '../../../../common/mock';
import { createStartServicesMock } from '../../../../common/lib/kibana/kibana_react.mock';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { ALERT_ANALYSIS_WORKFLOW_API_VERSION, ALERT_ANALYSIS_WORKFLOW_SETTINGS_ROUTE } from './api';
import { AlertAnalysisWorkflowPage } from '.';

jest.mock('../../../../common/containers/use_full_screen', () => ({
  useGlobalFullScreen: () => ({
    globalFullScreen: false,
    setGlobalFullScreen: jest.fn(),
  }),
}));

jest.mock('../../../../common/hooks/use_license');
jest.mock('../../../../common/components/user_privileges');

const useUserPrivilegesMock = useUserPrivileges as jest.Mock;

describe('AlertAnalysisWorkflowPage', () => {
  const coreStart = coreMock.createStart();

  const settingsGetResponse = (
    settings: Record<string, unknown> = {
      autoCloseEnabled: true,
      autoCloseConfidenceScoreMinThreshold: 0.85,
      autoCloseConfidenceScoreMaxThreshold: 1,
    }
  ) => ({
    settings,
    workflowId: 'system-security-alert-analysis-default',
  });

  const renderComponent = () => {
    coreStart.application.capabilities = {
      ...coreStart.application.capabilities,
      advancedSettings: { show: true, save: true },
      securitySolution: { show: true, crud: true },
      workflowsManagement: { updateWorkflow: true },
    };
    // The page reads rules-edit via useUserPrivileges (not raw capabilities).
    useUserPrivilegesMock.mockReturnValue({
      rulesPrivileges: { rules: { read: true, edit: true } },
    });
    coreStart.application.getUrlForApp.mockImplementation(
      (appId, options) => `/app/${appId}${options?.path ?? ''}`
    );
    coreStart.http.fetch.mockImplementation(async (...args: unknown[]) => {
      const [path, options] = args as [string, { method?: string; body?: string } | undefined];

      if (path === ALERT_ANALYSIS_WORKFLOW_SETTINGS_ROUTE) {
        return options?.method === 'PUT'
          ? settingsGetResponse(JSON.parse(options.body as string))
          : settingsGetResponse();
      }

      return {
        page: 1,
        perPage: 5,
        total: 0,
        attached: 0,
        rules: [],
      };
    });

    return render(
      <MemoryRouter>
        <TestProviders startServices={createStartServicesMock(coreStart)}>
          <AlertAnalysisWorkflowPage />
        </TestProviders>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('saves changed settings through the Security route', async () => {
    renderComponent();

    expect(await screen.findByText('Alert analysis workflow')).toBeInTheDocument();
    expect(await screen.findByTestId('alertAnalysisWorkflowLink')).toHaveAttribute(
      'href',
      '/app/workflows/system-security-alert-analysis-default'
    );

    const autoCloseSwitch = await screen.findByTestId('alertAnalysisWorkflowAutoCloseEnabled');
    fireEvent.click(autoCloseSwitch);

    const saveButton = await screen.findByTestId('alertAnalysisWorkflowSaveButton');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(coreStart.http.fetch).toHaveBeenCalledWith(ALERT_ANALYSIS_WORKFLOW_SETTINGS_ROUTE, {
        method: 'PUT',
        version: ALERT_ANALYSIS_WORKFLOW_API_VERSION,
        body: JSON.stringify({
          autoCloseEnabled: false,
          autoCloseConfidenceScoreMinThreshold: 0.85,
          autoCloseConfidenceScoreMaxThreshold: 1,
        }),
      });
    });
  });

  it('keeps unsaved edits when the settings query refetches in the background', async () => {
    renderComponent();

    const autoCloseSwitch = await screen.findByTestId('alertAnalysisWorkflowAutoCloseEnabled');
    await waitFor(() => expect(autoCloseSwitch).toBeChecked());

    fireEvent.click(autoCloseSwitch);
    expect(autoCloseSwitch).not.toBeChecked();

    // The refetch below must return data that actually differs from the initial fetch.
    // react-query's structural sharing otherwise keeps the same `data` reference for a
    // value-identical refetch, which would hide a bug in an effect that depends on it.
    let settingsGetCount = 0;
    coreStart.http.fetch.mockImplementation(async (...args: unknown[]) => {
      const [path, options] = args as [string, { method?: string } | undefined];
      if (path === ALERT_ANALYSIS_WORKFLOW_SETTINGS_ROUTE && options?.method !== 'PUT') {
        settingsGetCount += 1;
        return settingsGetResponse({
          autoCloseEnabled: true,
          autoCloseConfidenceScoreMinThreshold: 0.85,
          autoCloseConfidenceScoreMaxThreshold: 0.99,
        });
      }
      return { page: 1, perPage: 5, total: 0, attached: 0, rules: [] };
    });

    // Simulate a background refetch (e.g. a reconnect) while the edit above is unsaved.
    await act(async () => {
      focusManager.setFocused(false);
    });
    await act(async () => {
      focusManager.setFocused(true);
    });

    await waitFor(() => expect(settingsGetCount).toBeGreaterThan(0));

    // The refetch returned different data, but the unsaved edit must survive.
    expect(autoCloseSwitch).not.toBeChecked();
  });

  it('disables saving when the minimum confidence score field is cleared', async () => {
    renderComponent();

    const minThresholdField = await screen.findByTestId('alertAnalysisWorkflowMinThreshold');
    fireEvent.change(minThresholdField, { target: { value: '' } });

    const saveButton = await screen.findByTestId('alertAnalysisWorkflowSaveButton');
    expect(saveButton).toBeDisabled();

    fireEvent.click(saveButton);
    expect(coreStart.http.fetch).not.toHaveBeenCalledWith(
      ALERT_ANALYSIS_WORKFLOW_SETTINGS_ROUTE,
      expect.objectContaining({ method: 'PUT' })
    );
  });
});
