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
import { useAiAgentAlerts } from '../../../../../entity_analytics/components/ai_agents/hooks/use_ai_agents';
import { AGENT_ALERTS_MAX_ROWS } from '../../../../../entity_analytics/components/ai_agents/constants';
import type { AgentAlert } from '../../../../../entity_analytics/components/ai_agents/types';
import { AlertsSection } from './alerts_section';
import { AI_AGENT_TEST_IDS } from '../test_ids';

jest.mock('../../../../use_flyout_api');
jest.mock('../../../../../entity_analytics/components/ai_agents/hooks/use_ai_agents');

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

const mockAlerts = (alerts: AgentAlert[]) =>
  jest.mocked(useAiAgentAlerts).mockReturnValue({
    data: { alerts, unavailable: false },
    isLoading: false,
  } as unknown as ReturnType<typeof useAiAgentAlerts>);

const renderSection = () =>
  render(
    <TestProviders>
      <AlertsSection entityId="ai_agent:claude_code@host-1@ec2-user" />
    </TestProviders>
  );

describe('AlertsSection', () => {
  let flyoutApi: ReturnType<typeof createFlyoutApiMock>;

  beforeEach(() => {
    flyoutApi = createFlyoutApiMock();
    jest.mocked(useFlyoutApi).mockReturnValue(flyoutApi);
  });

  it('counts alerts in any status, with the process and status under the rule name', () => {
    mockAlerts([alert(1), alert(2, { status: 'closed', processName: 'curl' })]);
    renderSection();
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.alertsCount)).toHaveTextContent(
      '2 alerts in any status'
    );
    expect(screen.getByText('curl · closed')).toBeInTheDocument();
    fireEvent.click(screen.getAllByText('GenAI Process Accessing Sensitive Files')[0]);
    expect(flyoutApi.openDocumentFlyoutFromIndexAsChild).toHaveBeenCalledWith(
      expect.objectContaining({ documentId: 'alert-1' })
    );
  });

  it('shows the count as capped once the read hits its row limit', () => {
    mockAlerts(Array.from({ length: AGENT_ALERTS_MAX_ROWS }, (_, index) => alert(index)));
    renderSection();
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.alertsCount)).toHaveTextContent(
      `${AGENT_ALERTS_MAX_ROWS}+ alerts in any status`
    );
    expect(screen.getByText('The newest 20 are shown.')).toBeInTheDocument();
  });

  it('labels alerts built from a generated source document', () => {
    mockAlerts([
      alert(1, { ruleName: 'Malware Detection Alert', isMock: true }),
      alert(2, { ruleName: 'Potential Prompt Injection' }),
    ]);
    renderSection();
    const [, mockRow, realRow] = screen.getAllByRole('row');
    expect(within(mockRow).getByTestId(AI_AGENT_TEST_IDS.mockBadge)).toBeInTheDocument();
    expect(within(realRow).queryByTestId(AI_AGENT_TEST_IDS.mockBadge)).not.toBeInTheDocument();
  });
});
