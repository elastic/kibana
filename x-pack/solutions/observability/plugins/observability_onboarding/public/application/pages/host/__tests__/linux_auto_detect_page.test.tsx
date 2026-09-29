/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { screen } from '@testing-library/react';
import React from 'react';
import { HostLinuxAutoDetectPage } from '../linux_auto_detect_page';
import { buildFetchError, renderWithHostPageProviders } from './test_helpers';

vi.mock('../../../quickstart_flows/auto_detect/steps', () => {
  const mocked = {
    AutoDetectInstallStep: () => <div data-test-subj="autoDetectInstallStep" />,
    AutoDetectVisualizeStep: () => <div data-test-subj="autoDetectVisualizeStep" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../quickstart_flows/shared/empty_prompt', () => {
  const mocked = {
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
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../quickstart_flows/auto_detect/use_onboarding_flow', () => {
  const mocked = {
    useOnboardingFlow: vi.fn().mockReturnValue({
      status: 'notStarted',
      data: undefined,
      error: undefined,
      refetch: vi.fn(),
      installedIntegrations: [],
    }),
    DASHBOARDS: {},
  };
  return { ...mocked, default: mocked };
});

const { useOnboardingFlow: useOnboardingFlowMock } = await vi.importMock(
  '../../../quickstart_flows/auto_detect/use_onboarding_flow'
);

vi.mock('../../../shared/use_flow_breadcrumbs', () => {
  const mocked = {
    useFlowBreadcrumb: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/ebt-tools', () => {
  const mocked = {
    usePerformanceContext: () => ({
      onPageReady: vi.fn(),
      onPageRefreshStart: vi.fn(),
    }),
  };
  return { ...mocked, default: mocked };
});

const DEFAULT_FLOW_STATE = {
  status: 'notStarted',
  data: undefined,
  error: undefined,
  refetch: vi.fn(),
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
