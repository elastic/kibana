/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { OverviewFindings } from './overview_findings';
import { useSecurityFindings } from './security_findings/use_security_findings';
import type { SecurityFinding } from './security_findings/types';

jest.mock('./security_findings/use_security_findings');
jest.mock('../../../common/hooks/use_space_id', () => ({ useSpaceId: () => 'test-space' }));
jest.mock('../../../common/components/formatted_date', () => ({
  PreferenceFormattedDate: ({ value }: { value: Date }) => <time>{value.toISOString()}</time>,
}));
jest.mock('./ai_agents/provider_icon', () => ({ ProviderIcon: () => <span /> }));
jest.mock('./security_findings/finding_details', () => ({
  FindingDetails: ({ finding }: { finding: SecurityFinding }) => (
    <div role="dialog">{finding.source.id}</div>
  ),
}));
const finding: SecurityFinding = {
  id: 'alert-one',
  timestamp: '2026-10-14T12:00:00Z',
  title: 'Customer lookup policy violation',
  severity: 'high',
  status: 'open',
  kind: 'policy_violation',
  outcome: 'unknown',
  agent: { id: 'agent-a', provider: 'google_adk', name: 'Google ADK', sessionId: 'session-a' },
  rule: { id: 'rule-a', name: 'Customer lookup' },
  source: { index: 'alerts', id: 'alert-one' },
  ancestors: [],
  entityIds: [],
};
const result = {
  findings: [finding],
  isLoading: false,
  isRefreshing: false,
  unavailable: false,
  partial: false,
  refetch: jest.fn(),
};
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useSecurityFindings).mockReturnValue(result);
});

it('separates review and blocked categories while preserving the blocked evidence', () => {
  jest.mocked(useSecurityFindings).mockReturnValue({
    ...result,
    findings: [
      {
        ...finding,
        id: 'blocked',
        title: 'Export blocked',
        outcome: 'blocked',
        source: { index: 'alerts', id: 'blocked' },
      },
      finding,
    ],
  });
  render(<OverviewFindings scope={{ type: 'all' }} />);
  expect(screen.getByRole('heading', { name: 'Security priorities' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Blocked 1' })).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Inspect finding: Export blocked' })
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Blocked 1' }));
  fireEvent.click(screen.getByRole('button', { name: 'Inspect finding: Export blocked' }));
  expect(screen.getByRole('dialog')).toHaveTextContent('blocked');
});

it('retains individual evidence when repeated policy alerts are expanded', () => {
  jest.mocked(useSecurityFindings).mockReturnValue({
    ...result,
    findings: [
      finding,
      {
        ...finding,
        id: 'alert-two',
        timestamp: '2026-10-14T13:00:00Z',
        source: { index: 'alerts', id: 'alert-two' },
      },
    ],
  });
  render(<OverviewFindings scope={{ type: 'all' }} />);
  expect(
    screen.getAllByRole('button', { name: 'Inspect finding: Customer lookup policy violation' })
  ).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: '2 related alerts' }));
  fireEvent.click(
    screen.getByRole('button', {
      name: '2026-10-14T12:00:00.000Z · Customer lookup policy violation',
    })
  );
  expect(screen.getByRole('dialog')).toHaveTextContent('alert-one');
});

it('keeps sample limits visible and hides stale rows when evidence becomes unavailable', () => {
  jest.mocked(useSecurityFindings).mockReturnValue({ ...result, partial: true });
  const view = render(<OverviewFindings scope={{ type: 'all' }} />);
  expect(
    screen.getByText('Based on 1 loaded alert. Additional evidence may be outside this sample.')
  ).toBeInTheDocument();
  jest.mocked(useSecurityFindings).mockReturnValue({ ...result, unavailable: true });
  view.rerender(<OverviewFindings scope={{ type: 'all' }} />);
  expect(screen.queryByText(finding.title)).not.toBeInTheDocument();
  expect(
    screen.getByText(
      'Detection evidence is unavailable. Check alert access and refresh to continue.'
    )
  ).toBeInTheDocument();
});

it('bounds the overview to three priority groups and keeps the remaining evidence accessible', () => {
  jest.mocked(useSecurityFindings).mockReturnValue({
    ...result,
    findings: Array.from({ length: 5 }, (_, index) => ({
      ...finding,
      id: `alert-${index}`,
      title: `Policy ${index}`,
      rule: { id: `rule-${index}`, name: `Policy ${index}` },
      source: { index: 'alerts', id: `alert-${index}` },
    })),
  });
  render(<OverviewFindings scope={{ type: 'all' }} />);
  expect(screen.getAllByRole('button', { name: /^Inspect finding:/ })).toHaveLength(3);
  fireEvent.click(screen.getByRole('button', { name: 'View all 5 in this category' }));
  expect(screen.getAllByRole('button', { name: /^Inspect finding:/ })).toHaveLength(5);
  fireEvent.click(screen.getByRole('button', { name: 'Show fewer' }));
  expect(screen.getAllByRole('button', { name: /^Inspect finding:/ })).toHaveLength(3);
});

it('opens the blocked category when the evidence contains only confirmed blocks', () => {
  jest.mocked(useSecurityFindings).mockReturnValue({
    ...result,
    findings: [{ ...finding, title: 'Google rejected the export', outcome: 'blocked' }],
  });
  render(<OverviewFindings scope={{ type: 'all' }} />);
  expect(screen.getByRole('button', { name: 'Blocked 1' })).toHaveAttribute('aria-pressed', 'true');
  expect(
    screen.getByRole('button', { name: 'Inspect finding: Google rejected the export' })
  ).toBeInTheDocument();
});
