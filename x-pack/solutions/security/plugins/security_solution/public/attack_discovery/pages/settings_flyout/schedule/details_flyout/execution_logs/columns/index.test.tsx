/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { EuiTableComputedColumnType, EuiTableFieldDataColumnType } from '@elastic/eui';
import type { AttackDiscoveryGeneration } from '@kbn/elastic-assistant-common';

import { getColumns } from '.';

const mockGeneration: AttackDiscoveryGeneration = {
  connector_id: 'connector-1',
  discoveries: 3,
  execution_uuid: 'exec-uuid-1',
  loading_message: 'Analyzing alerts...',
  source_metadata: {
    action_execution_uuid: 'action-exec-1',
    rule_id: 'rule-id-1',
    rule_name: 'Test Rule',
  },
  start: '2026-04-07T12:00:00.000Z',
  status: 'succeeded' as const,
};

const mockWorkflowGeneration: AttackDiscoveryGeneration = {
  ...mockGeneration,
  execution_uuid: 'exec-uuid-workflow',
  workflow_id: 'workflow-id-1',
  workflow_run_id: 'workflow-run-id-1',
};

describe('getColumns', () => {
  it('returns three columns', () => {
    const columns = getColumns(jest.fn());

    expect(columns).toHaveLength(3);
  });

  it('renders an inspect button for a generation with workflow data', () => {
    const onViewDetails = jest.fn();
    const columns = getColumns(onViewDetails);
    const actionColumn = columns[0] as EuiTableComputedColumnType<AttackDiscoveryGeneration>;

    render(<>{actionColumn.render?.(mockWorkflowGeneration)}</>);

    expect(
      screen.getByTestId(`inspect-${mockWorkflowGeneration.execution_uuid}`)
    ).toBeInTheDocument();
  });

  it('renders nothing for a generation without workflow data', () => {
    const onViewDetails = jest.fn();
    const columns = getColumns(onViewDetails);
    const actionColumn = columns[0] as EuiTableComputedColumnType<AttackDiscoveryGeneration>;

    const { container } = render(<>{actionColumn.render?.(mockGeneration)}</>);

    expect(container.querySelector('[data-test-subj^="inspect-"]')).not.toBeInTheDocument();
  });

  it('calls onViewDetails with the item when the inspect button is clicked', () => {
    const onViewDetails = jest.fn();
    const columns = getColumns(onViewDetails);
    const actionColumn = columns[0] as EuiTableComputedColumnType<AttackDiscoveryGeneration>;

    render(<>{actionColumn.render?.(mockWorkflowGeneration)}</>);

    fireEvent.click(screen.getByTestId(`inspect-${mockWorkflowGeneration.execution_uuid}`));

    expect(onViewDetails).toHaveBeenCalledWith(mockWorkflowGeneration);
  });

  it('renders the start value in the start column', () => {
    const columns = getColumns(jest.fn());
    const startColumn = columns[1] as EuiTableFieldDataColumnType<AttackDiscoveryGeneration>;

    const { container } = render(
      <>{startColumn.render?.('2026-04-07T12:00:00.000Z', mockGeneration)}</>
    );

    expect(container.textContent).toBe('2026-04-07T12:00:00.000Z');
  });

  it('renders the status value in the status column', () => {
    const columns = getColumns(jest.fn());
    const statusColumn = columns[2] as EuiTableFieldDataColumnType<AttackDiscoveryGeneration>;

    const { container } = render(<>{statusColumn.render?.('succeeded', mockGeneration)}</>);

    expect(container.textContent).toBe('succeeded');
  });
});
