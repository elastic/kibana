/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import type { AttackDiscoveryGeneration } from '@kbn/elastic-assistant-common';

import { TestProviders } from '../../../../common/mock';
import { getMockConnectors } from '../../../../attack_discovery/pages/mock/mock_connectors';
import { useGetAttackDiscoveryGenerations } from '../../../../attack_discovery/pages/use_get_attack_discovery_generations';
import {
  GenerationsControlCenterFlyout,
  GENERATIONS_CONTROL_CENTER_BACK_BUTTON_TEST_ID,
  GENERATIONS_CONTROL_CENTER_EMPTY_STATE_TEST_ID,
  GENERATIONS_CONTROL_CENTER_FLYOUT_TEST_ID,
} from '.';

jest.mock('../../../../attack_discovery/pages/use_get_attack_discovery_generations', () => ({
  useGetAttackDiscoveryGenerations: jest.fn(),
}));

jest.mock('./use_poll_generations', () => ({
  usePollGenerations: jest.fn(),
}));

jest.mock('../../../../attack_discovery/pages/results/history/generations', () => ({
  Generations: ({ onViewDetails }: { onViewDetails?: (executionUuid: string) => void }) => (
    <div data-test-subj="mockGenerations">
      <button
        data-test-subj="mockViewDetails"
        onClick={() => onViewDetails?.('uuid-1')}
        type="button"
      />
    </div>
  ),
}));

jest.mock(
  '../../../../attack_discovery/pages/loading_callout/workflow_execution_details_flyout/workflow_execution_details',
  () => ({
    WorkflowExecutionDetails: ({ executionUuid }: { executionUuid?: string }) => (
      <div data-test-subj="mockWorkflowExecutionDetails">{executionUuid}</div>
    ),
  })
);

const mockUseGetAttackDiscoveryGenerations = useGetAttackDiscoveryGenerations as jest.Mock;

const succeededGeneration: AttackDiscoveryGeneration = {
  connector_id: 'gpt41Azure',
  discoveries: 8,
  execution_uuid: 'uuid-1',
  start: '2025-05-19T22:15:10.759Z',
  status: 'succeeded',
};

const dismissedGeneration: AttackDiscoveryGeneration = {
  connector_id: 'gpt41Azure',
  discoveries: 0,
  execution_uuid: 'uuid-2',
  start: '2025-05-19T22:15:10.759Z',
  status: 'dismissed',
};

const defaultProps = {
  aiConnectors: getMockConnectors(),
  localStorageAttackDiscoveryMaxAlerts: '100',
  onClose: jest.fn(),
};

describe('GenerationsControlCenterFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGetAttackDiscoveryGenerations.mockReturnValue({
      cancelRequest: jest.fn(),
      data: { generations: [succeededGeneration] },
      refetch: jest.fn(),
    });
  });

  it('renders the flyout', () => {
    render(
      <TestProviders>
        <GenerationsControlCenterFlyout {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId(GENERATIONS_CONTROL_CENTER_FLYOUT_TEST_ID)).toBeInTheDocument();
  });

  it('renders the generations list in list mode', () => {
    render(
      <TestProviders>
        <GenerationsControlCenterFlyout {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('mockGenerations')).toBeInTheDocument();
  });

  it('renders the empty state when there are no non-dismissed generations', () => {
    mockUseGetAttackDiscoveryGenerations.mockReturnValue({
      cancelRequest: jest.fn(),
      data: { generations: [dismissedGeneration] },
      refetch: jest.fn(),
    });

    render(
      <TestProviders>
        <GenerationsControlCenterFlyout {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId(GENERATIONS_CONTROL_CENTER_EMPTY_STATE_TEST_ID)).toBeInTheDocument();
  });

  it('does NOT render the empty state before the generations request resolves', () => {
    mockUseGetAttackDiscoveryGenerations.mockReturnValue({
      cancelRequest: jest.fn(),
      data: undefined,
      refetch: jest.fn(),
    });

    render(
      <TestProviders>
        <GenerationsControlCenterFlyout {...defaultProps} />
      </TestProviders>
    );

    expect(
      screen.queryByTestId(GENERATIONS_CONTROL_CENTER_EMPTY_STATE_TEST_ID)
    ).not.toBeInTheDocument();
  });

  it('switches to the detail view when "View details" is triggered', async () => {
    render(
      <TestProviders>
        <GenerationsControlCenterFlyout {...defaultProps} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('mockViewDetails'));

    expect(screen.getByTestId('mockWorkflowExecutionDetails')).toBeInTheDocument();
  });

  it('passes the selected executionUuid to the detail view', async () => {
    render(
      <TestProviders>
        <GenerationsControlCenterFlyout {...defaultProps} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('mockViewDetails'));

    expect(screen.getByTestId('mockWorkflowExecutionDetails')).toHaveTextContent('uuid-1');
  });

  it('returns to the list when the back button is clicked', async () => {
    render(
      <TestProviders>
        <GenerationsControlCenterFlyout {...defaultProps} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('mockViewDetails'));
    await userEvent.click(screen.getByTestId(GENERATIONS_CONTROL_CENTER_BACK_BUTTON_TEST_ID));

    expect(screen.getByTestId('mockGenerations')).toBeInTheDocument();
  });

  it('calls onClose when the flyout close button is clicked', async () => {
    const onClose = jest.fn();

    render(
      <TestProviders>
        <GenerationsControlCenterFlyout {...defaultProps} onClose={onClose} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('euiFlyoutCloseButton'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
