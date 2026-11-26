/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { TestProviders } from '../../../../../common/mock';
import { useFlyoutApi } from '../../../../use_flyout_api';
import { createFlyoutApiMock } from '../../../../use_flyout_api.mock';
import type {
  AgentContext,
  AgentRow,
  RelatedEntity,
} from '../../../../../entity_analytics/components/ai_agents/types';
import { ContextSection } from './context_section';
import { AI_AGENT_TEST_IDS } from '../test_ids';

jest.mock('../../../../use_flyout_api');
jest.mock('../../../../../entity_analytics/api/hooks/use_get_watchlists', () => ({
  useGetWatchlists: jest.fn().mockReturnValue({
    data: [{ id: 'departing-employees', name: 'Departing Employees' }],
  }),
}));

const agent: AgentRow = {
  entityId: 'ai_agent:claude_code@host-1@ec2-user',
  agentName: 'claude_code',
  hostId: 'host-1',
  userName: 'ec2-user',
  hostName: 'build-01',
  watchlistIds: [],
  accountEmails: ['alex@example.com'],
  accountIds: [],
  dependsOnIds: ['host:host-1'],
  dataSources: [],
};

const row = (
  overrides: Partial<RelatedEntity> & Pick<RelatedEntity, 'entityId' | 'engineType'>
) => ({
  watchlistIds: [],
  resolvedTo: [],
  accountEmails: [],
  accountIds: [],
  ownsInferredIds: [],
  ...overrides,
});

const fullContext: AgentContext = {
  agent,
  host: row({
    entityId: 'host:host-1',
    engineType: 'host',
    hostName: 'build-01',
    criticality: 'extreme_impact',
    riskLevel: 'High',
  }),
  runsAs: row({
    entityId: 'user:ec2-user@host-1@local',
    engineType: 'user',
    userName: 'ec2-user',
    namespace: 'local',
  }),
  people: [
    {
      email: 'alex@example.com',
      rows: [],
      primary: row({
        entityId: 'user:alex@example.com@okta',
        engineType: 'user',
        email: 'alex@example.com',
        fullName: 'Alex Doe',
        userName: 'alex@example.com',
      }),
      idpAccounts: [
        {
          email: 'alex@example.com',
          provider: 'Okta',
          status: 'DEPROVISIONED',
          deprovisioned: true,
          mfaEnabled: false,
        },
      ],
      watchlistIds: ['departing-employees'],
    },
  ],
  otherAgentsOnHost: [
    row({
      entityId: 'ai_agent:cursor@host-1@ec2-user',
      engineType: 'ai_agent',
      agentName: 'cursor',
      userName: 'ec2-user',
      hostName: 'build-01',
    }),
  ],
  otherInstallsOnAccount: [
    row({
      entityId: 'ai_agent:claude_code@host-2@alex',
      engineType: 'ai_agent',
      agentName: 'claude_code',
      userName: 'alex',
      hostName: 'laptop-02',
    }),
  ],
  signedInAs: 'alex@example.com',
};

const renderSection = (context: AgentContext) =>
  render(
    <TestProviders>
      <ContextSection context={context} scopeId="scope" />
    </TestProviders>
  );

describe('ContextSection', () => {
  let flyoutApi: ReturnType<typeof createFlyoutApiMock>;

  beforeEach(() => {
    flyoutApi = createFlyoutApiMock();
    jest.mocked(useFlyoutApi).mockReturnValue(flyoutApi);
  });

  it('shows the person the agent acts for, with IdP status, MFA and watchlists', () => {
    renderSection(fullContext);
    const person = screen.getByTestId(AI_AGENT_TEST_IDS.person);
    expect(person).toHaveTextContent('Alex Doe');
    expect(person).toHaveTextContent('Okta: Deprovisioned');
    expect(person).toHaveTextContent('Off');
    expect(person).toHaveTextContent('Departing Employees');
    expect(person).toHaveTextContent('Signed in now');
  });

  it('shows the host with criticality and the other agents on it', () => {
    renderSection(fullContext);
    const host = screen.getByTestId(AI_AGENT_TEST_IDS.host);
    expect(host).toHaveTextContent('build-01');
    expect(host).toHaveTextContent('Extreme');
    expect(host).toHaveTextContent('Cursor · ec2-user · build-01');
  });

  it('opens related entities as child flyouts', () => {
    renderSection(fullContext);
    fireEvent.click(screen.getByText('Alex Doe'));
    expect(flyoutApi.openEntityDetailsAsChild).toHaveBeenCalledWith(
      expect.objectContaining({ engineType: 'user', entityId: 'user:alex@example.com@okta' })
    );
    fireEvent.click(screen.getByText('Claude Code · alex · laptop-02'));
    expect(flyoutApi.openEntityDetailsAsChild).toHaveBeenCalledWith(
      expect.objectContaining({
        engineType: 'ai_agent',
        entityId: 'ai_agent:claude_code@host-2@alex',
      })
    );
  });

  it('falls back to the raw email when no IdP user has it', () => {
    renderSection({
      ...fullContext,
      people: [{ email: 'alex@example.com', rows: [], idpAccounts: [], watchlistIds: [] }],
    });
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.person)).toHaveTextContent('alex@example.com');
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.personNotFound)).toBeInTheDocument();
  });

  it('shows HR status and reads MFA from the user row when the IdP read has none', () => {
    renderSection({
      ...fullContext,
      people: [
        {
          email: 'alex@example.com',
          rows: [
            row({
              entityId: 'user:alex@example.com@okta',
              engineType: 'user',
              email: 'alex@example.com',
              mfaEnabled: true,
            }),
          ],
          idpAccounts: [],
          hr: { email: 'alex@example.com', status: 'Terminated', terminationDate: '2026-12-01' },
          watchlistIds: [],
        },
      ],
    });
    const person = screen.getByTestId(AI_AGENT_TEST_IDS.person);
    expect(person).toHaveTextContent('Terminated on 2026-12-01');
    expect(person).toHaveTextContent('On');
    expect(person).toHaveTextContent('IdP statusNot reported');
  });

  it('copes with an install that never signed in, runs as root and has no host row', () => {
    renderSection({
      agent: { ...agent, userName: 'root', accountEmails: [] },
      people: [],
      otherAgentsOnHost: [],
      otherInstallsOnAccount: [],
    });
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.actsForNone)).toBeInTheDocument();
    expect(screen.getByText('The host is not in the Entity Store.')).toBeInTheDocument();
    expect(screen.getByText('Runs as root')).toBeInTheDocument();
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.runsAs)).toHaveTextContent('No local user row');
    expect(screen.getByTestId(AI_AGENT_TEST_IDS.otherInstalls)).toHaveTextContent(
      'No other install has used these accounts.'
    );
  });
});
