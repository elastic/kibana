/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { EuiTableFieldDataColumnType } from '@elastic/eui';
import type { AttackDiscoverySchedule } from '@kbn/elastic-assistant-common';

import { createActionsColumn } from './actions';
import { TestProviders } from '../../../../../../common/mock';
import { mockAttackDiscoverySchedule } from '../../../../mock/mock_attack_discovery_schedule';

const deleteScheduleMock = jest.fn();

describe('Actions Column', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    const column = createActionsColumn({
      isDisabled: false,
      deleteSchedule: deleteScheduleMock,
    }) as EuiTableFieldDataColumnType<AttackDiscoverySchedule>;

    render(<TestProviders>{column.render?.('', mockAttackDiscoverySchedule)}</TestProviders>);
  });

  it('should render delete button', () => {
    expect(screen.getByTestId('deleteButton')).toBeInTheDocument();
  });

  it('should invoke `deleteSchedule` when the delete button is clicked', async () => {
    const deleteButton = screen.getByTestId('deleteButton');
    fireEvent.click(deleteButton);

    expect(deleteScheduleMock).toHaveBeenCalledWith(mockAttackDiscoverySchedule.id);
  });
});
