/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { PND_DISCOVERY_CONTEXT_URL, SYSTEM_SECURITY_WATCH_DEEP_ID } from '@kbn/pnd-common';
import type {
  GetDiscoveryContextResponse,
  PndProposalGroup,
  PndProposalRow,
  RecommendedAction,
} from '@kbn/pnd-common';

import { renderWithPndProviders } from '../../test_utils/render_with_pnd_providers';
import { BlastRadius } from '.';

const createProposal = ({
  correlationId,
  recommendedAction = 'contain',
}: {
  correlationId: string;
  recommendedAction?: RecommendedAction;
}): PndProposalRow => ({
  alwaysGate: false,
  correlationId,
  createdAt: '2026-08-05T12:00:00.000Z',
  gateId: `gate-${correlationId}`,
  inputSchema: {},
  message: `Gate message for ${correlationId}`,
  reasoning: `Reasoning for ${correlationId}`,
  recommendedAction,
  reversible: true,
  sourceId: `${SYSTEM_SECURITY_WATCH_DEEP_ID}:run-${correlationId}:step-1`,
  stepExecutionId: `step-${correlationId}`,
  stepId: `await_${recommendedAction}`,
  title: `Gate for ${correlationId}`,
  workflowId: SYSTEM_SECURITY_WATCH_DEEP_ID,
  workflowRunId: `run-${correlationId}`,
});

const groups: PndProposalGroup[] = [
  {
    proposals: [
      createProposal({ correlationId: 'ad-1' }),
      createProposal({ correlationId: 'ad-2' }),
    ],
    recommendedAction: 'contain',
  },
];

/** `web-1` is reached by both discoveries, `root` by one, so the merge has something to sum. */
const discoveryContext: GetDiscoveryContextResponse = {
  contexts: [
    {
      correlationId: 'ad-1',
      entities: [
        { count: 3, field: 'host.name', value: 'web-1' },
        { count: 1, field: 'user.name', value: 'root' },
      ],
      riskScore: 73,
    },
    {
      correlationId: 'ad-2',
      entities: [{ count: 4, field: 'host.name', value: 'web-1' }],
    },
  ],
};

const defaultProps = {
  activeEntityId: null,
  groups,
  onToggleEntity: jest.fn(),
};

const chips = (): HTMLElement[] => screen.getAllByTestId('blast-radius-chip');

describe('BlastRadius', () => {
  const get = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    get.mockResolvedValue(discoveryContext);
  });

  const render = (props: Partial<React.ComponentProps<typeof BlastRadius>> = {}) =>
    renderWithPndProviders(<BlastRadius {...defaultProps} {...props} />, {
      services: { http: { get } },
    });

  it('renders one chip per entity the discoveries reached', async () => {
    render();

    await waitFor(() => expect(chips()).toHaveLength(2));
  });

  it('titles the section', async () => {
    render();

    await waitFor(() => expect(screen.getByText('Blast radius')).toBeInTheDocument());
  });

  /** An empty heading over an empty row says nothing; a degraded enrichment renders nothing at all. */
  it('renders nothing when the enrichment came back empty', async () => {
    get.mockResolvedValue({ contexts: [] });

    render();

    await waitFor(() => expect(get).toHaveBeenCalled());

    expect(screen.queryByTestId('pndBlastRadius')).not.toBeInTheDocument();
  });

  it('renders nothing before the enrichment has landed', () => {
    render();

    expect(screen.queryByTestId('pndBlastRadius')).not.toBeInTheDocument();
  });

  it('renders nothing when the read is refused', async () => {
    get.mockRejectedValue(new Error('forbidden'));

    render();

    await waitFor(() => expect(get).toHaveBeenCalled());

    expect(screen.queryByTestId('pndBlastRadius')).not.toBeInTheDocument();
  });

  it('renders nothing when no proposal on screen is correlated to a discovery', async () => {
    render({
      groups: [
        {
          proposals: [createProposal({ correlationId: '' })],
          recommendedAction: 'contain',
        },
      ],
    });

    await waitFor(() => expect(screen.queryByTestId('pndBlastRadius')).not.toBeInTheDocument());

    expect(get).not.toHaveBeenCalled();
  });

  /** The chips track the watch filter the way the tiles do: only the discoveries on screen. */
  it('asks only for the discoveries the visible proposals carry', async () => {
    render();

    await waitFor(() =>
      expect(get).toHaveBeenCalledWith(PND_DISCOVERY_CONTEXT_URL, {
        query: { correlationIds: ['ad-1', 'ad-2'] },
        version: expect.any(String),
      })
    );
  });

  /** A merged chip's count is the sum across every discovery that contributed the entity. */
  it('sums the count of an entity two discoveries reached', async () => {
    render();

    await waitFor(() => expect(chips()[0]).toHaveTextContent('7'));
  });

  it('leads with the entity the most alerts agreed on', async () => {
    render();

    await waitFor(() => expect(chips()[0]).toHaveTextContent('web-1'));
  });

  it('hands the pressed entity, and the discoveries behind it, to the queue', async () => {
    const onToggleEntity = jest.fn();

    render({ onToggleEntity });

    await waitFor(() => expect(chips()).toHaveLength(2));

    fireEvent.click(chips()[0]);

    expect(onToggleEntity).toHaveBeenCalledWith({
      correlationIds: ['ad-1', 'ad-2'],
      count: 7,
      field: 'host.name',
      id: 'host.name:web-1',
      value: 'web-1',
    });
  });

  it('announces the chip the queue is filtered by as pressed', async () => {
    render({ activeEntityId: 'host.name:web-1' });

    await waitFor(() => expect(chips()[0]).toHaveAttribute('aria-pressed', 'true'));
  });
});
