/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../../common/mock/test_providers';
import { mockAttackDiscovery } from '../../mock/mock_attack_discovery';
import { TakeAction } from '.';

// Mocks for hooks and dependencies
jest.mock('../../use_kibana_feature_flags', () => ({
  useKibanaFeatureFlags: () => ({ attackDiscoveryAlertsEnabled: true }),
}));
jest.mock('../../use_attack_discovery_bulk', () => ({
  useAttackDiscoveryBulk: () => ({ mutateAsync: jest.fn().mockResolvedValue({}) }),
}));
jest.mock('./use_update_alerts_status', () => ({
  useUpdateAlertsStatus: () => ({ mutateAsync: jest.fn().mockResolvedValue({}) }),
}));
jest.mock('./use_add_to_case', () => ({
  useAddToNewCase: () => ({ disabled: false, onAddToNewCase: jest.fn() }),
}));
jest.mock('./use_add_to_existing_case', () => ({
  useAddToExistingCase: () => ({ onAddToExistingCase: jest.fn() }),
}));
jest.mock('../attack_discovery_panel/view_in_ai_assistant/use_view_in_ai_assistant', () => ({
  useViewInAiAssistant: () => ({ showAssistantOverlay: jest.fn(), disabled: false }),
}));
jest.mock('../../utils/is_attack_discovery_alert', () => ({
  isAttackDiscoveryAlert: (ad: { alertWorkflowStatus?: string }) =>
    ad && ad.alertWorkflowStatus !== undefined,
}));

const defaultProps = {
  attackDiscoveries: [mockAttackDiscovery],
  setSelectedAttackDiscoveries: jest.fn(),
};

describe('TakeAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Add to new case action', () => {
    render(
      <TestProviders>
        <TakeAction {...defaultProps} />
      </TestProviders>
    );
    fireEvent.click(screen.getAllByTestId('takeActionPopoverButton')[0]);
    expect(screen.getByTestId('addToCase')).toBeInTheDocument();
  });

  it('renders the Add to existing case action', () => {
    render(
      <TestProviders>
        <TakeAction {...defaultProps} />
      </TestProviders>
    );
    fireEvent.click(screen.getAllByTestId('takeActionPopoverButton')[0]);
    expect(screen.getByTestId('addToExistingCase')).toBeInTheDocument();
  });

  it('renders the View in AI Assistant action', () => {
    render(
      <TestProviders>
        <TakeAction {...defaultProps} />
      </TestProviders>
    );
    fireEvent.click(screen.getAllByTestId('takeActionPopoverButton')[0]);
    expect(screen.getByTestId('viewInAiAssistant')).toBeInTheDocument();
  });

  it('does not render View in AI Assistant when multiple discoveries', () => {
    render(
      <TestProviders>
        <TakeAction
          {...defaultProps}
          attackDiscoveries={[mockAttackDiscovery, mockAttackDiscovery]}
        />
      </TestProviders>
    );
    fireEvent.click(screen.getAllByTestId('takeActionPopoverButton')[0]);
    expect(screen.queryByTestId('viewInAiAssistant')).toBeNull();
  });

  it('renders mark as open/acknowledged/closed actions when alertWorkflowStatus is set', () => {
    const alert = { ...mockAttackDiscovery, alertWorkflowStatus: 'acknowledged' };
    render(
      <TestProviders>
        <TakeAction {...defaultProps} attackDiscoveries={[alert]} />
      </TestProviders>
    );
    fireEvent.click(screen.getAllByTestId('takeActionPopoverButton')[0]);
    expect(screen.getByTestId('markAsOpen')).toBeInTheDocument();
    expect(screen.getByTestId('markAsClosed')).toBeInTheDocument();
  });

  it('shows UpdateAlertsModal when mark as closed is clicked', async () => {
    const alert = { ...mockAttackDiscovery, alertWorkflowStatus: 'open', id: 'id1' };
    render(
      <TestProviders>
        <TakeAction {...defaultProps} attackDiscoveries={[alert]} />
      </TestProviders>
    );
    fireEvent.click(screen.getAllByTestId('takeActionPopoverButton')[0]);
    fireEvent.click(screen.getByTestId('markAsClosed'));
    expect(await screen.findByTestId('confirmModal')).toBeInTheDocument();
  });

  it('calls setSelectedAttackDiscoveries and closes modal on confirm', async () => {
    const alert = { ...mockAttackDiscovery, alertWorkflowStatus: 'open', id: 'id1' };
    const setSelectedAttackDiscoveries = jest.fn();
    render(
      <TestProviders>
        <TakeAction
          {...defaultProps}
          attackDiscoveries={[alert]}
          setSelectedAttackDiscoveries={setSelectedAttackDiscoveries}
        />
      </TestProviders>
    );
    fireEvent.click(screen.getAllByTestId('takeActionPopoverButton')[0]);
    fireEvent.click(screen.getByTestId('markAsClosed'));
    expect(await screen.findByTestId('confirmModal')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('markDiscoveriesOnly'));
    // Wait for setSelectedAttackDiscoveries to be called
    await screen.findByTestId('takeActionPopoverButton');
    expect(setSelectedAttackDiscoveries).toHaveBeenCalledWith({});
  });

  it('closes modal on cancel', async () => {
    const alert = { ...mockAttackDiscovery, alertWorkflowStatus: 'open', id: 'id1' };
    render(
      <TestProviders>
        <TakeAction {...defaultProps} attackDiscoveries={[alert]} />
      </TestProviders>
    );
    fireEvent.click(screen.getAllByTestId('takeActionPopoverButton')[0]);
    fireEvent.click(screen.getByTestId('markAsClosed'));
    expect(await screen.findByTestId('confirmModal')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cancel'));
    // Wait for modal to close
    await screen.findByTestId('takeActionPopoverButton');
    expect(screen.queryByTestId('confirmModal')).toBeNull();
  });
});
