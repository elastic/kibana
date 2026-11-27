/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { TestProviders } from '../../../../../common/mock';
import { useFlyoutApi } from '../../../../use_flyout_api';
import { createFlyoutApiMock } from '../../../../use_flyout_api.mock';
import { useAiAgentAlerts } from '../../../../../entity_analytics/components/ai_security/hooks/use_ai_agents';
import { AGENT_ALERTS_MAX_ROWS } from '../../../../../entity_analytics/components/ai_security/constants';
import type { AgentAlert } from '../../../../../entity_analytics/components/ai_security/types';
import { AlertsSection } from './alerts_section';
import { AI_AGENT_TEST_IDS } from '../test_ids';

jest.mock('../../../../use_flyout_api');
jest.mock('../../../../../entity_analytics/components/ai_security/hooks/use_ai_agents');

const alert = (index: number, overrides: Partial<AgentAlert> = {}): AgentAlert => ({
  id: `alert-${index}`,
  index: '.internal.alerts-security.alerts-default-000001',
  timestamp: '2026-11-26T10:00:00.000Z',
  ruleName: 'GenAI Process Accessing Sensitive Files',
  severity: 'high',
  status: 'open',
  processName: 'cat',
  isMock: false,
  ...overrides,
});

const mockAlerts = (alerts: AgentAlert[], unavailable = false) =>
  jest.mocked(useAiAgentAlerts).mockReturnValue({
    data: { alerts, unavailable },
    isLoading: false,
  } as unknown as ReturnType<typeof useAiAgentAlerts>);

const renderSection = () =>
  render(
    <TestProviders>
      <AlertsSection entityId="ai_agent:claude_code@host-1@ec2-user" />
    </TestProviders>
  );

const ruleNames = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('button')[0].textContent);

describe('AlertsSection', () => {
  let flyoutApi: ReturnType<typeof createFlyoutApiMock>;

  beforeEach(() => {
    flyoutApi = createFlyoutApiMock();
    jest.mocked(useFlyoutApi).mockReturnValue(flyoutApi);
  });

  it('puts the count in the title and the severity summary in a fixed order', () => {
    mockAlerts([
      alert(1, { ruleName: 'Rule A', severity: 'medium' }),
      alert(2, { ruleName: 'Rule B', severity: 'critical' }),
      alert(3, { ruleName: 'Rule C', severity: 'high' }),
      alert(4, { ruleName: 'Rule A', severity: 'medium' }),
    ]);
    renderSection();
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.alertsCount)).toHaveTextContent('Alerts (4)');
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.alerts)).toHaveTextContent(
      /critical 1.*high 1.*medium 2/
    );
  });

  it('groups alerts by rule, worst first, with a count per rule', () => {
    mockAlerts([
      alert(1, { ruleName: 'Potential Prompt Injection', severity: 'medium' }),
      alert(2, { ruleName: 'Potential Prompt Injection', severity: 'medium' }),
      alert(3, { ruleName: 'Elastic Defend Alert', severity: 'critical' }),
    ]);
    renderSection();
    expect(ruleNames()).toEqual(['Elastic Defend Alert', 'Potential Prompt Injection']);
    const [, , injectionRow] = screen.getAllByRole('row');
    expect(injectionRow).toHaveTextContent('2');
  });

  it('opens the newest alert of a group, with its process under the rule name', () => {
    mockAlerts([
      alert(1, { timestamp: '2026-11-26T09:00:00.000Z', processName: 'cat' }),
      alert(2, { timestamp: '2026-11-26T11:00:00.000Z', processName: 'curl' }),
    ]);
    renderSection();
    expect(screen.getByText('curl')).toBeInTheDocument();
    fireEvent.click(screen.getByText('GenAI Process Accessing Sensitive Files'));
    expect(flyoutApi.openDocumentFlyoutFromIndexAsChild).toHaveBeenCalledWith(
      expect.objectContaining({ documentId: 'alert-2' })
    );
  });

  it('shows the status only when it is not open', () => {
    mockAlerts([
      alert(1, { ruleName: 'Rule A', processName: 'bash' }),
      alert(2, { ruleName: 'Rule B', processName: 'curl', status: 'acknowledged' }),
    ]);
    renderSection();
    expect(screen.getByText('bash')).toBeInTheDocument();
    expect(screen.getByText('curl · acknowledged')).toBeInTheDocument();
    expect(screen.queryByText(/open/)).not.toBeInTheDocument();
  });

  it('shows five rules, then all of them on request', () => {
    mockAlerts(
      Array.from({ length: 7 }, (_, index) => alert(index, { ruleName: `Rule ${index}` }))
    );
    renderSection();
    expect(ruleNames()).toHaveLength(5);
    fireEvent.click(screen.getByText('Show all 7 rules'));
    expect(ruleNames()).toHaveLength(7);
    fireEvent.click(screen.getByText('Show fewer rules'));
    expect(ruleNames()).toHaveLength(5);
  });

  it('shows the count as capped once the read hits its row limit', () => {
    mockAlerts(Array.from({ length: AGENT_ALERTS_MAX_ROWS }, (_, index) => alert(index)));
    renderSection();
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.alertsCount)).toHaveTextContent(
      `Alerts (${AGENT_ALERTS_MAX_ROWS}+)`
    );
  });

  it('says so plainly when there are no alerts or they cannot be loaded', () => {
    mockAlerts([]);
    const { unmount } = renderSection();
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.alertsNone)).toHaveTextContent('No alerts');
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.alertsCount)).toHaveTextContent(/^Alerts$/);
    unmount();

    mockAlerts([], true);
    renderSection();
    expect(screen.getByText('Alerts could not be loaded')).toBeInTheDocument();
  });
});
