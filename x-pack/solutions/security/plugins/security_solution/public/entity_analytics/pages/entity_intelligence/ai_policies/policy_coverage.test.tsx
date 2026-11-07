/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { AiPolicyDetectorStatusResponse } from '../../../../../common/entity_intelligence/ai_policies';
import { PolicyCoverage } from './policy_coverage';

jest.mock('../ai_agents/agent_evidence', () => ({
  AgentTimestamp: ({ value }: { value?: string }) => <span>{value}</span>,
}));

const report: AiPolicyDetectorStatusResponse = {
  stale: false,
  status: {
    collectorId: 'local-watch',
    runStartedAt: '2026-10-14T12:00:00Z',
    runCompletedAt: '2026-10-14T12:00:01Z',
    receivedAt: '2026-10-14T12:00:01Z',
    reportedBy: 'James',
    intervalSeconds: 15,
    policiesLoaded: 1,
    sources: [
      {
        provider: 'cursor',
        status: 'healthy',
        observationsScanned: 2,
        findingsCreated: 1,
        lastSuccessAt: '2026-10-14T12:00:01Z',
      },
      {
        provider: 'codex',
        status: 'unavailable',
        observationsScanned: 0,
        findingsCreated: 0,
        message: 'No enabled policies for this provider.',
      },
    ],
  },
};

it('distinguishes a provider without enabled policies from a failed telemetry source', () => {
  render(
    <PolicyCoverage
      data={report}
      loading={false}
      unavailable={false}
      enabledProviders={['cursor', 'agent_builder']}
    />
  );
  expect(screen.getAllByText('No enabled policies')).toHaveLength(3);
  expect(screen.getByText('Claude Desktop')).toBeInTheDocument();
  expect(screen.getByText('Google ADK')).toBeInTheDocument();
  expect(screen.queryByText('Source unavailable')).not.toBeInTheDocument();
  expect(screen.getByText('Reporting')).toBeInTheDocument();
});

it('does not infer disabled policies when the policy list is not readable', () => {
  render(<PolicyCoverage data={report} loading={false} unavailable={false} />);
  expect(screen.queryByText('No enabled policies')).not.toBeInTheDocument();
  expect(screen.getByText('Source unavailable')).toBeInTheDocument();
});

it('does not present an old successful collection as current coverage after policies are disabled', () => {
  render(
    <PolicyCoverage data={report} loading={false} unavailable={false} enabledProviders={[]} />
  );
  expect(screen.getAllByText('No enabled policies')).toHaveLength(5);
  expect(screen.queryByText('Reporting')).not.toBeInTheDocument();
  expect(screen.queryByText('2 tool observations scanned in the last run')).not.toBeInTheDocument();
});
