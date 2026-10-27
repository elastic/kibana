/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { RunGraphTraversalResponse } from '@kbn/entity-store/common';
import { TestProviders } from '../../../../../../common/mock';
import { BlastRadiusSubTab } from './blast_radius_sub_tab';
import { useRunBlastRadius } from './use_run_blast_radius';
import {
  BLAST_RADIUS_CLEAR_EXCLUSIONS_TEST_ID,
  BLAST_RADIUS_ERROR_TEST_ID,
  BLAST_RADIUS_EXCLUSION_BADGE_TEST_ID,
  BLAST_RADIUS_EXCLUSIONS_TEST_ID,
  BLAST_RADIUS_GRAPH_TEST_ID,
  BLAST_RADIUS_LOADING_TEST_ID,
  BLAST_RADIUS_RUN_BUTTON_TEST_ID,
  BLAST_RADIUS_SUMMARY_TEST_ID,
} from './test_ids';

jest.mock('./use_run_blast_radius');
jest.mock('@kbn/cloud-security-posture-graph', () => ({
  Graph: ({
    nodes,
    edges,
  }: {
    nodes: Array<{ id: string; toolbarItemsFn?: () => Array<{ onClick: () => void }> }>;
    edges: unknown[];
  }) => (
    <div data-test-subj="mockGraph">
      {`${nodes.length} nodes, ${edges.length} edges`}
      {nodes.map((node) =>
        node
          .toolbarItemsFn?.()
          .map((item, index) => (
            <button
              type="button"
              key={`${node.id}-${index}`}
              data-test-subj={`mockExclude-${node.id}`}
              onClick={item.onClick}
            />
          ))
      )}
    </div>
  ),
}));

const mockUseRunBlastRadius = useRunBlastRadius as jest.MockedFunction<typeof useRunBlastRadius>;

const SEED = 'user:john.doe@acmecrm.com@okta';

const completed: RunGraphTraversalResponse = {
  execution_id: 'exec-1',
  status: 'completed',
  duration_ms: 1200,
  output: {
    scenario_id: 'okta-user-to-aws-resources',
    scenario_name: 'Okta user to AWS resources',
    seed_id: SEED,
    hops_planned: 6,
    hops_executed: 1,
    stop_reason: 'frontier_exhausted',
    truncated: false,
    node_count: 2,
    edge_count: 1,
    nodes: [
      { id: SEED, hop: 0, via: 'seed' },
      { id: 'arn:aws:iam::1:role/okta-prod-admin', hop: 1, via: 'can_assume' },
    ],
    edges: [
      {
        hop: 1,
        relation: 'can_assume',
        source: SEED,
        target: 'arn:aws:iam::1:role/okta-prod-admin',
        count: 1,
      },
    ],
  },
};

const mockMutation = (
  overrides: Partial<ReturnType<typeof useRunBlastRadius>>
): ReturnType<typeof useRunBlastRadius> =>
  ({
    mutate: jest.fn(),
    reset: jest.fn(),
    data: undefined,
    error: null,
    isLoading: false,
    ...overrides,
  } as unknown as ReturnType<typeof useRunBlastRadius>);

const renderTab = () =>
  render(
    <TestProviders>
      <BlastRadiusSubTab entityId={SEED} />
    </TestProviders>
  );

describe('BlastRadiusSubTab', () => {
  it('offers to run the traversal and runs it for the entity on click', () => {
    const mutation = mockMutation({});
    mockUseRunBlastRadius.mockReturnValue(mutation);

    renderTab();

    expect(mockUseRunBlastRadius).toHaveBeenCalledWith({ entityId: SEED });
    fireEvent.click(screen.getByTestId(BLAST_RADIUS_RUN_BUTTON_TEST_ID));
    expect(mutation.mutate).toHaveBeenCalledTimes(1);
    expect(mutation.mutate).toHaveBeenCalledWith({ exclusions: [] });
    expect(screen.queryByTestId(BLAST_RADIUS_EXCLUSIONS_TEST_ID)).not.toBeInTheDocument();
  });

  it('excludes a node from the graph, re-runs with it, lists it and lets it be removed', () => {
    const mutation = mockMutation({ data: completed });
    mockUseRunBlastRadius.mockReturnValue(mutation);
    const role = 'arn:aws:iam::1:role/okta-prod-admin';

    renderTab();

    fireEvent.click(screen.getByTestId(`mockExclude-${role}`));
    expect(mutation.mutate).toHaveBeenLastCalledWith({
      exclusions: [{ field: 'entity.id', values: [role] }],
    });
    const badge = screen.getByTestId(BLAST_RADIUS_EXCLUSION_BADGE_TEST_ID);
    expect(badge).toHaveTextContent('okta-prod-admin');

    // "Run again" keeps the exclusions.
    fireEvent.click(screen.getByTestId(BLAST_RADIUS_RUN_BUTTON_TEST_ID));
    expect(mutation.mutate).toHaveBeenLastCalledWith({
      exclusions: [{ field: 'entity.id', values: [role] }],
    });

    fireEvent.click(badge.querySelector('button') as Element);
    expect(mutation.mutate).toHaveBeenLastCalledWith({ exclusions: [] });
    expect(screen.queryByTestId(BLAST_RADIUS_EXCLUSIONS_TEST_ID)).not.toBeInTheDocument();
  });

  it('clears every exclusion at once', () => {
    const mutation = mockMutation({ data: completed });
    mockUseRunBlastRadius.mockReturnValue(mutation);

    renderTab();
    fireEvent.click(screen.getByTestId('mockExclude-arn:aws:iam::1:role/okta-prod-admin'));
    fireEvent.click(screen.getByTestId(BLAST_RADIUS_CLEAR_EXCLUSIONS_TEST_ID));

    expect(mutation.mutate).toHaveBeenLastCalledWith({ exclusions: [] });
  });

  it('shows a loading state while the workflow runs', () => {
    mockUseRunBlastRadius.mockReturnValue(mockMutation({ isLoading: true }));

    renderTab();

    expect(screen.getByTestId(BLAST_RADIUS_LOADING_TEST_ID)).toBeInTheDocument();
    expect(screen.queryByTestId(BLAST_RADIUS_RUN_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });

  it('renders the summary and graph once the workflow completes', () => {
    mockUseRunBlastRadius.mockReturnValue(mockMutation({ data: completed }));

    renderTab();

    expect(screen.getByTestId(BLAST_RADIUS_SUMMARY_TEST_ID)).toHaveTextContent(
      'Okta user to AWS resources: 2 entities and 1 relationship reached in 1 hop.'
    );
    expect(screen.getByTestId(BLAST_RADIUS_GRAPH_TEST_ID)).toBeInTheDocument();
    // 2 entity nodes + 1 label node, each relation becomes two edges.
    expect(screen.getByTestId('mockGraph')).toHaveTextContent('3 nodes, 2 edges');
  });

  it('shows the workflow error when the execution did not complete', () => {
    mockUseRunBlastRadius.mockReturnValue(
      mockMutation({
        data: {
          execution_id: 'exec-2',
          status: 'failed',
          output: null,
          error: 'boom',
          duration_ms: 5,
        },
      })
    );

    renderTab();

    expect(screen.getByTestId(BLAST_RADIUS_ERROR_TEST_ID)).toHaveTextContent('boom');
  });

  it('shows the request error and allows a rerun', () => {
    const mutation = mockMutation({ error: new Error('Workflows management is not available') });
    mockUseRunBlastRadius.mockReturnValue(mutation);

    renderTab();

    expect(screen.getByTestId(BLAST_RADIUS_ERROR_TEST_ID)).toHaveTextContent(
      'Workflows management is not available'
    );
    fireEvent.click(screen.getByTestId(BLAST_RADIUS_RUN_BUTTON_TEST_ID));
    expect(mutation.reset).toHaveBeenCalled();
    expect(mutation.mutate).toHaveBeenCalled();
  });
});
