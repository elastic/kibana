/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { RiskScoreHistoryResponse } from '../../../../common/api/entity_analytics';
import { EntityType } from '../../../../common/entity_analytics/types';
import type { IntelligenceEntity } from './common';
import type { SecurityFinding, SecurityFindingsResult } from './security_findings/types';
import { EntityAgentActivity } from './entity_agent_activity';
import { useEntityAgentRiskInputs } from './use_entity_agent_risk_inputs';

jest.mock('../../../common/hooks/use_space_id', () => ({ useSpaceId: () => 'research' }));
jest.mock('./use_entity_agent_risk_inputs', () => ({
  useEntityAgentRiskInputs: jest.fn(() => ({ complete: true, references: [], isLoading: false })),
}));
afterEach(async () => {
  await act(async () => {
    await Promise.resolve();
  });
});

jest.mock('../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      application: {
        getUrlForApp: (app: string, { path }: { path: string }) =>
          `/s/research/app/${app === 'securitySolutionUI' ? 'security' : app}${path}`,
      },
    },
  }),
}));
jest.mock('./ai_agents/agent_evidence', () => ({
  AgentTimestamp: ({ value }: { value: string }) => <time>{value}</time>,
}));
jest.mock('./ai_agents/provider_icon', () => ({ ProviderIcon: () => <span /> }));
jest.mock('./security_findings/finding_details', () => ({
  FindingDetails: ({ finding }: { finding: SecurityFinding }) => (
    <div data-test-subj="selectedFinding">{finding.source.id}</div>
  ),
}));

const entity: IntelligenceEntity = {
  id: 'user:requester',
  name: 'Requester',
  type: EntityType.user,
  identifierValue: 'requester@example.com',
  riskScoreNorm: 57,
  riskLevel: 'Moderate',
  criticality: undefined,
  source: undefined,
  lastSeen: undefined,
};
const finding: SecurityFinding = {
  id: 'alert-1',
  timestamp: '2026-10-14T12:00:00Z',
  title: 'Protected customer lookup',
  severity: 'high',
  status: 'open',
  kind: 'detection',
  outcome: 'unknown',
  actor: { id: 'google-sub', name: entity.identifierValue, provenance: 'authenticated_user' },
  agent: { id: 'agent-1', provider: 'google_adk', sessionId: 'session-1' },
  rule: { id: 'rule-1', name: 'Customer access' },
  policy: {
    id: 'policy-1',
    name: 'Customer access',
    mode: 'monitor',
    decision: 'deny',
    engine: 'monitor',
  },
  source: { id: 'alert-1', index: '.alerts-1' },
  ancestors: [],
  entityIds: [entity.id],
  invocation: {
    toolCallId: 'call-1',
    toolName: 'read_customer_reference',
    source: { index: 'native-tools', id: 'tool-1' },
    inputRecordHash: 'sha-1',
    inputSource: 'native',
    correlation: 'exact_native_observation',
    input: '{}',
    inputRedacted: false,
    inputTruncated: false,
    actorSource: 'google_signed_id_token_verified_by_application',
    runtimePrincipal: 'runtime@example.com',
  },
};
const result: SecurityFindingsResult = {
  findings: [finding],
  isLoading: false,
  isRefreshing: false,
  unavailable: false,
  partial: false,
  refetch: jest.fn(),
};
const history: RiskScoreHistoryResponse = {
  entity_id: entity.id,
  entity_type: 'user',
  interval: '3h',
  entries: [
    {
      '@timestamp': '2026-10-14T13:00:00Z',
      calculated_score_norm: 57,
      calculated_level: 'Moderate',
      inputs: [
        {
          id: finding.source.id,
          index: finding.source.index,
          category: 'category_1',
          description: finding.title,
          contribution_score: 12.7,
        },
      ],
    },
  ],
};

beforeEach(() => {
  jest.mocked(useEntityAgentRiskInputs).mockReturnValue({
    complete: true,
    references: [],
    isLoading: false,
  });
});

it('shows the native risk result, verified attribution, service principal and exact session link', async () => {
  render(<EntityAgentActivity entity={entity} result={result} history={history} />);
  expect(screen.getByText('Authenticated requester')).toBeInTheDocument();
  expect(screen.getByText('Agent executed as runtime@example.com')).toBeInTheDocument();
  expect(screen.getByText('Included in latest risk score')).toBeInTheDocument();
  expect(screen.getByText(/Latest calculated risk: 57.0 \/ 100/)).toBeInTheDocument();
  const link = screen.getByRole('link', { name: 'Open agent session' });
  const parsed = new URL(link.getAttribute('href') ?? '', 'http://kibana');
  expect(parsed.pathname).toBe('/s/research/app/security/entity_intelligence');
  expect(parsed.searchParams.get('sessionId')).toBe('["agent-1","session-1"]');
  expect(link).toHaveAttribute('target', '_blank');
  fireEvent.click(screen.getByRole('button', { name: '1 policy record & risk evidence' }));
  expect(screen.getByText('Raw risk contribution: 12.70')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Customer access' }));
  expect(await screen.findByTestId('selectedFinding')).toHaveTextContent('alert-1');
});

it('presents two findings for one tool invocation as one action with both policies inspectable', () => {
  const blocked: SecurityFinding = {
    ...finding,
    source: { ...finding.source, id: 'alert-2' },
    outcome: 'blocked',
    policy: finding.policy ? { ...finding.policy, name: 'Native export containment' } : undefined,
  };
  render(
    <EntityAgentActivity
      entity={entity}
      result={{ ...result, findings: [finding, blocked] }}
      history={history}
    />
  );
  expect(screen.getAllByTestId('entityAgentAction')).toHaveLength(1);
  expect(screen.getByText('Blocked')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '2 policy records & risk evidence' }));
  expect(screen.getByRole('button', { name: 'Customer access' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Native export containment' })).toBeVisible();
});

it('never turns a missing or nonmatching risk input into an included badge', async () => {
  const { rerender } = render(<EntityAgentActivity entity={entity} result={result} />);
  expect(screen.getByText('Risk contribution not verified')).toBeInTheDocument();
  expect(screen.queryByText('Included in latest risk score')).not.toBeInTheDocument();
  await act(async () => {
    rerender(
      <EntityAgentActivity
        entity={entity}
        result={result}
        history={{ ...history, entries: [{ ...history.entries[0], inputs: [] }] }}
      />
    );
  });
  expect(screen.getByText('Not among returned risk inputs')).toBeInTheDocument();
});

it('does not expose stale attribution while findings are refreshing or unavailable', () => {
  const { rerender } = render(
    <EntityAgentActivity
      entity={entity}
      result={{ ...result, isRefreshing: true }}
      history={history}
    />
  );
  expect(screen.queryByTestId('entityAgentAction')).not.toBeInTheDocument();
  rerender(
    <EntityAgentActivity
      entity={entity}
      result={{ ...result, unavailable: true }}
      history={history}
    />
  );
  expect(screen.queryByText('Included in latest risk score')).not.toBeInTheDocument();
  expect(screen.getByText(/Agent attribution evidence is unavailable/)).toBeInTheDocument();
});

it('does not show an empty agent section for an entity with no agent policy observations', () => {
  render(<EntityAgentActivity entity={entity} result={{ ...result, findings: [] }} />);
  expect(screen.queryByTestId('entityAgentActivity')).not.toBeInTheDocument();
});

it('refreshes both current findings and native risk calculation evidence', () => {
  const refreshRisk = jest.fn();
  const refreshFindings = jest.fn();
  render(
    <EntityAgentActivity
      entity={entity}
      result={{ ...result, refetch: refreshFindings }}
      history={history}
      onRefreshRisk={refreshRisk}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Refresh evidence' }));
  expect(refreshFindings).toHaveBeenCalledTimes(1);
  expect(refreshRisk).toHaveBeenCalledTimes(1);
});

it('discloses the native contribution limit even when all matching findings loaded', () => {
  render(
    <EntityAgentActivity
      entity={entity}
      result={result}
      history={{ ...history, entries: [{ ...history.entries[0], category_1_count: 13 }] }}
    />
  );
  expect(
    screen.getByText(
      'The native score used 13 alerts; 1 contribution record was returned. Other alerts may also contribute.'
    )
  ).toBeInTheDocument();
  expect(screen.getByText('Included in latest risk score')).toBeInTheDocument();
});

it('shows raw contribution after resolving a native risk alias to the exact backing alert', async () => {
  const alias = '.alerts-security.alerts-research';
  jest
    .mocked(useEntityAgentRiskInputs)
    .mockReturnValue({ alias, complete: true, references: [finding.source], isLoading: false });
  const inputs = history.entries[0].inputs?.map((input) => ({ ...input, index: alias }));
  render(
    <EntityAgentActivity
      entity={entity}
      result={result}
      history={{ ...history, entries: [{ ...history.entries[0], inputs }] }}
    />
  );
  expect(screen.getByText('Included in latest risk score')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '1 policy record & risk evidence' }));
  expect(await screen.findByText('Raw risk contribution: 12.70')).toBeVisible();
});

it('keeps compact activity focused on unique actions and sends investigation to the graph', () => {
  const showGraph = jest.fn();
  const blocked: SecurityFinding = {
    ...finding,
    source: { ...finding.source, id: 'blocked-alert' },
    outcome: 'blocked',
  };
  render(
    <EntityAgentActivity
      compact
      entity={entity}
      result={{ ...result, findings: [finding, blocked] }}
      history={history}
      onShowAgentActivity={showGraph}
    />
  );
  expect(screen.getByText('1 action')).toBeVisible();
  expect(screen.getByText('1 blocked')).toBeVisible();
  expect(screen.getByText('1 scored alert')).toBeVisible();
  expect(screen.queryByTestId('entityAgentAction')).not.toBeInTheDocument();
  expect(screen.queryByText('Agent executed as runtime@example.com')).not.toBeInTheDocument();
  expect(screen.queryByText('Authenticated requester')).not.toBeInTheDocument();
  expect(screen.getByText('Raw risk contribution: 12.70')).not.toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Show agent activity' }));
  expect(showGraph).toHaveBeenCalledTimes(1);
});

it('retains exact native risk evidence and sampling limits behind compact disclosure', async () => {
  render(
    <EntityAgentActivity
      compact
      entity={entity}
      result={{ ...result, partial: true }}
      history={{ ...history, entries: [{ ...history.entries[0], category_1_count: 13 }] }}
    />
  );
  expect(screen.getByText('Counts reflect loaded evidence.')).toBeVisible();
  const limit = screen.getByText(
    'The native score used 13 alerts; 1 contribution record was returned. Other alerts may also contribute.'
  );
  expect(limit).not.toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Risk evidence' }));
  expect(limit).toBeVisible();
  expect(screen.getByText('Raw risk contribution: 12.70')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Customer access' }));
  expect(await screen.findByTestId('selectedFinding')).toHaveTextContent('alert-1');
});

it('does not claim zero scored alerts when compact risk evidence is unavailable', () => {
  render(<EntityAgentActivity compact entity={entity} result={result} />);
  expect(screen.queryByText(/scored alert/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Risk evidence' }));
  expect(screen.getByText('Risk contribution not verified')).toBeVisible();
});
