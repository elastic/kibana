/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import React from 'react';
import { HostLinuxAutoDetectPage } from '../linux_auto_detect_page';
import { buildFetchError, renderWithHostPageProviders } from './test_helpers';

jest.mock('../../../quickstart_flows/auto_detect/steps', () => ({
  AutoDetectInstallStep: ({ ingestionMode }: { ingestionMode: string }) => (
    <div data-test-subj="autoDetectInstallStep" data-ingestion-mode={ingestionMode} />
  ),
  AutoDetectVisualizeStep: () => <div data-test-subj="autoDetectVisualizeStep" />,
}));

jest.mock('../../../quickstart_flows/shared/empty_prompt', () => ({
  EmptyPrompt: ({
    onboardingFlowType,
    inline,
  }: {
    onboardingFlowType: string;
    inline?: boolean;
  }) => (
    <div
      data-test-subj="emptyPromptStub"
      data-onboarding-flow-type={onboardingFlowType}
      data-inline={inline ? 'true' : 'false'}
    />
  ),
}));

jest.mock('../../../quickstart_flows/auto_detect/use_onboarding_flow', () => ({
  useOnboardingFlow: jest.fn().mockReturnValue({
    status: 'notStarted',
    data: undefined,
    error: undefined,
    refetch: jest.fn(),
    installedIntegrations: [],
  }),
  DASHBOARDS: {},
}));

const { useOnboardingFlow: useOnboardingFlowMock } = jest.requireMock(
  '../../../quickstart_flows/auto_detect/use_onboarding_flow'
);

jest.mock('../../../shared/use_flow_breadcrumbs', () => ({
  useFlowBreadcrumb: jest.fn(),
}));

jest.mock('../../../../hooks/use_wired_streams_status', () => ({
  useWiredStreamsStatus: () => ({
    isEnabled: false,
    isLoading: false,
    isEnabling: false,
    error: null,
    enableWiredStreams: jest.fn(),
    refetch: jest.fn(),
  }),
}));

jest.mock('@kbn/ebt-tools', () => ({
  usePerformanceContext: () => ({
    onPageReady: jest.fn(),
    onPageRefreshStart: jest.fn(),
  }),
}));

const DEFAULT_FLOW_STATE = {
  status: 'notStarted',
  data: undefined,
  error: undefined,
  refetch: jest.fn(),
  installedIntegrations: [],
};

const renderPage = (initialEntries: string[] = ['/host/linux/auto-detect']) =>
  renderWithHostPageProviders(<HostLinuxAutoDetectPage />, { initialEntries });

describe('HostLinuxAutoDetectPage', () => {
  beforeEach(() => {
    useOnboardingFlowMock.mockReturnValue(DEFAULT_FLOW_STATE);
  });

  it('renders the Linux layout chrome', () => {
    renderPage();
    expect(screen.getByTestId('observabilityOnboardingHostLayout-linux')).toBeInTheDocument();
  });

  it('marks Elastic Agent as the selected collection method', () => {
    renderPage();
    expect(
      screen.getByTestId('collectionMethodSelectorCard-auto-detect').getAttribute('data-selected')
    ).toBe('true');
    expect(
      screen.getByTestId('collectionMethodSelectorCard-otel').getAttribute('data-selected')
    ).toBe('false');
  });

  it('renders the auto-detect install step', () => {
    renderPage();
    expect(screen.getByTestId('autoDetectInstallStep')).toBeInTheDocument();
  });

  it('uses wired ingestion mode when the URL says so', () => {
    renderPage(['/host/linux/auto-detect?ingestion=wired']);
    expect(screen.getByTestId('autoDetectInstallStep').getAttribute('data-ingestion-mode')).toBe(
      'wired'
    );
  });

  it('coerces an unrecognized ingestion param to classic in the install step', () => {
    renderPage(['/host/linux/auto-detect?ingestion=foo']);
    expect(screen.getByTestId('autoDetectInstallStep').getAttribute('data-ingestion-mode')).toBe(
      'classic'
    );
  });

  it('renders an inline EmptyPrompt and drops the visualize step when setup errors', () => {
    useOnboardingFlowMock.mockReturnValue({
      ...DEFAULT_FLOW_STATE,
      error: buildFetchError(),
    });
    renderPage();
    const emptyPrompt = screen.getByTestId('emptyPromptStub');
    expect(emptyPrompt.getAttribute('data-onboarding-flow-type')).toBe('auto-detect');
    expect(emptyPrompt.getAttribute('data-inline')).toBe('true');
    expect(screen.queryByTestId('autoDetectVisualizeStep')).toBeNull();
  });
});
