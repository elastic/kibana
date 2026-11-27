/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { useFlyoutApi } from '../../../use_flyout_api';
import { createFlyoutApiMock } from '../../../use_flyout_api.mock';
import { useAiAgentContext } from '../../../../entity_analytics/components/ai_security/hooks/use_ai_agents';
import { mockAgentContext, mockAgentIdentity } from './mocks';
import { AiAgent } from '.';
import { AI_AGENT_TEST_IDS } from './test_ids';

jest.mock('../../../use_flyout_api');
jest.mock('../../../../entity_analytics/components/ai_security/hooks/use_ai_agents');
jest.mock('../../../../entity_analytics/api/hooks/use_get_watchlists', () => ({
  useGetWatchlists: jest.fn().mockReturnValue({ data: [] }),
}));
jest.mock('./components/risk_summary_section', () => ({
  RiskSummarySection: () => <div data-test-subj="mockRiskSummary" />,
}));
jest.mock('./components/alerts_section', () => ({
  AlertsSection: () => <div data-test-subj="mockAlerts" />,
}));
jest.mock('./components/agent_activity', () => ({
  AgentActivity: () => <div data-test-subj="mockActivity" />,
}));
jest.mock('./components/graph_tab', () => ({
  GraphTab: () => <div data-test-subj="mockGraph" />,
}));
jest.mock('./footer', () => ({
  Footer: () => <div data-test-subj="mockFooter" />,
}));

const renderFlyout = () =>
  render(
    <TestProviders>
      <AiAgent entityId={mockAgentIdentity.entityId} scopeId="scope" />
    </TestProviders>
  );

const isBefore = (first: HTMLElement, second: HTMLElement) =>
  first.compareDocumentPosition(second) === Node.DOCUMENT_POSITION_FOLLOWING;

describe('AiAgent', () => {
  beforeEach(() => {
    jest.mocked(useFlyoutApi).mockReturnValue(createFlyoutApiMock());
    jest.mocked(useAiAgentContext).mockReturnValue({
      data: { ...mockAgentContext, identity: mockAgentIdentity },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useAiAgentContext>);
  });

  it('orders the overview: attribution, risk, alerts, related agents, install details', () => {
    renderFlyout();
    const sections = [
      screen.getByTestId(AI_AGENT_TEST_IDS.attribution),
      screen.getByTestId('mockRiskSummary'),
      screen.getByTestId('mockAlerts'),
      screen.getByTestId(AI_AGENT_TEST_IDS.relatedAgents),
      screen.getByTestId(AI_AGENT_TEST_IDS.installDetails),
    ];
    sections.slice(1).forEach((section, index) => {
      expect(isBefore(sections[index], section)).toBe(true);
    });
    expect(screen.getByTestId('mockFooter')).toBeInTheDocument();
  });

  it('keeps related agents closed until the shared account line opens them', () => {
    jest.useFakeTimers();
    renderFlyout();
    const toggle = screen.getByTestId(AI_AGENT_TEST_IDS.relatedAgentsToggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(screen.getByTestId(AI_AGENT_TEST_IDS.sharedAccountLink));
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    jest.useRealTimers();
  });
});
