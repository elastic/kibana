/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ExecutiveBriefModal } from './executive_brief_modal';
import type { ExecutiveBriefModalProps } from './executive_brief_modal';
import type { ExecutiveBriefAgentSnapshot } from './executive_brief_agents';
import type { ExecutiveBriefPdfPayload } from './executive_brief_pdf';
import { useExecutiveBriefAgents } from './hooks/use_executive_brief_agents';
import { useConverseOnce } from './hooks/use_converse_api';
import { buildAttackMatrix } from './overview_metrics';

jest.mock('./hooks/use_executive_brief_agents');
jest.mock('./hooks/use_converse_api');
jest.mock('../../../common/hooks/use_space_id', () => ({ useSpaceId: () => 'default' }));
jest.mock('../../../common/lib/kibana', () => ({
  useDateFormat: () => 'MMM D, YYYY HH:mm',
  useTimeZone: () => 'America/Denver',
  useKibana: () => ({ services: { notifications: { toasts: { addWarning: jest.fn() } } } }),
}));
jest.mock('./ai_agents/provider_icon', () => ({ ProviderIcon: () => <span /> }));
jest.mock('./executive_brief_metrics', () => ({ ExecutiveBriefMetrics: () => <div /> }));
jest.mock('./executive_brief_pdf', () => ({
  ExecutiveBriefExportButton: ({ payload }: { payload: ExecutiveBriefPdfPayload }) => (
    <div data-test-subj="export-payload">{JSON.stringify(payload)}</div>
  ),
}));

const agentSnapshot: ExecutiveBriefAgentSnapshot = {
  lookbackDays: 30,
  providers: [
    {
      provider: 'cursor',
      name: 'Cursor',
      status: 'available',
      identityCount: 1,
      sessions: 5,
      toolObservations: 70,
      failedToolObservations: 2,
      unknownToolOutcomes: 10,
      evaluatedSessions: 1,
      changedSessions: 1,
    },
  ],
  totals: { agentIdentities: 1, externalSessions: 5, evaluatedSessions: 1, changedSessions: 1 },
  changedSessions: [
    {
      provider: 'cursor',
      agentId: 'installation',
      sessionId: 'session',
      routeKey: '["installation","session"]',
      title: 'Investigate access',
      lastSeen: '2026-10-12T12:00:00Z',
      source: { index: 'logs-cursor.entity_intelligence-default', id: 'doc' },
      findings: [
        { kind: 'new_tool', toolName: 'shell', observed: 1, threshold: 1, baselineSampleSize: 5 },
      ],
    },
  ],
  builderAgents: [],
  limitations: ['cumulative_observations'],
};
const props: ExecutiveBriefModalProps = {
  onClose: jest.fn(),
  onInvestigate: jest.fn(),
  onInvestigateCursor: jest.fn(),
  stats: { totalEntities: 20, byType: [], byLevel: [], criticalCount: 0, highCount: 0 },
  entities: [],
  tactics: [],
  rules: [],
  matrix: buildAttackMatrix([]),
  leads: [],
  leadsCount: 0,
  anomalies: [],
  coverage: {
    entityStore: 'available',
    entities: 'available',
    detections: 'available',
    anomalies: 'available',
    huntingLeads: 'disabled',
  },
};
const generation = {
  generate: jest.fn(),
  reset: jest.fn(),
  result: undefined,
  error: undefined,
  isGenerating: false,
  generatedAt: undefined,
  connectorId: 'model',
  connectorName: 'Test model',
  hasConnector: true,
  isConnectorLoading: false,
};
const agentResult = {
  snapshot: agentSnapshot,
  isLoading: false,
  isRefreshing: false,
  refetch: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useConverseOnce).mockReturnValue(generation);
  jest.mocked(useExecutiveBriefAgents).mockReturnValue(agentResult);
});

it('waits for agent and entity evidence before generating and exporting', async () => {
  jest.mocked(useExecutiveBriefAgents).mockReturnValue({ ...agentResult, isLoading: true });
  const view = render(<ExecutiveBriefModal {...props} />);
  expect(generation.generate).not.toHaveBeenCalled();
  expect(screen.queryByTestId('export-payload')).not.toBeInTheDocument();
  jest.mocked(useExecutiveBriefAgents).mockReturnValue(agentResult);
  view.rerender(<ExecutiveBriefModal {...props} />);
  await waitFor(() => expect(generation.generate).toHaveBeenCalledTimes(1));
  expect(generation.generate.mock.calls[0][0]).toContain('Cursor');
  expect(screen.getByTestId('export-payload')).toHaveTextContent('"externalSessions":5');
});

it('keeps generated evidence frozen until explicit refresh', async () => {
  const view = render(<ExecutiveBriefModal {...props} />);
  await waitFor(() => expect(generation.generate).toHaveBeenCalledTimes(1));
  const originalPrompt = generation.generate.mock.calls[0][0];
  jest.mocked(useExecutiveBriefAgents).mockReturnValue({
    ...agentResult,
    snapshot: { ...agentSnapshot, totals: { ...agentSnapshot.totals, externalSessions: 9 } },
  });
  view.rerender(
    <ExecutiveBriefModal
      {...props}
      stats={{
        ...props.stats,
        totalEntities: 40,
        byType: [],
        byLevel: [],
        criticalCount: 0,
        highCount: 0,
      }}
    />
  );
  expect(screen.getByTestId('export-payload')).toHaveTextContent('"externalSessions":5');
  expect(generation.generate).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Regenerate brief' }));
  await waitFor(() => expect(generation.generate).toHaveBeenCalledTimes(2));
  expect(generation.generate.mock.calls[1][0]).not.toEqual(originalPrompt);
  expect(screen.getByTestId('export-payload')).toHaveTextContent('"externalSessions":9');
});

it('keeps factual evidence and export available without a connector', async () => {
  jest
    .mocked(useConverseOnce)
    .mockReturnValue({ ...generation, hasConnector: false, connectorId: '', connectorName: '' });
  render(<ExecutiveBriefModal {...props} />);
  await screen.findByTestId('export-payload');
  expect(generation.generate).not.toHaveBeenCalled();
  expect(screen.getByText('Cursor')).toBeInTheDocument();
  expect(screen.getByText(/Configure an AI connector/)).toBeInTheDocument();
});

it('routes a behavior finding to its exact Cursor session and closes the brief', async () => {
  render(<ExecutiveBriefModal {...props} />);
  fireEvent.click(
    await screen.findByRole('button', { name: 'Inspect session Investigate access' })
  );
  expect(props.onInvestigateCursor).toHaveBeenCalledWith('["installation","session"]');
  expect(props.onClose).toHaveBeenCalled();
});

it('invalidates old evidence when a previously readable source becomes unavailable', async () => {
  const view = render(<ExecutiveBriefModal {...props} />);
  await screen.findByText('Investigate access');
  jest.mocked(useExecutiveBriefAgents).mockReturnValue({
    ...agentResult,
    snapshot: {
      ...agentSnapshot,
      providers: [{ provider: 'cursor', name: 'Cursor', status: 'unavailable' }],
      totals: {},
      changedSessions: [],
    },
  });
  view.rerender(<ExecutiveBriefModal {...props} />);
  await waitFor(() => expect(screen.queryByText('Investigate access')).not.toBeInTheDocument());
  expect(generation.reset).toHaveBeenCalled();
  expect(screen.getByTestId('export-payload')).not.toHaveTextContent('Investigate access');
  expect(screen.getByText(/Regenerate the brief to add/)).toBeInTheDocument();
});

it('starts a single generation under StrictMode after capturing the evidence', async () => {
  render(
    <React.StrictMode>
      <ExecutiveBriefModal {...props} />
    </React.StrictMode>
  );
  await waitFor(() => expect(generation.generate).toHaveBeenCalledTimes(1));
});

it('does not present model-written drivers as supporting evidence', async () => {
  jest.mocked(useConverseOnce).mockReturnValue({
    ...generation,
    result: [
      'NARRATIVE: Review the recorded behavior change.',
      'DRIVER: Unsupported actor association fabricated by the model.',
      'DECISION: Inspect the recorded session.',
    ].join('\n'),
  });
  render(<ExecutiveBriefModal {...props} />);
  expect(await screen.findByText('Review the recorded behavior change.')).toBeInTheDocument();
  expect(
    screen.queryByText('Unsupported actor association fabricated by the model.')
  ).not.toBeInTheDocument();
  expect(screen.getByText('Investigate access')).toBeInTheDocument();
});

it('withholds malformed model output while preserving source facts and retry', async () => {
  jest.mocked(useConverseOnce).mockReturnValue({
    ...generation,
    result: 'DRIVER: Unsupported actor association fabricated by the model.',
    generatedAt: 1791842400000,
  });
  render(<ExecutiveBriefModal {...props} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('could not be generated');
  expect(screen.getByTestId('export-payload')).not.toHaveTextContent('Assessment generated');
  expect(
    screen.queryByText('Unsupported actor association fabricated by the model.')
  ).not.toBeInTheDocument();
  expect(screen.getByText('Investigate access')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(generation.generate).toHaveBeenCalledTimes(2);
});
