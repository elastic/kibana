/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EntityType } from '../../../../common/entity_analytics/types';
import type { IntelligenceEntity } from './common';
import type { SecurityFinding } from './security_findings/types';
import type { EntityAgentAttribution } from './entity_agent_activity_model';
import { RelationshipAgentNodes } from './relationship_graph_agents';
import {
  buildRelationshipAgentGraph,
  layoutRelationshipAgents,
} from './relationship_graph_agents_model';

// Kibana's Jest resolver substitutes a span for EuiIcon. Load the public runtime
// entry to catch unsupported names that otherwise become broken image URLs.
const runtimeEui = jest.requireActual<
  Pick<typeof import('@elastic/eui'), 'EuiIcon' | 'ICON_TYPES'>
>(require.resolve('@elastic/eui/package.json').replace(/package\.json$/, 'lib'));

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
jest.mock('./ai_agents/provider_icon', () => ({
  ProviderIcon: ({ provider }: { provider: string }) => (
    <span data-test-subj="providerMark">{provider}</span>
  ),
}));
jest.mock('./ai_agents/security_graph_nodes', () => ({
  securityGraphOutcome: (finding: SecurityFinding) =>
    finding.outcome === 'blocked' ? 'Blocked' : 'Detected',
}));
jest.mock('./security_findings/finding_response_evidence', () => ({
  FindingResponseLink: ({ finding }: { finding: SecurityFinding }) =>
    finding.outcome === 'blocked' ? (
      <button type="button" data-test-subj="responseFinding">
        {finding.source.id}
      </button>
    ) : null,
}));

afterEach(async () => {
  await act(async () => {
    await Promise.resolve();
  });
});

const entity: IntelligenceEntity = {
  id: 'requester',
  identityId: 'subject',
  name: 'James',
  identifierValue: 'james@example.com',
  type: EntityType.user,
  riskScoreNorm: 58,
  riskLevel: 'Moderate',
  criticality: undefined,
  source: undefined,
  lastSeen: undefined,
};
const finding: SecurityFinding = {
  id: 'detected',
  timestamp: '2026-10-14T12:00:00Z',
  title: 'Export matched policy',
  severity: 'high',
  status: 'open',
  kind: 'detection',
  outcome: 'unknown',
  rule: { name: 'Export monitor' },
  source: { index: '.alerts-1', id: 'detected' },
  ancestors: [],
  entityIds: [entity.id],
  agent: { provider: 'google_adk', id: 'google-agent', sessionId: 'native-session' },
  actor: { id: 'subject', name: 'james@example.com' },
  policy: {
    id: 'monitor',
    name: 'Unapproved export monitor',
    mode: 'monitor',
    decision: 'deny',
    engine: 'monitor',
  },
  invocation: {
    toolCallId: 'call-1',
    toolName: 'export_case_summary',
    source: { index: 'native-tools', id: 'native-call' },
    inputRecordHash: 'sha-1',
    inputSource: 'native',
    correlation: 'exact_native_observation',
    input: '{"case_id":"CASE-001","destination":"gs://example-export"}',
    inputRedacted: false,
    inputTruncated: false,
    actorSource: 'google_signed_id_token_verified_by_application',
    runtimePrincipal: 'runtime@example.iam.gserviceaccount.com',
  },
};
const blocked: SecurityFinding = {
  ...finding,
  id: 'blocked',
  source: { index: '.alerts-1', id: 'blocked' },
  outcome: 'blocked',
  policy: {
    id: 'contain',
    name: 'Remove export permission',
    mode: 'enforce',
    decision: 'deny',
    engine: 'native',
  },
};

const showGraph = (findings: SecurityFinding[] = [finding, blocked]) => {
  const onSelectFinding = jest.fn();
  const graph = buildRelationshipAgentGraph(entity, findings);
  const layout = layoutRelationshipAgents(graph, { root: { x: 150, y: 300 } });
  const result = render(
    <svg>
      <RelationshipAgentNodes layout={layout} onSelectFinding={onSelectFinding} />
    </svg>
  );
  return { ...result, onSelectFinding };
};

it('renders one connected agent/session/tool branch and one blocked outcome for two policies', () => {
  const { container } = showGraph();
  expect(container.querySelectorAll('[data-test-subj="entityGraphAgentNode"]')).toHaveLength(1);
  expect(container.querySelectorAll('[data-test-subj="entityGraphAgentSession"]')).toHaveLength(1);
  expect(container.querySelectorAll('[data-test-subj="entityGraphAgentTool"]')).toHaveLength(1);
  expect(container.querySelectorAll('path[data-test-subj^="entityGraphAgentEdge-"]')).toHaveLength(
    3
  );
  expect(screen.getByText('Blocked')).toBeInTheDocument();
  expect(screen.queryByText('Detected')).not.toBeInTheDocument();
  expect(screen.getByText(/"case_id":"CASE-001"/)).toBeInTheDocument();
  expect(screen.getByText('google_adk')).toBeInTheDocument();
  expect(screen.getByText('Work performed by agents')).toBeInTheDocument();
  expect(screen.getByText('Requested agent work')).toBeInTheDocument();
  expect(screen.getByText('Verified requester account')).toBeInTheDocument();
  expect(
    screen.getByRole('note', { name: 'Runs as runtime@example.iam.gserviceaccount.com' })
  ).toBeInTheDocument();
  expect(container.querySelector('[data-test-subj="responseFinding"]')).toHaveTextContent(
    'blocked'
  );
});

it.each<{ attribution: EntityAgentAttribution; label: string; dashed: boolean }>([
  { attribution: 'runtime_principal', label: 'Agent runs as this identity', dashed: false },
  { attribution: 'local_account', label: 'Linked local account', dashed: true },
  { attribution: 'entity_reference', label: 'Linked in evidence', dashed: true },
  { attribution: 'unverified_account', label: 'Reported requester', dashed: true },
])('does not promote $attribution into a user request', ({ attribution, label, dashed }) => {
  const graph = buildRelationshipAgentGraph(entity, [finding]);
  graph.agents[0].attribution = attribution;
  const layout = layoutRelationshipAgents(graph, { root: { x: 150, y: 300 } });
  const { container } = render(
    <svg>
      <RelationshipAgentNodes layout={layout} onSelectFinding={jest.fn()} />
    </svg>
  );
  expect(screen.getByText(label)).toBeInTheDocument();
  expect(screen.queryByText('Requested agent work')).not.toBeInTheDocument();
  expect(
    container
      .querySelector('[data-test-subj="entityGraphAgentEdge-attribution"]')
      ?.getAttribute('stroke-dasharray')
  ).toEqual(dashed ? '4 4' : null);
});

it('does not substitute the requester for a missing execution identity', () => {
  if (!finding.invocation) throw new Error('Missing fixture invocation');
  showGraph([{ ...finding, invocation: { ...finding.invocation, runtimePrincipal: undefined } }]);
  expect(screen.getByText('Execution identity not recorded')).toBeInTheDocument();
  expect(screen.queryByText('Runs as james@example.com')).not.toBeInTheDocument();
});

it('opens the recorded call evidence and preserves access to each policy', () => {
  const { onSelectFinding } = showGraph();
  fireEvent.click(screen.getByRole('button', { name: 'Inspect tool call export_case_summary' }));
  expect(onSelectFinding).toHaveBeenLastCalledWith(blocked);
  fireEvent.click(screen.getByRole('button', { name: '2 policies' }));
  fireEvent.click(screen.getByRole('button', { name: 'Unapproved export monitor' }));
  expect(onSelectFinding).toHaveBeenLastCalledWith(finding);
});

it('links the exact installation/session in the active space', () => {
  showGraph();
  const link = screen.getByRole('link', { name: 'Open session · 1 action' });
  const url = new URL(link.getAttribute('href') ?? '', 'http://kibana');
  expect(url.pathname).toBe('/s/research/app/security/entity_intelligence');
  expect(url.searchParams.get('agentSource')).toBe('google_adk');
  expect(url.searchParams.get('sessionId')).toBe(
    JSON.stringify(['google-agent', 'native-session'])
  );
});

it('does not label an action a risk contributor until an exact native input is supplied', () => {
  const graph = buildRelationshipAgentGraph(entity, [finding]);
  const action = graph.sessions[0].actions[0];
  action.riskInputs = [
    {
      id: finding.source.id,
      index: finding.source.index,
      risk_score: 73,
      contribution_score: 12,
      category: 'category_1',
      description: finding.title,
    },
  ];
  const layout = layoutRelationshipAgents(graph, { root: { x: 150, y: 300 } });
  render(
    <svg>
      <RelationshipAgentNodes layout={layout} onSelectFinding={jest.fn()} />
    </svg>
  );
  expect(screen.getByText('Risk contributor')).toBeInTheDocument();
});

it('renders no native tool branch for an invocation without native observation proof', () => {
  const { container } = showGraph([{ ...finding, invocation: undefined }]);
  expect(
    container.querySelector('[data-test-subj="entityGraphAgentActivity"]')
  ).not.toBeInTheDocument();
});

it('loads every graph icon as a real SVG instead of an image URL', async () => {
  const { container } = showGraph();
  const names = [
    ...new Set(
      Array.from(container.querySelectorAll('[data-euiicon-type]'))
        .map((icon) => icon.getAttribute('data-euiicon-type'))
        .filter((name): name is string => name !== null)
    ),
  ];
  const knownTypes: readonly string[] = runtimeEui.ICON_TYPES;
  expect(names.length).toBeGreaterThan(0);
  expect(names.filter((name) => !knownTypes.includes(name))).toEqual([]);
  const RuntimeIcon = runtimeEui.EuiIcon;
  const icons = render(
    <div>
      {names.map((name) => (
        <RuntimeIcon key={name} type={name} />
      ))}
    </div>
  );
  await waitFor(() => {
    expect(icons.container.querySelectorAll('svg[data-icon-type]')).toHaveLength(names.length);
    expect(icons.container.querySelectorAll('svg path').length).toBeGreaterThanOrEqual(
      names.length
    );
  });
  expect(icons.container.querySelector('img')).not.toBeInTheDocument();
});
