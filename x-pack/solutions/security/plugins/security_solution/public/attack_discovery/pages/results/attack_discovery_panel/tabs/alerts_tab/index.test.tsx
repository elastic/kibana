/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../../../../common/mock';
import { mockAttackDiscovery } from '../../../../mock/mock_attack_discovery';
import { AlertsTab } from '.';

describe('AlertsTab', () => {
  it('renders the alerts tab', () => {
    render(
      <TestProviders>
        <AlertsTab attackDiscovery={mockAttackDiscovery} />
      </TestProviders>
    );

    const alertsTab = screen.getByTestId('alertsTab');

    expect(alertsTab).toBeInTheDocument();
  });
});
