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
jest.mock('../../../../document/main/components/alert_count_insight', () => ({
  AlertCountInsight: ({
    identityFields,
    'data-test-subj': dataTestSubj,
  }: {
    identityFields: Record<string, string>;
    'data-test-subj'?: string;
  }) => <div data-test-subj={dataTestSubj}>{JSON.stringify(identityFields)}</div>,
}));

const PANEL = `${AI_AGENT_TEST_IDS.attribution}Panel`;

const renderSection = (
  context: AgentContext = mockAgentContext,
  { onShowRelatedAgents = jest.fn(), onShowGraph = jest.fn() } = {}
) =>
  render(
    <TestProviders>
      <AttributionSection
        context={context}
        identity={mockAgentIdentity}
        scopeId="scope"
        onShowRelatedAgents={onShowRelatedAgents}
        onShowGraph={onShowGraph}
      />
    </TestProviders>
  );

describe('AttributionSection', () => {
  let flyoutApi: ReturnType<typeof createFlyoutApiMock>;

  beforeEach(() => {
    flyoutApi = createFlyoutApiMock();
    jest.mocked(useFlyoutApi).mockReturnValue(flyoutApi);
  });

  it('uses the AI security table captions in its order: Signed in as, Host, Runs as', () => {
    renderSection();
    expect(screen.getByTestId(PANEL)).toHaveTextContent(/Attribution.*Signed in as.*Host.*Runs as/);
  });

  it('opens the Graph tab from the title', () => {
    const onShowGraph = jest.fn();
    renderSection(mockAgentContext, { onShowGraph });
    fireEvent.click(screen.getByTestId(`${AI_AGENT_TEST_IDS.attribution}TitleLink`));
    expect(onShowGraph).toHaveBeenCalled();
  });

  it('shows the person with a labelled watchlist row and one status line', () => {
    renderSection();
    const person = screen.getByTestId(AI_AGENT_TEST_IDS.person);
    expect(person).toHaveTextContent('Avery Quinn');
    expect(person).toHaveTextContent('avery.quinn@example.com');
    expect(person).toHaveTextContent('Watchlists');
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.personWatchlists)).toHaveTextContent(
      'Departing Employees'
    );
    expect(within(person).getByTestId(AI_AGENT_TEST_IDS.entityStatus)).toHaveTextContent(
      'Terminated Nov 25, 2026 · Okta deprovisioned · MFA off'
    );
  });

  it('shows no watchlist row and no status for a healthy person', () => {
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
    const person = screen.getByTestId(AI_AGENT_TEST_IDS.person);
    expect(person).not.toHaveTextContent('Watchlists');
    expect(within(person).queryByTestId(AI_AGENT_TEST_IDS.entityStatus)).not.toBeInTheDocument();
    expect(person).not.toHaveTextContent('MFA');
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
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.personWatchlists)).toHaveTextContent(
      'Privileged Users'
    );
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.person)).not.toHaveTextContent('MFA off');
  });

  it('puts the last signed-in account first and the others on one line', () => {
    renderSection({
      ...mockAgentContext,
      people: [
        { email: 'jordan.blake@example.com', rows: [], idpAccounts: [], watchlistIds: [] },
        ...mockAgentContext.people,
      ],
    });
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.person)).toHaveTextContent('Avery Quinn');
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.otherAccounts)).toHaveTextContent(
      'Also used jordan.blake@example.com'
    );
  });

  it("shows the host's criticality, risk level and alert bar under labels", () => {
    renderSection();
    const host = screen.getByTestId(AI_AGENT_TEST_IDS.host);
    expect(host).toHaveTextContent('ci-build-01');
    expect(host).toHaveTextContent('Asset criticality');
    expect(host).toHaveTextContent('High Impact');
    expect(host).toHaveTextContent('Host risk level');
    expect(host).not.toHaveTextContent('Risk:');
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.hostAlerts)).toHaveTextContent(
      JSON.stringify({ 'host.name': 'ci-build-01' })
    );
  });

  it('shows the OS user risk level under a label, without a pill', () => {
    renderSection();
    const runsAs = screen.getByTestId(AI_AGENT_TEST_IDS.runsAs);
    expect(runsAs).toHaveTextContent('ec2-user');
    expect(runsAs).toHaveTextContent('User risk level');
    expect(runsAs).toHaveTextContent('Moderate');
    expect(runsAs).not.toHaveTextContent('Risk:');
    expect(within(runsAs).queryByTestId(AI_AGENT_TEST_IDS.entityStatus)).not.toBeInTheDocument();
  });

  it('flags an install running as root on the status line', () => {
    renderSection({
      ...mockAgentContext,
      runsAs: mockRelatedRow({
        entityId: 'user:root@host-1@local',
        engineType: 'user',
        userName: 'root',
      }),
    });
    expect(
      within(screen.getByTestId(AI_AGENT_TEST_IDS.runsAs)).getByTestId(
        AI_AGENT_TEST_IDS.entityStatus
      )
    ).toHaveTextContent('Runs as root');
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
    renderSection(mockAgentContext, { onShowRelatedAgents });
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
    const host = screen.getByTestId(AI_AGENT_TEST_IDS.host);
    expect(host).toHaveTextContent('ci-build-01');
    expect(host).not.toHaveTextContent('Host risk level');
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.runsAs)).toHaveTextContent('ec2-user');
    expect(screen.queryByTestId(AI_AGENT_TEST_IDS.sharedAccountLink)).not.toBeInTheDocument();
  });
});
