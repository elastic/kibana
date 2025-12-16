/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';

import { StatusPopoverButton } from './status_popover_button';
import { TestProviders } from '../../../common/mock';
import type { EnrichedFieldInfoWithValues } from '../../document_details/right/utils/enriched_field_info';
import { FILTER_OPEN } from '@kbn/securitysolution-data-table';
import userEvent from '@testing-library/user-event';

jest.mock('../context', () => ({
  useAttackDetailsContext: () => ({
    attackId: 'attack-id',
  }),
}));

jest.mock('../hooks/use_header_data', () => ({
  useHeaderData: () => ({
    alertIds: ['alert-1', 'alert-2'],
    replacements: {},
  }),
}));

jest.mock('../../../common/hooks/use_space_id', () => ({
  useSpaceId: () => 'default',
}));

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: () => ({
    closeFlyout: jest.fn(),
  }),
}));

jest.mock('../../../attack_discovery/pages/use_attack_discovery_bulk', () => ({
  useAttackDiscoveryBulk: () => ({
    mutateAsync: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('../../../attack_discovery/pages/results/take_action/use_update_alerts_status', () => ({
  useUpdateAlertsStatus: () => ({
    mutateAsync: jest.fn().mockResolvedValue(undefined),
  }),
}));

const enrichedFieldInfo: EnrichedFieldInfoWithValues = {
  values: [FILTER_OPEN],
  linkValue: undefined,
  data: {
    field: 'kibana.alert.workflow_status',
    type: 'keyword',
  },
} as EnrichedFieldInfoWithValues;

describe('StatusPopoverButton (attack details)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it renders the current status', () => {
    const { getByText } = render(
      <TestProviders>
        <StatusPopoverButton enrichedFieldInfo={enrichedFieldInfo} />
      </TestProviders>
    );

    getByText('open');
  });

  test('it shows the correct options when clicked', async () => {
    const { getByText, container } = render(
      <TestProviders>
        <StatusPopoverButton enrichedFieldInfo={enrichedFieldInfo} />
      </TestProviders>
    );

    // Click the status badge/button
    getByText('open').click();
    await waitForEuiPopoverOpen();

    // Popover arrow should be visible
    expect(container.querySelector('.euiBadge__icon')).not.toBeNull();

    // Available actions (OPEN is current, so excluded)
    getByText('Mark as acknowledged');
    getByText('Mark as closed');
  });

  test('it opens the confirmation modal after selecting a new status', async () => {
    const user = userEvent.setup();

    render(
      <TestProviders>
        <StatusPopoverButton enrichedFieldInfo={enrichedFieldInfo} />
      </TestProviders>
    );

    // Click the status badge/button
    const statusButton = screen.getByText('open');
    await user.click(statusButton);

    // Wait for popover to open
    await waitForEuiPopoverOpen();

    // Click one of the status options
    const acknowledgeButton = screen.getByText('Mark as acknowledged');
    await user.click(acknowledgeButton);

    // Check that modal appeared
    const modal = await screen.findByTestId('confirmModal');
    expect(modal).toBeInTheDocument();

    // Modal has two buttons: markDiscoveriesOnly and markAlertsAndDiscoveries
    expect(screen.getByTestId('markDiscoveriesOnly')).toBeInTheDocument();
    expect(screen.getByTestId('markAlertsAndDiscoveries')).toBeInTheDocument();

    // Click confirm button to simulate user confirming
    await user.click(screen.getByTestId('markAlertsAndDiscoveries'));

    // Optionally: check modal is closed after confirmation
    expect(screen.queryByTestId('confirmModal')).not.toBeInTheDocument();
  });
});
