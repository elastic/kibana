/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import type { Status } from '../../../../../common/api/detection_engine';
import { useGroupTakeActionsItems } from '../../../hooks/alerts_table/use_group_take_action_items';
import { useUserData } from '../../user_info';
import { AlertActionItems } from './alerts_action_items';

jest.mock('../../../hooks/alerts_table/use_group_take_action_items');
jest.mock('../../user_info');

describe('AlertActionItems', () => {
  const baseProps: Parameters<typeof AlertActionItems>[0] = {
    statusFilter: [],
    tableId: 'test-table',
    groupNumber: 1,
    selectedGroup: 'host.name',
    groupBucket: {} as never,
    query: '{"bool":{"filter":[]}}',
    closePopover: jest.fn(),
  };

  const { statusFilter: _statusFilter, ...baseActionItemsProps } = baseProps;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('enables alert status actions when user has write + maintenance privileges, passing statusFilter as currentStatus', () => {
    (useUserData as jest.Mock).mockReturnValue([
      {
        hasIndexWrite: true,
        hasIndexMaintenance: true,
      },
    ]);

    const getActionItems = jest.fn().mockReturnValue(<div data-test-subj="action-items" />);
    (useGroupTakeActionsItems as jest.Mock).mockReturnValue(getActionItems);

    const statusFilter: Status[] = ['open'];
    render(<AlertActionItems {...baseProps} statusFilter={statusFilter} />);

    expect(useGroupTakeActionsItems).toHaveBeenCalledWith({
      currentStatus: statusFilter,
      showAlertStatusActions: true,
    });
    expect(getActionItems).toHaveBeenCalledWith(
      expect.objectContaining({
        ...baseActionItemsProps,
      })
    );
    expect((getActionItems as jest.Mock).mock.calls[0][0]).not.toHaveProperty('statusFilter');
    expect(screen.getByTestId('action-items')).toBeInTheDocument();
  });

  it('disables alert status actions when user lacks write privilege', () => {
    (useUserData as jest.Mock).mockReturnValue([
      {
        hasIndexWrite: false,
        hasIndexMaintenance: true,
      },
    ]);

    const getActionItems = jest.fn().mockReturnValue(<div data-test-subj="action-items" />);
    (useGroupTakeActionsItems as jest.Mock).mockReturnValue(getActionItems);

    render(<AlertActionItems {...baseProps} />);

    expect(useGroupTakeActionsItems).toHaveBeenCalledWith({
      currentStatus: baseProps.statusFilter,
      showAlertStatusActions: false,
    });
    expect(getActionItems).toHaveBeenCalledWith(expect.objectContaining(baseActionItemsProps));
  });

  it('disables alert status actions when maintenance privilege is null', () => {
    (useUserData as jest.Mock).mockReturnValue([
      {
        hasIndexWrite: true,
        hasIndexMaintenance: null,
      },
    ]);

    const getActionItems = jest.fn().mockReturnValue(<div data-test-subj="action-items" />);
    (useGroupTakeActionsItems as jest.Mock).mockReturnValue(getActionItems);

    render(<AlertActionItems {...baseProps} />);

    expect(useGroupTakeActionsItems).toHaveBeenCalledWith({
      currentStatus: baseProps.statusFilter,
      showAlertStatusActions: false,
    });
    expect(getActionItems).toHaveBeenCalledWith(expect.objectContaining(baseActionItemsProps));
  });
});
