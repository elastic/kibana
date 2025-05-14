/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { EuiTableFieldDataColumnType } from '@elastic/eui';
import type { AttackDiscoverySchedule } from '@kbn/elastic-assistant-common';

import { createStatusColumn } from './status';
import { TestProviders } from '../../../../../../common/mock';
import { mockAttackDiscoverySchedule } from '../../../../mock/mock_attack_discovery_schedule';

describe('Status Column', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    const column = createStatusColumn() as EuiTableFieldDataColumnType<AttackDiscoverySchedule>;

    render(<TestProviders>{column.render?.('', mockAttackDiscoverySchedule)}</TestProviders>);
  });

  it('should render schedule execution status', () => {
    expect(screen.getByTestId('scheduleExecutionStatus')).toBeInTheDocument();
  });
});
