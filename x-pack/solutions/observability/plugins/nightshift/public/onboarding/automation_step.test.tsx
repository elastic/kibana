/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';
import { useDeleteAutomation, type Automation } from '../data/automations/use_automations';
import { OnboardingAutomationStep } from './automation_step';

jest.mock('../data/automations/use_automations', () => ({
  useDeleteAutomation: jest.fn(),
}));

jest.mock('../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      agenticInvestigations: {
        InvestigationCard: () => <div data-test-subj="investigationCard" />,
      },
      application: { capabilities: { nightshift: { manage: true } } },
    },
  }),
}));

jest.mock('../automations/flyouts/create_flyout/create_automation_flyout', () => ({
  CreateAutomationFlyout: () => <div data-test-subj="createAutomationFlyout" />,
}));

jest.mock('../automations/detail_flyout/automation_detail_flyout', () => ({
  AutomationDetailFlyout: ({
    automation,
    onDelete,
  }: {
    automation: { id: string; name: string };
    onDelete: (automation: { id: string; name: string }) => void;
  }) => (
    <div data-test-subj="automationDetailFlyout">
      <button type="button" onClick={() => onDelete(automation)}>
        Delete
      </button>
    </div>
  ),
}));

jest.mock('../automations/hooks/use_automation_usage', () => ({
  useAutomationUsage: () => ({
    runRange: {
      startedAfter: '2026-11-03T00:00:00.000Z',
      startedBefore: '2026-11-05T00:00:00.000Z',
    },
    usedToday: new Map([['automation-1', 0]]),
    runCounts: new Map(),
  }),
}));

const investigation = {
  id: 'inv-1',
  in_progress: false,
} as InvestigationSummary;

const automation = {
  id: 'automation-1',
  name: 'adasd',
  automationType: 'custom',
  isEnabled: true,
  tags: [],
  trigger: { rows: [{ kind: 'alert' }] },
  execution: {},
  completions: [],
  runtime: {},
  createdAt: '2026-11-05T00:00:00.000Z',
  updatedAt: '2026-11-05T00:00:00.000Z',
} as Automation;

const mockUseDeleteAutomation = useDeleteAutomation as jest.Mock;

const renderStep = (automations: Automation[] = [], onInvestigationClick = jest.fn()) =>
  render(
    <I18nProvider>
      <OnboardingAutomationStep
        investigation={investigation}
        automations={automations}
        automationsAvailable
        onInvestigationClick={onInvestigationClick}
      />
    </I18nProvider>
  );

describe('OnboardingAutomationStep', () => {
  beforeEach(() => {
    mockUseDeleteAutomation.mockReturnValue({ mutate: jest.fn(), isLoading: false });
  });

  it('keeps the trial result banner, and offers one first-automation card', () => {
    const onInvestigationClick = jest.fn();
    renderStep([], onInvestigationClick);

    expect(screen.getByTestId('nightshiftOnboardingTrialInvestigationStatus')).toHaveTextContent(
      'Results are ready'
    );
    expect(
      screen.queryByTestId('nightshiftOnboardingTrialCreateAutomation')
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('nightshiftOnboardingTrialInvestigationOpen'));
    expect(onInvestigationClick).toHaveBeenCalledWith(investigation);

    expect(screen.getByTestId('nightshiftOnboardingFirstAutomationIllustration')).toContainHTML(
      'M54.35 41.1'
    );
    expect(screen.getByTestId('nightshiftOnboardingFirstAutomation')).toHaveTextContent(
      'Create first automation'
    );
    expect(screen.getByTestId('nightshiftOnboardingFirstAutomation')).toHaveTextContent(
      "Let investigations start automatically — and don't do the same work over and over again"
    );
    expect(screen.queryByTestId('nightshiftOnboardingAutomationCards')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('nightshiftOnboardingCreateAutomation'));
    expect(screen.getByTestId('createAutomationFlyout')).toBeInTheDocument();
  });

  it('lists a saved automation beside a card to add another, and opens its overview', () => {
    renderStep([automation]);

    const card = screen.getByTestId('nightshiftOnboardingAutomationCard');
    expect(card).toHaveTextContent('adasd');
    expect(card).toHaveTextContent('Triggered by alert');
    expect(card).toHaveTextContent('Enabled');
    expect(screen.getByTestId('nightshiftOnboardingAddAutomation')).toHaveTextContent(
      'Add one more automation'
    );
    expect(screen.queryByTestId('nightshiftOnboardingFirstAutomation')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('nightshiftOnboardingEditAutomation'));
    expect(screen.getByTestId('automationDetailFlyout')).toBeInTheDocument();
  });

  it('confirms before deleting an automation, then closes its overview', () => {
    const mutate = jest.fn((_variables, { onSuccess }) => onSuccess());
    mockUseDeleteAutomation.mockReturnValue({ mutate, isLoading: false });
    renderStep([automation]);

    fireEvent.click(screen.getByTestId('nightshiftOnboardingEditAutomation'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByText('Delete "adasd"?')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    expect(mutate).toHaveBeenCalledWith(
      { id: 'automation-1', name: 'adasd' },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
    expect(screen.queryByTestId('automationDetailFlyout')).not.toBeInTheDocument();
  });
});
