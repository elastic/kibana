/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { SecurityFindingsPanel } from './security_findings_panel';
import { useSecurityFindings } from './use_security_findings';
import type { SecurityFinding, SecurityFindingsResult } from './types';
import { EntityType } from '../../../../../common/entity_analytics/types';

jest.mock('./use_security_findings');
jest.mock('../../../../common/hooks/use_space_id', () => ({ useSpaceId: () => 'test-space' }));
jest.mock('../../../../common/components/formatted_date', () => ({
  PreferenceFormattedDate: ({ value }: { value: Date }) => <time>{value.toISOString()}</time>,
}));
jest.mock('../ai_agents/provider_icon', () => ({
  ProviderIcon: ({ provider }: { provider: string }) => <span>{provider}</span>,
}));
const mockGetRedirectUrl = jest.fn(() => '/app/discover#/security-evidence');
const mockGetUrlForApp = jest.fn(() => '/s/test-space/app/security/rules/id/rule-a');
jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      share: { url: { locators: { get: () => ({ getRedirectUrl: mockGetRedirectUrl }) } } },
      application: { getUrlForApp: mockGetUrlForApp },
    },
  }),
}));

const finding: SecurityFinding = {
  id: 'alert-one',
  timestamp: '2026-10-13T14:30:00Z',
  detectedAt: '2026-10-13T14:32:00Z',
  title: 'Restricted fixture read blocked',
  severity: 'high',
  status: 'open',
  kind: 'guardrail',
  outcome: 'blocked',
  action: 'file_read',
  target: 'restricted-fixture.txt',
  actor: { id: 'actor-a', name: 'James', provenance: 'local_os_account' },
  host: { id: 'host-a', name: 'workstation' },
  agent: { id: 'install-a', provider: 'codex', name: 'Codex', sessionId: 'session-a' },
  rule: { id: 'rule-a', name: 'Guardrail enforcement observed' },
  policy: {
    id: 'policy-a',
    name: 'Restricted fixture access',
    mode: 'enforce',
    decision: 'deny',
    engine: 'local-policy-harness',
  },
  source: { index: '.alerts-security.alerts-test-space', id: 'alert-one' },
  ancestors: [{ index: 'logs-security-lab', id: 'event-one' }],
  entityIds: ['user:James'],
};
const result: SecurityFindingsResult = {
  findings: [finding],
  isLoading: false,
  isRefreshing: false,
  unavailable: false,
  partial: false,
  total: 1,
  refetch: jest.fn(),
};
const openFinding = () =>
  fireEvent.click(screen.getByRole('button', { name: `Inspect finding: ${finding.title}` }));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useSecurityFindings).mockReturnValue(result);
});

it('shows an evidence-based outcome and the recorded identity/action chain', () => {
  render(<SecurityFindingsPanel scope={{ type: 'all' }} />);
  const row = screen.getByTestId('securityFindingRow');
  expect(row).toHaveTextContent('Blocked');
  expect(row).toHaveTextContent('High');
  expect(row).toHaveTextContent('James');
  expect(row).toHaveTextContent('Codex');
  expect(row).toHaveTextContent('Read file');
  expect(row).toHaveTextContent('restricted-fixture.txt');
  expect(screen.getByText('1 blocked')).toBeInTheDocument();
  expect(jest.mocked(useSecurityFindings)).toHaveBeenCalledWith({ type: 'all' }, 'test-space');
});

it('keeps a detection with unknown enforcement distinct from a closed alert workflow', () => {
  jest.mocked(useSecurityFindings).mockReturnValue({
    ...result,
    findings: [
      { ...finding, kind: 'detection', outcome: 'unknown', policy: undefined, status: 'closed' },
    ],
  });
  render(<SecurityFindingsPanel scope={{ type: 'all' }} />);
  expect(screen.getByTestId('securityFindingRow')).toHaveTextContent('Detected');
  expect(screen.queryByText('Blocked')).not.toBeInTheDocument();
  openFinding();
  expect(screen.getByRole('dialog')).toHaveTextContent(
    'does not establish whether a control blocked'
  );
  expect(screen.getByRole('dialog')).toHaveTextContent('closed');
});

it('labels monitor policy violations without claiming the action was blocked', () => {
  jest.mocked(useSecurityFindings).mockReturnValue({
    ...result,
    findings: [{ ...finding, kind: 'policy_violation', outcome: 'allowed' }],
  });
  render(<SecurityFindingsPanel scope={{ type: 'all' }} />);
  expect(screen.getByTestId('securityFindingRow')).toHaveTextContent('Policy violation');
  expect(screen.queryByText('Blocked')).not.toBeInTheDocument();
  expect(screen.getByText('1 policy violation')).toBeInTheDocument();
});

it('opens exact source references and policy metadata without displaying source bodies', () => {
  render(<SecurityFindingsPanel scope={{ type: 'all' }} />);
  openFinding();
  const modal = screen.getByRole('dialog');
  expect(modal).toHaveTextContent('Local operating system account');
  expect(modal).toHaveTextContent('Observed at');
  expect(modal).toHaveTextContent('Detected at');
  expect(modal).toHaveTextContent('2026-10-13T14:32:00.000Z');
  expect(modal).toHaveTextContent('Guardrail enforcement observed');
  expect(modal).toHaveTextContent('local-policy-harness');
  expect(modal).toHaveTextContent('logs-security-lab · event-one');
  expect(within(modal).getByRole('link', { name: 'Open alert in Discover' })).toHaveAttribute(
    'href',
    '/app/discover#/security-evidence'
  );
  expect(
    within(modal).getByRole('link', { name: 'Open source event in Discover' })
  ).toBeInTheDocument();
  expect(mockGetRedirectUrl).toHaveBeenCalledWith(
    expect.objectContaining({
      dataViewSpec: { title: 'logs-security-lab', timeFieldName: '@timestamp' },
      query: { language: 'kuery', query: '_id: "event-one"' },
    })
  );
});

it('navigates using the exact recorded provider, installation and session', () => {
  const investigate = jest.fn();
  render(<SecurityFindingsPanel scope={{ type: 'all' }} onInvestigateAgent={investigate} />);
  openFinding();
  fireEvent.click(screen.getByRole('button', { name: 'Investigate agent' }));
  expect(investigate).toHaveBeenCalledWith(finding.agent);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('navigates using the recorded linked entity ID', () => {
  const investigate = jest.fn();
  render(
    <SecurityFindingsPanel
      scope={{ type: 'all' }}
      onInvestigateEntity={investigate}
      entityTargets={[{ id: 'user:James', name: 'James', type: EntityType.user }]}
    />
  );
  openFinding();
  fireEvent.click(screen.getByRole('button', { name: 'Investigate James' }));
  expect(investigate).toHaveBeenCalledWith('user:James');
});

it('counts loaded evidence rather than presenting a bounded sample as the total', () => {
  jest.mocked(useSecurityFindings).mockReturnValue({ ...result, total: 900, partial: true });
  render(<SecurityFindingsPanel scope={{ type: 'all' }} />);
  expect(screen.getByText('1 blocked')).toBeInTheDocument();
  expect(screen.getByText(/Counts reflect 1 loaded alert/)).toBeInTheDocument();
  expect(screen.queryByText(/900/)).not.toBeInTheDocument();
});

it('hides cached rows and open evidence after access becomes unavailable', () => {
  const { rerender } = render(<SecurityFindingsPanel scope={{ type: 'all' }} />);
  openFinding();
  jest.mocked(useSecurityFindings).mockReturnValue({ ...result, unavailable: true });
  rerender(<SecurityFindingsPanel scope={{ type: 'all' }} />);
  expect(screen.queryByTestId('securityFindingRow')).not.toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByText(/Detection evidence is unavailable/)).toBeInTheDocument();
  expect(screen.queryByText(/No matching alerts/)).not.toBeInTheDocument();
});

it('closes evidence when the requested identity scope changes', () => {
  const { rerender } = render(<SecurityFindingsPanel scope={{ type: 'all' }} />);
  openFinding();
  rerender(
    <SecurityFindingsPanel scope={{ type: 'agent', provider: 'cursor', agentId: 'another' }} />
  );
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('shows a coverage-aware empty state without declaring an all-clear', () => {
  jest.mocked(useSecurityFindings).mockReturnValue({ ...result, findings: [], total: 0 });
  render(<SecurityFindingsPanel compact scope={{ type: 'all' }} />);
  expect(
    screen.getByText(/Coverage depends on collected events and enabled detection rules/)
  ).toBeInTheDocument();
  expect(screen.queryByText(/safe|all.clear/i)).not.toBeInTheDocument();
});

it('shows three compact findings and expands only the already-loaded evidence', () => {
  jest.mocked(useSecurityFindings).mockReturnValue({
    ...result,
    findings: Array.from({ length: 5 }, (_, index) => ({
      ...finding,
      id: `alert-${index}`,
      source: { ...finding.source, id: `alert-${index}` },
    })),
  });
  render(<SecurityFindingsPanel compact scope={{ type: 'all' }} />);
  expect(screen.getAllByTestId('securityFindingRow')).toHaveLength(3);
  fireEvent.click(screen.getByRole('button', { name: 'Show 2 more' }));
  expect(screen.getAllByTestId('securityFindingRow')).toHaveLength(5);
});

it('retries the actual findings request from the panel action', () => {
  render(<SecurityFindingsPanel scope={{ type: 'all' }} />);
  fireEvent.click(screen.getByRole('button', { name: 'Refresh findings' }));
  expect(result.refetch).toHaveBeenCalledTimes(1);
});

it('offers both recorded user and host targets using exact loaded entity IDs', () => {
  const investigate = jest.fn();
  jest.mocked(useSecurityFindings).mockReturnValue({
    ...result,
    findings: [{ ...finding, entityIds: ['user:James', 'host:workstation', 'user:not-loaded'] }],
  });
  render(
    <SecurityFindingsPanel
      scope={{ type: 'all' }}
      onInvestigateEntity={investigate}
      entityTargets={[
        { id: 'user:James', name: 'James', type: EntityType.user },
        { id: 'host:workstation', name: 'Workstation', type: EntityType.host },
      ]}
    />
  );
  openFinding();
  expect(screen.getByRole('button', { name: 'Investigate James' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Investigate Workstation' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /not-loaded/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Investigate Workstation' }));
  expect(investigate).toHaveBeenCalledWith('host:workstation');
});

it('humanizes known activities and generated identity provenance while preserving source evidence', () => {
  jest.mocked(useSecurityFindings).mockReturnValue({
    ...result,
    findings: [
      {
        ...finding,
        action: 'protected_file_access',
        actor: { name: 'James', provenance: 'generated' },
      },
    ],
  });
  render(<SecurityFindingsPanel scope={{ type: 'all' }} />);
  expect(screen.getByTestId('securityFindingRow')).toHaveTextContent('Protected file access');
  openFinding();
  expect(screen.getByRole('dialog')).toHaveTextContent('Generated entity observation');
  expect(screen.getByRole('dialog')).not.toHaveTextContent('protected_file_access');
  expect(screen.getByRole('dialog')).toHaveTextContent('logs-security-lab');
});

it('hides old findings and the open modal throughout a refresh even if the hook retains data', () => {
  const { rerender } = render(<SecurityFindingsPanel scope={{ type: 'all' }} />);
  openFinding();
  jest.mocked(useSecurityFindings).mockReturnValue({ ...result, isRefreshing: true });
  rerender(<SecurityFindingsPanel scope={{ type: 'all' }} />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.queryByTestId('securityFindingRow')).not.toBeInTheDocument();
  expect(screen.queryByText(/No matching alerts/)).not.toBeInTheDocument();
});

it('separates policy explanation from detection reason and filters credentials in free text', () => {
  jest.mocked(useSecurityFindings).mockReturnValue({
    ...result,
    findings: [
      {
        ...finding,
        reason: 'Detection matched a protected target; token=credential-secret-12345',
        policy: {
          id: 'policy-a',
          name: 'Restricted fixture access',
          engine: 'local-policy-harness',
          mode: 'enforce',
          decision: 'deny',
          reason: 'The requested fixture is protected by this policy.',
        },
      },
    ],
  });
  render(<SecurityFindingsPanel scope={{ type: 'all' }} />);
  expect(screen.queryByText(/The requested fixture/)).not.toBeInTheDocument();
  openFinding();
  const modal = screen.getByRole('dialog');
  expect(modal).toHaveTextContent('Detection reason');
  expect(modal).toHaveTextContent('Detection matched a protected target');
  expect(modal).toHaveTextContent('Policy explanation');
  expect(modal).toHaveTextContent('The requested fixture is protected by this policy.');
  expect(modal).toHaveTextContent('[REDACTED]');
  expect(modal).not.toHaveTextContent('credential-secret-12345');
});

it('reuses supplied findings without starting a duplicate request', () => {
  render(<SecurityFindingsPanel scope={{ type: 'all' }} result={result} />);
  expect(screen.getByTestId('securityFindingRow')).toHaveTextContent('Blocked');
  expect(jest.mocked(useSecurityFindings)).not.toHaveBeenCalled();
});

it('leads with the blocked action, recorded actor and target instead of technical identifiers', () => {
  jest.mocked(useSecurityFindings).mockReturnValue({
    ...result,
    findings: [{ ...finding, action: 'protected_file_access' }],
  });
  render(<SecurityFindingsPanel scope={{ type: 'all' }} />);
  openFinding();
  const modal = screen.getByRole('dialog');
  expect(
    within(modal).getByRole('heading', { name: 'Protected file access blocked' })
  ).toBeInTheDocument();
  const context = within(modal).getByTestId('securityFindingContext');
  expect(context).toHaveTextContent('Recorded actor');
  expect(context).toHaveTextContent('James');
  expect(context).toHaveTextContent('Codex');
  expect(context).toHaveTextContent('restricted-fixture.txt');
  expect(context).not.toHaveTextContent('local-policy-harness');
  expect(within(modal).getByTestId('securityFindingDecision')).toHaveTextContent('Deny');
  expect(within(modal).getByTestId('securityFindingDecision')).toHaveTextContent('Enforce');
  expect(within(modal).getByTestId('securityFindingDecision')).toHaveTextContent('Blocked');
  expect(
    within(modal).getByRole('button', { name: 'Technical evidence and identifiers' })
  ).toHaveAttribute('aria-expanded', 'false');
});

it('makes the deny-versus-allowed monitor violation explicit without claiming a native agent block', () => {
  jest.mocked(useSecurityFindings).mockReturnValue({
    ...result,
    findings: [
      {
        ...finding,
        action: 'unapproved_export',
        kind: 'policy_violation',
        outcome: 'allowed',
        policy: {
          id: 'policy-a',
          name: 'Export policy',
          mode: 'monitor',
          decision: 'deny',
          engine: 'Local exercise policy gateway',
          reason: 'The destination is outside the configured fixture boundary.',
        },
      },
    ],
  });
  render(<SecurityFindingsPanel scope={{ type: 'all' }} />);
  openFinding();
  const modal = screen.getByRole('dialog');
  expect(
    within(modal).getByRole('heading', { name: 'Prohibited export allowed' })
  ).toBeInTheDocument();
  expect(within(modal).getByTestId('securityFindingDecision')).toHaveTextContent('Deny');
  expect(within(modal).getByTestId('securityFindingDecision')).toHaveTextContent('Monitor only');
  expect(within(modal).getByTestId('securityFindingDecision')).toHaveTextContent('Allowed');
  expect(modal).toHaveTextContent('The destination is outside the configured fixture boundary.');
  expect(modal).not.toHaveTextContent('Codex blocked');
});

it('keeps missing control, identity and target data explicit', () => {
  jest.mocked(useSecurityFindings).mockReturnValue({
    ...result,
    findings: [
      {
        ...finding,
        actor: undefined,
        agent: undefined,
        host: undefined,
        target: undefined,
        policy: undefined,
        kind: 'detection',
        outcome: 'unknown',
        detectedAt: undefined,
      },
    ],
  });
  render(<SecurityFindingsPanel scope={{ type: 'all' }} />);
  openFinding();
  const modal = screen.getByRole('dialog');
  expect(within(modal).getByTestId('securityFindingContext')).toHaveTextContent('Not recorded');
  expect(within(modal).getByTestId('securityFindingDecision')).toHaveTextContent('Unknown');
  expect(modal).toHaveTextContent('No explicit control decision was recorded with this alert.');
  expect(modal).toHaveTextContent('No policy or detection explanation was recorded.');
});

it('opens delayed detections at their detection time and source events at their observed time', () => {
  jest.mocked(useSecurityFindings).mockReturnValue({
    ...result,
    findings: [
      { ...finding, timestamp: '2026-10-01T12:00:00Z', detectedAt: '2026-10-13T12:00:00Z' },
    ],
  });
  render(<SecurityFindingsPanel scope={{ type: 'all' }} />);
  openFinding();
  expect(mockGetRedirectUrl).toHaveBeenCalledWith(
    expect.objectContaining({
      dataViewSpec: { title: '.alerts-security.alerts-test-space', timeFieldName: '@timestamp' },
      query: { language: 'kuery', query: '_id: "alert-one"' },
      timeRange: { from: '2026-10-12T12:00:00.000Z', to: '2026-10-14T12:00:00.000Z' },
    })
  );
  expect(mockGetRedirectUrl).toHaveBeenCalledWith(
    expect.objectContaining({
      dataViewSpec: { title: 'logs-security-lab', timeFieldName: '@timestamp' },
      query: { language: 'kuery', query: '_id: "event-one"' },
      timeRange: { from: '2026-09-30T12:00:00.000Z', to: '2026-10-02T12:00:00.000Z' },
    })
  );
});

it('redacts credential-like target and explanation content in the redesigned detail', () => {
  jest.mocked(useSecurityFindings).mockReturnValue({
    ...result,
    findings: [
      {
        ...finding,
        target: 'https://fixture.invalid/export?token=credential-secret-12345',
        reason: 'token=credential-secret-12345',
      },
    ],
  });
  render(<SecurityFindingsPanel scope={{ type: 'all' }} />);
  openFinding();
  expect(screen.getByRole('dialog')).not.toHaveTextContent('credential-secret-12345');
  expect(screen.getByRole('dialog')).toHaveTextContent('[REDACTED]');
});

it('keeps compact entity findings concise and opens the same full evidence detail', () => {
  jest
    .mocked(useSecurityFindings)
    .mockReturnValue({ ...result, findings: [{ ...finding, action: 'protected_file_access' }] });
  render(<SecurityFindingsPanel compact scope={{ type: 'all' }} />);
  expect(screen.getByTestId('securityFindingRow')).toHaveTextContent('Protected file access');
  expect(screen.getByTestId('securityFindingRow')).toHaveTextContent('Blocked');
  openFinding();
  expect(screen.getByRole('dialog')).toHaveTextContent('Policy decision and actual outcome');
});

const policyFinding: SecurityFinding = {
  ...finding,
  invocation: {
    requestId: 'request-exact-a',
    toolCallId: 'call-exact-a',
    toolName: 'exec_command',
    turnId: 'turn-a',
    source: { index: 'logs-agent.tools', id: 'tool-doc-a' },
    inputRecordHash: 'input-hash-a',
    inputSource: 'codex.session.function_call.arguments',
    correlation: 'exact_request_id',
    input: 'node policy_gateway.js --request-id request-exact-a --action read-protected',
    inputRedacted: false,
    inputTruncated: false,
    processExitCode: 77,
  },
  policy: {
    id: 'policy-a',
    name: 'Workspace data boundary',
    engine: 'Local exercise policy gateway',
    mode: 'enforce',
    decision: 'deny',
    version: '2.0',
    clause: {
      id: 'protected-read',
      name: 'Protect restricted files',
      condition: 'Deny reads of files classified as restricted.',
      expected: 'deny',
    },
    sha256: 'recorded-sha256-value',
    definition: {
      description: 'Controls access to the exercise workspace.',
      scope: 'Local policy gateway requests',
      clauses: [
        {
          id: 'protected-read',
          name: 'Protect restricted files',
          condition: 'Deny reads of files classified as restricted.',
          expected: 'deny',
        },
        {
          id: 'approved-read',
          name: 'Allow approved files',
          condition: 'Allow reads of files classified as public.',
          expected: 'allow',
        },
      ],
    },
  },
};

it('shows the exact originating input and recorded tool result with its source document', () => {
  render(
    <SecurityFindingsPanel
      scope={{ type: 'all' }}
      result={{ ...result, findings: [policyFinding] }}
    />
  );
  openFinding();
  const invocation = screen.getByTestId('securityFindingInvocation');
  expect(invocation).toHaveTextContent('Originating tool call');
  expect(invocation).toHaveTextContent('exec_command');
  expect(invocation).toHaveTextContent(
    'node policy_gateway.js --request-id request-exact-a --action read-protected'
  );
  expect(invocation).toHaveTextContent('Recorded tool result: exited 77');
  expect(invocation).toHaveTextContent(
    'Matched to this policy decision by the recorded request ID'
  );
  expect(invocation).toHaveTextContent('call-exact-a');
  expect(invocation).toHaveTextContent('logs-agent.tools · tool-doc-a');
  expect(
    within(invocation).getByRole('link', { name: 'Open tool call in Discover' })
  ).toBeInTheDocument();
  expect(mockGetRedirectUrl).toHaveBeenCalledWith(
    expect.objectContaining({
      dataViewSpec: { title: 'logs-agent.tools', timeFieldName: '@timestamp' },
      query: { language: 'kuery', query: '_id: "tool-doc-a"' },
      timeRange: { from: '2026-10-12T14:30:00.000Z', to: '2026-10-14T14:30:00.000Z' },
    })
  );
  expect(screen.queryByTestId('securityFindingUnattributed')).not.toBeInTheDocument();
});

it('does not infer policy outcome from the process exit code', () => {
  const invocation = policyFinding.invocation;
  if (!invocation) throw new Error('Expected invocation fixture');
  render(
    <SecurityFindingsPanel
      scope={{ type: 'all' }}
      result={{
        ...result,
        findings: [{ ...policyFinding, invocation: { ...invocation, processExitCode: 0 } }],
      }}
    />
  );
  openFinding();
  expect(screen.getByTestId('securityFindingInvocation')).toHaveTextContent(
    'Recorded tool result: exited 0'
  );
  expect(screen.getByTestId('securityFindingDecision')).toHaveTextContent('Blocked');
});

it('keeps unattributed findings honest about their session-only association', () => {
  render(<SecurityFindingsPanel scope={{ type: 'all' }} />);
  openFinding();
  expect(screen.getByTestId('securityFindingUnattributed')).toHaveTextContent(
    'No exact tool or prompt attribution'
  );
  expect(screen.queryByTestId('securityFindingInvocation')).not.toBeInTheDocument();
  expect(
    screen.queryByRole('link', { name: 'Open tool call in Discover' })
  ).not.toBeInTheDocument();
});

it('exposes the matched policy, engine, version and clause above its recorded definition', () => {
  render(
    <SecurityFindingsPanel
      scope={{ type: 'all' }}
      result={{ ...result, findings: [policyFinding] }}
    />
  );
  openFinding();
  const policy = screen.getByTestId('securityFindingPolicy');
  expect(policy).toHaveTextContent('Workspace data boundary');
  expect(policy).toHaveTextContent('Version 2.0');
  expect(policy).toHaveTextContent('Evaluated by Local exercise policy gateway');
  expect(policy).toHaveTextContent('Matched clause');
  expect(policy).toHaveTextContent('Protect restricted files');
  expect(policy).toHaveTextContent('Expected decision: deny');
  const disclosure = within(policy).getByRole('button', { name: 'View policy' });
  expect(disclosure).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(disclosure);
  expect(disclosure).toHaveAttribute('aria-expanded', 'true');
  expect(policy).toHaveTextContent('Recorded policy snapshot at the time of this decision.');
  expect(policy).toHaveTextContent('Controls access to the exercise workspace.');
  expect(policy).toHaveTextContent('Scope: Local policy gateway requests');
  expect(policy).toHaveTextContent('Allow approved files');
  expect(policy).toHaveTextContent('Recorded SHA-256: recorded-sha256-value');
  expect(policy).not.toHaveTextContent('Verified');
});

it('keeps a missing policy definition explicit instead of fabricating a rule', () => {
  render(<SecurityFindingsPanel scope={{ type: 'all' }} />);
  openFinding();
  fireEvent.click(screen.getByRole('button', { name: 'View policy' }));
  expect(screen.getByTestId('securityFindingPolicy')).toHaveTextContent(
    'The policy definition was not captured with this decision.'
  );
  expect(screen.getByTestId('securityFindingPolicy')).not.toHaveTextContent('Matched clause');
});

it('links the exact detection rule through the current Kibana space separately from policy', () => {
  render(<SecurityFindingsPanel scope={{ type: 'all' }} />);
  openFinding();
  expect(mockGetUrlForApp).toHaveBeenCalledWith('securitySolutionUI', {
    deepLinkId: 'rules',
    path: '/id/rule-a',
  });
  expect(screen.getByRole('link', { name: 'View detection rule' })).toHaveAttribute(
    'href',
    '/s/test-space/app/security/rules/id/rule-a'
  );
});

it('does not create a rule link without a recorded rule identifier', () => {
  render(
    <SecurityFindingsPanel
      scope={{ type: 'all' }}
      result={{
        ...result,
        findings: [{ ...finding, rule: { name: 'External detection' } }],
      }}
    />
  );
  openFinding();
  expect(screen.queryByRole('link', { name: 'View detection rule' })).not.toBeInTheDocument();
});

it('redacts and bounds tool input and policy snapshot content before rendering', () => {
  const invocation = policyFinding.invocation;
  const policy = policyFinding.policy;
  if (!invocation || !policy?.definition || !policy.clause)
    throw new Error('Expected policy fixture');
  render(
    <SecurityFindingsPanel
      scope={{ type: 'all' }}
      result={{
        ...result,
        findings: [
          {
            ...policyFinding,
            invocation: {
              ...invocation,
              input: `node gateway.js --token secret-value-98765 ${'x'.repeat(7000)}`,
            },
            policy: {
              ...policy,
              clause: {
                ...policy.clause,
                condition: 'token=secret-value-98765 cannot leave the workspace',
              },
              definition: { ...policy.definition, description: 'secret-value-98765 is restricted' },
            },
          },
        ],
      }}
    />
  );
  openFinding();
  expect(screen.getByRole('dialog')).not.toHaveTextContent('secret-value-98765');
  expect(screen.getByTestId('securityFindingInvocation')).toHaveTextContent('[REDACTED]');
  expect(screen.getByTestId('securityFindingInvocation')).toHaveTextContent(
    'Recognized credential values are masked.'
  );
  expect(screen.getByTestId('securityFindingInvocation')).toHaveTextContent(
    'Input shortened for display.'
  );
  expect(screen.getByRole('dialog')).not.toHaveTextContent('x'.repeat(6001));
});

it('describes native monitoring as detection without implying a deny or completed action', () => {
  const invocation = policyFinding.invocation;
  const policy = policyFinding.policy;
  if (!invocation || !policy) throw new Error('Expected policy and invocation fixture');
  render(
    <SecurityFindingsPanel
      scope={{ type: 'all' }}
      result={{
        ...result,
        findings: [
          {
            ...policyFinding,
            kind: 'detection',
            outcome: 'unknown',
            policy: { ...policy, mode: 'monitor' },
            invocation: {
              ...invocation,
              correlation: 'exact_native_observation',
              processExitCode: undefined,
            },
          },
        ],
      }}
    />
  );
  openFinding();
  const modal = screen.getByRole('dialog');
  const decision = within(modal).getByTestId('securityFindingDecision');
  expect(decision).toHaveTextContent('Create finding');
  expect(decision).toHaveTextContent('Monitor only');
  expect(decision).toHaveTextContent('Unknown');
  expect(decision).not.toHaveTextContent('Deny');
  expect(modal).toHaveTextContent('Detection created a finding without blocking the action.');
  expect(modal).not.toHaveTextContent('does not establish whether a control blocked');
});
