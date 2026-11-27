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
import type { AgentContext } from '../../../../../entity_analytics/components/ai_security/types';
import { mockAgentContext, mockAgentIdentity, mockAgentRow, mockRelatedRow } from '../mocks';
import { AttributionSection } from './attribution_section';
import { AI_AGENT_TEST_IDS } from '../test_ids';

jest.mock('../../../../use_flyout_api');
jest.mock('../../../../../entity_analytics/api/hooks/use_get_watchlists', () => ({
  useGetWatchlists: jest.fn().mockReturnValue({
    data: [
      { id: 'departing-employees', name: 'Departing Employees', riskModifier: 1.5 },
      { id: 'privileged-users', name: 'Privileged Users', riskModifier: 1.5 },
    ],
  }),
}));

const renderSection = (context: AgentContext = mockAgentContext, onShowRelatedAgents = jest.fn()) =>
  render(
    <TestProviders>
      <AttributionSection
        context={context}
        identity={mockAgentIdentity}
        scopeId="scope"
        onShowRelatedAgents={onShowRelatedAgents}
      />
    </TestProviders>
  );

describe('AttributionSection', () => {
  let flyoutApi: ReturnType<typeof createFlyoutApiMock>;

  beforeEach(() => {
    flyoutApi = createFlyoutApiMock();
    jest.mocked(useFlyoutApi).mockReturnValue(flyoutApi);
  });

  it('uses the AI security table labels in its order: Signed in as, Host, Runs as', () => {
    renderSection();
    const panel = screen.getByTestId(AI_AGENT_TEST_IDS.attribution);
    expect(panel).toHaveTextContent(/Attribution.*Signed in as.*Host.*Runs as/);
  });

  it('shows the signed-in person with only the abnormal signals as badges', () => {
    renderSection();
    const person = screen.getByTestId(AI_AGENT_TEST_IDS.person);
    expect(person).toHaveTextContent('Avery Quinn');
    expect(person).toHaveTextContent('avery.quinn@example.com');
    const signals = screen.getByTestId(AI_AGENT_TEST_IDS.personSignals);
    expect(signals).toHaveTextContent('Departing Employees');
    expect(signals).toHaveTextContent('Terminated Nov 25, 2026');
    expect(signals).toHaveTextContent('Okta: Deprovisioned');
    expect(signals).toHaveTextContent('MFA off');
  });

  it('shows no badges for a healthy person', () => {
    renderSection({
      ...mockAgentContext,
      people: [
        {
          ...mockAgentContext.people[0],
          idpAccounts: [
            {
              email: 'avery.quinn@example.com',
              provider: 'Okta',
              status: 'ACTIVE',
              mfaEnabled: true,
              isMock: false,
            },
          ],
          hr: { email: 'avery.quinn@example.com', status: 'Active', isMock: false },
          watchlistIds: [],
        },
      ],
    });
    expect(screen.queryByTestId(AI_AGENT_TEST_IDS.personSignals)).not.toBeInTheDocument();
    const panel = screen.getByTestId(AI_AGENT_TEST_IDS.attribution);
    expect(panel).not.toHaveTextContent('MFA');
    expect(panel).not.toHaveTextContent('ACTIVE');
  });

  it("prefers the agent row's MFA and watchlists when the install has one person", () => {
    renderSection({
      ...mockAgentContext,
      agent: {
        ...mockAgentRow,
        storeContext: {
          personWatchlistIds: ['privileged-users'],
          personMfaEnabled: true,
          computedAt: '2026-11-26T10:00:00.000Z',
        },
      },
    });
    const signals = screen.getByTestId(AI_AGENT_TEST_IDS.personSignals);
    expect(signals).toHaveTextContent('Privileged Users');
    expect(signals).not.toHaveTextContent('MFA off');
  });

  it('puts the last signed-in account first and the others on one line', () => {
    renderSection({
      ...mockAgentContext,
      people: [
        { email: 'jordan.blake@example.com', rows: [], idpAccounts: [], watchlistIds: [] },
        ...mockAgentContext.people,
      ],
    });
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.person)).toHaveTextContent(/^Avery Quinn/);
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.otherAccounts)).toHaveTextContent(
      'Also used jordan.blake@example.com'
    );
  });

  it('shows the host with its criticality and risk, and the OS user with its risk', () => {
    renderSection();
    const host = screen.getByTestId(AI_AGENT_TEST_IDS.host);
    expect(host).toHaveTextContent('ci-build-01');
    expect(host).toHaveTextContent('High Impact');
    expect(host).toHaveTextContent('Risk: High');
    const runsAs = screen.getByTestId(AI_AGENT_TEST_IDS.runsAs);
    expect(runsAs).toHaveTextContent('ec2-user');
    expect(runsAs).toHaveTextContent('Risk: Moderate');
    expect(runsAs).not.toHaveTextContent('Runs as root');
  });

  it('opens the person, host and OS user as child flyouts', () => {
    renderSection();
    fireEvent.click(screen.getByText('Avery Quinn'));
    expect(flyoutApi.openEntityDetailsAsChild).toHaveBeenCalledWith(
      expect.objectContaining({ engineType: 'user', entityId: 'user:avery.quinn@example.com@okta' })
    );
    fireEvent.click(within(screen.getByTestId(AI_AGENT_TEST_IDS.host)).getByText('ci-build-01'));
    expect(flyoutApi.openEntityDetailsAsChild).toHaveBeenCalledWith(
      expect.objectContaining({ engineType: 'host', entityName: 'ci-build-01' })
    );
    fireEvent.click(within(screen.getByTestId(AI_AGENT_TEST_IDS.runsAs)).getByText('ec2-user'));
    expect(flyoutApi.openEntityDetailsAsChild).toHaveBeenCalledWith(
      expect.objectContaining({ engineType: 'user', entityId: 'user:ec2-user@host-1@local' })
    );
  });

  it('links the shared account line to the related agents', () => {
    const onShowRelatedAgents = jest.fn();
    renderSection(mockAgentContext, onShowRelatedAgents);
    const link = screen.getByTestId(AI_AGENT_TEST_IDS.sharedAccountLink);
    expect(link).toHaveTextContent('Account also signed in on 1 other install');
    fireEvent.click(link);
    expect(onShowRelatedAgents).toHaveBeenCalled();
  });

  it('copes with an install that never signed in and has no host or OS user row', () => {
    renderSection({
      agent: { ...mockAgentRow, accountEmails: [] },
      people: [],
      otherAgentsOnHost: [],
      otherInstallsOnAccount: [],
    });
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.noSignedInAccount)).toHaveTextContent(
      'No signed-in account'
    );
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.host)).toHaveTextContent('ci-build-01');
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.runsAs)).toHaveTextContent('ec2-user');
    expect(screen.queryByTestId(AI_AGENT_TEST_IDS.sharedAccountLink)).not.toBeInTheDocument();
  });

  it('flags an install running as root', () => {
    renderSection({
      ...mockAgentContext,
      runsAs: mockRelatedRow({
        entityId: 'user:root@host-1@local',
        engineType: 'user',
        userName: 'root',
      }),
    });
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.runsAs)).toHaveTextContent('Runs as root');
  });
});
