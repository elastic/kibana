/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useFetchGraphData } from '@kbn/cloud-security-posture-graph/src/hooks';
import { EntityGraphContainer, OPEN_FULL_GRAPH_BUTTON_TEST_ID } from './entity_graph_container';
import type { EntityGraphAttachmentData } from './types';

jest.mock('@kbn/cloud-security-posture-graph/src/hooks', () => ({
  useFetchGraphData: jest.fn(),
}));

// Lightweight probe for the shared flyout GraphPreview so we can assert the
// loading / error / empty / data states without loading the lazy graph renderer.
jest.mock('../../../flyout_v2/shared/components/graph_preview', () => ({
  GraphPreview: ({
    isLoading,
    isError,
    data,
  }: {
    isLoading: boolean;
    isError: boolean;
    data?: { nodes: unknown[] };
  }) => (
    <div data-test-subj="mockGraphPreview">
      {isLoading ? 'loading' : isError ? 'error' : `nodes:${data?.nodes?.length ?? 0}`}
    </div>
  ),
}));

const mockUseFetchGraphData = useFetchGraphData as jest.Mock;

const hostData: EntityGraphAttachmentData = {
  identifierType: 'host',
  identifier: 'server1',
  entityStoreId: 'host:server1',
  timeRange: { from: 'now-30d', to: 'now' },
};

describe('EntityGraphContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFetchGraphData.mockReturnValue({ isLoading: false, isError: false, data: undefined });
  });

  it('seeds useFetchGraphData with the entity id and time window from the payload', () => {
    render(<EntityGraphContainer data={hostData} />);
    expect(mockUseFetchGraphData).toHaveBeenCalledWith(
      expect.objectContaining({
        req: {
          query: {
            entityIds: [{ id: 'host:server1', isOrigin: true }],
            start: 'now-30d',
            end: 'now',
          },
        },
        options: { refetchOnWindowFocus: false },
      })
    );
  });

  it.each([
    ['loading', { isLoading: true, isError: false, data: undefined }, 'loading'],
    ['error', { isLoading: false, isError: true, data: undefined }, 'error'],
    ['empty', { isLoading: false, isError: false, data: { nodes: [], edges: [] } }, 'nodes:0'],
    [
      'data',
      { isLoading: false, isError: false, data: { nodes: [{ id: 'a' }], edges: [] } },
      'nodes:1',
    ],
  ])('renders the %s state', (_name, hookResult, expected) => {
    mockUseFetchGraphData.mockReturnValue(hookResult);
    render(<EntityGraphContainer data={hostData} />);
    expect(screen.getByTestId('mockGraphPreview')).toHaveTextContent(expected);
  });

  it('renders and fires the "Open full graph" button when onOpenFullGraph is provided', () => {
    const onOpenFullGraph = jest.fn();
    render(<EntityGraphContainer data={hostData} onOpenFullGraph={onOpenFullGraph} />);
    fireEvent.click(screen.getByTestId(OPEN_FULL_GRAPH_BUTTON_TEST_ID));
    expect(onOpenFullGraph).toHaveBeenCalledTimes(1);
  });

  it('hides the "Open full graph" button when onOpenFullGraph is omitted', () => {
    render(<EntityGraphContainer data={hostData} />);
    expect(screen.queryByTestId(OPEN_FULL_GRAPH_BUTTON_TEST_ID)).toBeNull();
  });
});
