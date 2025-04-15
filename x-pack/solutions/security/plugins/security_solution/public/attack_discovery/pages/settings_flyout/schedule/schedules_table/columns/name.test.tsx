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

import { createNameColumn } from './name';
import { TestProviders } from '../../../../../../common/mock';
import { mockAttackDiscoverySchedule } from '../../../../mock/mock_attack_discovery_schedule';

const openScheduleDetailsMock = jest.fn();

describe('Name Column', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    const column = createNameColumn({
      openScheduleDetails: openScheduleDetailsMock,
    }) as EuiTableFieldDataColumnType<AttackDiscoverySchedule>;

    render(<TestProviders>{column.render?.('', mockAttackDiscoverySchedule)}</TestProviders>);
  });

  it('should render schedule details link', () => {
    expect(screen.getByTestId('scheduleName')).toBeInTheDocument();
  });

  it('should invoke `openScheduleDetails` when the name link is clicked', async () => {
    const detailsLink = screen.getByTestId('scheduleName');
    fireEvent.click(detailsLink);

    expect(openScheduleDetailsMock).toHaveBeenCalledWith(mockAttackDiscoverySchedule.id);
  });
});
