/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { ALERTZERO_ENABLED_SETTING_ID } from '@kbn/alertzero-common';
import { TestProviders } from '../../../../common/mock';
import { createStartServicesMock } from '../../../../common/lib/kibana/kibana_react.mock';
import { AlertAnalysisWorkflowDeprecationCallout } from './deprecation_callout';

describe('AlertAnalysisWorkflowDeprecationCallout', () => {
  const renderComponent = ({
    isDeclared,
    isEnabled = false,
  }: {
    isDeclared: boolean;
    isEnabled?: boolean;
  }) => {
    const coreStart = coreMock.createStart();
    coreStart.application.getUrlForApp.mockImplementation(
      (appId, options) => `/app/${appId}${options?.path ?? ''}`
    );

    // createStartServicesMock installs its own uiSettings.get, so override it afterwards.
    const startServices = createStartServicesMock(coreStart);
    coreStart.uiSettings.isDeclared.mockImplementation(
      (key: string) => isDeclared && key === ALERTZERO_ENABLED_SETTING_ID
    );
    coreStart.uiSettings.get.mockImplementation((key: string) =>
      key === ALERTZERO_ENABLED_SETTING_ID ? isEnabled : undefined
    );

    return render(
      <TestProviders startServices={startServices}>
        <AlertAnalysisWorkflowDeprecationCallout />
      </TestProviders>
    );
  };

  it('shows only the message when the AlertZero setting is not declared', () => {
    renderComponent({ isDeclared: false });

    expect(screen.getByTestId('alertAnalysisWorkflowDeprecationCallout')).toBeInTheDocument();
    expect(screen.getByTestId('alertAnalysisWorkflowDeprecationLearnMore')).toBeInTheDocument();
    expect(
      screen.queryByTestId('alertAnalysisWorkflowDeprecationEnableAlertZero')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('alertAnalysisWorkflowDeprecationGoToAlertZero')
    ).not.toBeInTheDocument();
  });

  it('links to the advanced setting when AlertZero is available but disabled', () => {
    renderComponent({ isDeclared: true, isEnabled: false });

    expect(screen.getByTestId('alertAnalysisWorkflowDeprecationLearnMore')).toHaveAttribute(
      'href',
      'https://www.elastic.co/security-labs/blog/ai-soc-automation-alertzero'
    );
    expect(screen.getByTestId('alertAnalysisWorkflowDeprecationEnableAlertZero')).toHaveAttribute(
      'href',
      `/app/management/kibana/settings?query=${encodeURIComponent(ALERTZERO_ENABLED_SETTING_ID)}`
    );
  });

  it('links to the Triage Worker settings without the learn more link when AlertZero is enabled', () => {
    renderComponent({ isDeclared: true, isEnabled: true });

    expect(
      screen.queryByTestId('alertAnalysisWorkflowDeprecationLearnMore')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('alertAnalysisWorkflowDeprecationGoToAlertZero')).toHaveAttribute(
      'href',
      '/app/alertzero/watches/system-security-watch-floor'
    );
  });
});
