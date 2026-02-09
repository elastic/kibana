/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import userEvent from '@testing-library/user-event';

import { StatusPopoverButton } from './status_popover_button';
import { TestProviders } from '../../../common/mock';
import type { EnrichedFieldInfoWithValues } from '../../document_details/right/utils/enriched_field_info';
import { FILTER_OPEN } from '@kbn/securitysolution-data-table';

import { useAttackWorkflowStatusContextMenuItems } from '../../../detections/hooks/attacks/bulk_actions/context_menu_items/use_attack_workflow_status_context_menu_items';

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

const mockCloseFlyout = jest.fn();

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: () => ({
    closeFlyout: mockCloseFlyout,
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

jest.mock(
  '../../../detections/hooks/attacks/bulk_actions/context_menu_items/use_attack_workflow_status_context_menu_items',
  () => ({
    useAttackWorkflowStatusContextMenuItems: jest.fn(),
  })
);

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

    (useAttackWorkflowStatusContextMenuItems as jest.Mock).mockImplementation(
      ({ onSuccess }: { onSuccess: () => void }) => ({
        items: [
          {
            name: 'Mark as acknowledged',
            onClick: () => onSuccess(),
          },
          {
            name: 'Mark as closed',
            onClick: () => onSuccess(),
          },
        ],
        panels: [],
      })
    );
  });

  test('it renders the current status', () => {
    render(
      <TestProviders>
        <StatusPopoverButton enrichedFieldInfo={enrichedFieldInfo} />
      </TestProviders>
    );

    expect(screen.getByText('open')).toBeInTheDocument();
  });

  test('it shows the correct options when clicked', async () => {
    const user = userEvent.setup();

    render(
      <TestProviders>
        <StatusPopoverButton enrichedFieldInfo={enrichedFieldInfo} />
      </TestProviders>
    );

    await user.click(screen.getByText('open'));
    await waitForEuiPopoverOpen();

    expect(screen.getByText('Change attack status')).toBeInTheDocument();
    expect(screen.getByText('Mark as acknowledged')).toBeInTheDocument();
    expect(screen.getByText('Mark as closed')).toBeInTheDocument();
  });

  test('it closes the flyout on successful status change', async () => {
    const user = userEvent.setup();

    render(
      <TestProviders>
        <StatusPopoverButton enrichedFieldInfo={enrichedFieldInfo} />
      </TestProviders>
    );

    await user.click(screen.getByText('open'));
    await waitForEuiPopoverOpen();

    await user.click(screen.getByText('Mark as acknowledged'));

    expect(mockCloseFlyout).toHaveBeenCalledTimes(1);
  });
});
