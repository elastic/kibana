/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { RULES_FEATURE_ID } from '../../../../../common/constants';
import { TestProviders } from '../../../../common/mock';
import { createStartServicesMock } from '../../../../common/lib/kibana/kibana_react.mock';
import { ALERT_ANALYSIS_WORKFLOW_API_VERSION, ALERT_ANALYSIS_WORKFLOW_SETTINGS_ROUTE } from './api';
import { AlertAnalysisWorkflowPage } from '.';

jest.mock('../../../../common/containers/use_full_screen', () => ({
  useGlobalFullScreen: () => ({
    globalFullScreen: false,
    setGlobalFullScreen: jest.fn(),
  }),
}));

jest.mock('../../../../common/hooks/use_license');

describe('AlertAnalysisWorkflowPage', () => {
  const coreStart = coreMock.createStart();

  const renderComponent = () => {
    coreStart.application.capabilities = {
      ...coreStart.application.capabilities,
      advancedSettings: { show: true, save: true },
      securitySolution: { show: true, crud: true },
      [RULES_FEATURE_ID]: { read_rules: true, edit_rules: true },
      workflowsManagement: { updateWorkflow: true },
    };
    coreStart.application.getUrlForApp.mockImplementation(
      (appId, options) => `/app/${appId}${options?.path ?? ''}`
    );
    coreStart.featureFlags.getBooleanValue.mockReturnValue(true);
    coreStart.http.fetch.mockImplementation(async (...args: unknown[]) => {
      const [path, options] = args as [string, { method?: string; body?: string } | undefined];

      if (path === ALERT_ANALYSIS_WORKFLOW_SETTINGS_ROUTE) {
        const settings =
          options?.method === 'PUT'
            ? JSON.parse(options.body as string)
            : {
                autoCloseEnabled: true,
                autoCloseConfidenceScoreMinThreshold: 0.85,
                autoCloseConfidenceScoreMaxThreshold: 1,
              };

        return {
          settings,
          workflowId: 'system-security-alert-analysis-default',
        };
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
});
