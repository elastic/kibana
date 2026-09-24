/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { buildDataTableRecord, type EsHitRecord } from '@kbn/discover-utils';
import { rawEventData, TestProviders } from '../../../../common/mock';
import { noopCellActionRenderer } from '../../../shared/components/cell_actions';
import { GRAPH_TOOLS_TEST_ID, GraphDetails } from '.';

jest.mock('./components/graph_visualization', () => ({
  GraphVisualization: jest.fn(({ mode, scopeId, eventIds, timestamp, isAlert }) => (
    <div
      data-test-subj="mockGraphVisualization"
      data-mode={mode}
      data-scope-id={scopeId}
      data-event-ids={eventIds?.join(',')}
      data-timestamp={timestamp}
      data-is-alert={String(isAlert)}
    />
  )),
}));

jest.mock('../../main/hooks/use_graph_preview', () => ({
  useGraphPreview: jest.fn().mockReturnValue({
    timestamp: '2024-01-15T10:00:00.000Z',
    eventIds: ['event-1'],
    shouldShowGraph: true,
    hasGraphData: true,
  }),
}));

const mockOnAlertUpdated = jest.fn();

const createHit = (
  fields: Record<string, unknown[]> = {}
): ReturnType<typeof buildDataTableRecord> =>
  buildDataTableRecord({
    ...rawEventData,
    _id: 'test-doc-id',
    fields: { ...(rawEventData.fields ?? {}), ...fields },
  } as unknown as EsHitRecord);

const renderGraphDetails = (fields: Record<string, unknown[]> = {}) =>
  render(
    <TestProviders>
      <GraphDetails
        hit={createHit(fields)}
        renderCellActions={noopCellActionRenderer}
        onAlertUpdated={mockOnAlertUpdated}
      />
    </TestProviders>
  );

describe('<GraphDetails />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the graph tools wrapper', () => {
    renderGraphDetails();
    expect(screen.getByTestId(GRAPH_TOOLS_TEST_ID)).toBeInTheDocument();
  });

  it('renders the GraphVisualization in event mode', () => {
    renderGraphDetails();
    const viz = screen.getByTestId('mockGraphVisualization');
    expect(viz).toHaveAttribute('data-mode', 'event');
  });

  it('passes GRAPH_SCOPE_ID as scopeId', () => {
    renderGraphDetails();
    const viz = screen.getByTestId('mockGraphVisualization');
    expect(viz).toHaveAttribute('data-scope-id', 'graph');
  });

  it('passes timestamp and eventIds from useGraphPreview', () => {
    renderGraphDetails();
    const viz = screen.getByTestId('mockGraphVisualization');
    expect(viz).toHaveAttribute('data-event-ids', 'event-1');
    expect(viz).toHaveAttribute('data-timestamp', '2024-01-15T10:00:00.000Z');
  });

  it('passes isAlert=false for non-alert events', () => {
    renderGraphDetails({ 'event.kind': ['event'] });
    const viz = screen.getByTestId('mockGraphVisualization');
    expect(viz).toHaveAttribute('data-is-alert', 'false');
  });

  it('passes isAlert=true for signal events', () => {
    renderGraphDetails({ 'event.kind': ['signal'] });
    const viz = screen.getByTestId('mockGraphVisualization');
    expect(viz).toHaveAttribute('data-is-alert', 'true');
  });

  it('returns null when hit has no _id', () => {
    const hit = buildDataTableRecord({ ...rawEventData, _id: '' } as unknown as EsHitRecord);

    const { container } = render(
      <TestProviders>
        <GraphDetails
          hit={hit}
          renderCellActions={noopCellActionRenderer}
          onAlertUpdated={mockOnAlertUpdated}
        />
      </TestProviders>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('returns null when timestamp is missing', () => {
    const { useGraphPreview } = jest.requireMock('../../main/hooks/use_graph_preview');
    useGraphPreview.mockReturnValueOnce({
      timestamp: null,
      eventIds: ['event-1'],
      shouldShowGraph: false,
      hasGraphData: false,
    });

    const { container } = renderGraphDetails();
    expect(container).toBeEmptyDOMElement();
  });
});
