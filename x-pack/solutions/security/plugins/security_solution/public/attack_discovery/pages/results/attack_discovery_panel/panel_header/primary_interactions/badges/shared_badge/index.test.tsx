/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SharedBadge } from '.';
import { TestProviders } from '../../../../../../../../common/mock';

// Local mock for AttackDiscoveryAlert (all required fields for type safety)
const mockAttackDiscoveryAlert: AttackDiscoveryAlert = {
  id: 'alert-id-1',
  users: [{ id: 'user1' }, { id: 'user2' }],
  alertIds: [],
  connectorId: 'connector-id',
  connectorName: 'Connector',
  detailsMarkdown: '',
  generationUuid: 'gen-uuid',
  summaryMarkdown: '',
  timestamp: '',
  title: '',
};

const mockAttackDiscoveryAlertSingleUser: AttackDiscoveryAlert = {
  id: 'alert-id-2',
  users: [{ id: 'user1' }],
  alertIds: [],
  connectorId: 'connector-id',
  connectorName: 'Connector',
  detailsMarkdown: '',
  generationUuid: 'gen-uuid',
  summaryMarkdown: '',
  timestamp: '',
  title: '',
};

// Use a minimal object for a non-alert, typed as AttackDiscovery (all required fields)
const mockAttackDiscoveryNotAlert = {
  id: 'not-alert-id',
  alertIds: [],
  connectorId: 'connector-id',
  connectorName: 'Connector',
  detailsMarkdown: '',
  generationUuid: 'gen-uuid',
  summaryMarkdown: '',
  timestamp: '',
  title: '',
};

const mockMutateAsync = jest.fn();
const mockIsAttackDiscoveryAlert = jest.fn();

jest.mock('../../../../../../use_attack_discovery_bulk', () => ({
  useAttackDiscoveryBulk: () => ({ mutateAsync: mockMutateAsync }),
}));

jest.mock('../../../../../../use_kibana_feature_flags', () => ({
  useKibanaFeatureFlags: () => ({ attackDiscoveryAlertsEnabled: true }),
}));

jest.mock('../../../../../../utils/is_attack_discovery_alert', () => ({
  isAttackDiscoveryAlert: (...args: unknown[]) => mockIsAttackDiscoveryAlert(...args),
}));

describe('SharedBadge', () => {
  const defaultProps = { attackDiscovery: mockAttackDiscoveryAlert };

  beforeEach(() => {
    jest.clearAllMocks();
    mockMutateAsync.mockClear();
    mockIsAttackDiscoveryAlert.mockImplementation(
      (obj) => obj === mockAttackDiscoveryAlert || obj === mockAttackDiscoveryAlertSingleUser
    );
  });

  it('opens the popover when the badge is clicked', async () => {
    render(
      <TestProviders>
        <SharedBadge {...defaultProps} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('sharedBadgeButton'));

    expect(screen.getByTestId('sharedBadge')).toBeInTheDocument();
  });

  it('disables the shared option when shared', async () => {
    render(
      <TestProviders>
        <SharedBadge {...defaultProps} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('sharedBadgeButton'));

    expect(screen.getByTestId('shared')).toHaveAttribute('aria-disabled', 'true');
  });

  it('disables the notShared option when shared', async () => {
    render(
      <TestProviders>
        <SharedBadge {...defaultProps} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('sharedBadgeButton'));

    expect(screen.getByTestId('notShared')).toHaveAttribute('aria-disabled', 'true');
  });

  it('calls mutateAsync when changing visibility', async () => {
    mockIsAttackDiscoveryAlert.mockReturnValue(true);

    render(
      <TestProviders>
        <SharedBadge attackDiscovery={mockAttackDiscoveryAlertSingleUser} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('sharedBadgeButton'));
    await userEvent.click(screen.getByTestId('shared'));

    expect(mockMutateAsync).toHaveBeenCalled();
  });

  it('renders not shared when only one user', () => {
    render(
      <TestProviders>
        <SharedBadge attackDiscovery={mockAttackDiscoveryAlertSingleUser} />
      </TestProviders>
    );

    expect(screen.getByTestId('sharedBadgeButton')).toHaveTextContent('Not shared');
  });

  it('renders not shared when not an alert', () => {
    mockIsAttackDiscoveryAlert.mockReturnValue(false);

    render(
      <TestProviders>
        <SharedBadge attackDiscovery={mockAttackDiscoveryNotAlert} />
      </TestProviders>
    );

    expect(screen.getByTestId('sharedBadgeButton')).toHaveTextContent('Not shared');
  });

  it('renders shared and disables shared option after changing to shared', async () => {
    mockIsAttackDiscoveryAlert.mockReturnValue(true);

    render(
      <TestProviders>
        <SharedBadge attackDiscovery={mockAttackDiscoveryAlertSingleUser} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('sharedBadgeButton'));
    // Click the enabled shared option
    await userEvent.click(screen.getByTestId('shared'));
    // Re-open the popover to check the disabled state
    await userEvent.click(screen.getByTestId('sharedBadgeButton'));
    // Assert the shared option is disabled
    const sharedOption = await screen.findByTestId('shared');

    expect(sharedOption).toHaveAttribute('aria-disabled', 'true');
  });

  it('renders shared and disables notShared option after changing to shared', async () => {
    mockIsAttackDiscoveryAlert.mockReturnValue(true);

    render(
      <TestProviders>
        <SharedBadge attackDiscovery={mockAttackDiscoveryAlertSingleUser} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('sharedBadgeButton'));
    // Click the enabled shared option
    await userEvent.click(screen.getByTestId('shared'));
    // Re-open the popover to check the disabled state
    await userEvent.click(screen.getByTestId('sharedBadgeButton'));
    // Assert the notShared option is disabled
    const notSharedOption = await screen.findByTestId('notShared');
    expect(notSharedOption).toHaveAttribute('aria-disabled', 'true');
  });

  it('renders the tooltip when the popover is open and isShared is true', async () => {
    mockIsAttackDiscoveryAlert.mockReturnValue(true);

    render(
      <TestProviders>
        <SharedBadge attackDiscovery={mockAttackDiscoveryAlert} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('sharedBadgeButton'));
    await userEvent.hover(screen.getByTestId('sharedBadgeButton'));
    const tooltip = await screen.findByText((content, element) =>
      content.includes('The visibility of shared')
    );
    expect(tooltip).toBeInTheDocument();
  });

  it('returns the first label when no items are checked', () => {
    mockIsAttackDiscoveryAlert.mockReturnValue(false);

    render(
      <TestProviders>
        <SharedBadge attackDiscovery={mockAttackDiscoveryNotAlert} />
      </TestProviders>
    );
    expect(screen.getByTestId('sharedBadgeButton')).toHaveTextContent('Not shared');
  });

  it('closes the popover when closePopover is called (by toggling badge button)', async () => {
    render(
      <TestProviders>
        <SharedBadge {...defaultProps} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('sharedBadgeButton'));
    // The popover should be open
    expect(screen.getByTestId('sharedBadge')).toBeInTheDocument();
    // Click the badge button again to close the popover
    await userEvent.click(screen.getByTestId('sharedBadgeButton'));
    // Wait for the popover to close
    await waitFor(() => {
      expect(screen.queryByTestId('sharedBadge')).not.toBeInTheDocument();
    });
  });
});
