/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { Tabs } from '.';
import { TestProviders } from '../../../../../common/mock';
import { mockAttackDiscovery } from '../../../mock/mock_attack_discovery';

describe('Tabs', () => {
  beforeEach(() => {
    render(
      <TestProviders>
        <Tabs attackDiscovery={mockAttackDiscovery} />
      </TestProviders>
    );
  });

  it('renders the attack discovery tab', () => {
    const attackDiscoveryTab = screen.getByTestId('attackDiscoveryTab');

    expect(attackDiscoveryTab).toBeInTheDocument();
  });

  it("renders the alerts tab when it's selected", () => {
    const alertsTabButton = screen.getByText('Alerts');

    fireEvent.click(alertsTabButton);
    const alertsTab = screen.getByTestId('alertsTab');

    expect(alertsTab).toBeInTheDocument();
  });
});
