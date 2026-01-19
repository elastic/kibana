/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { Tabs } from '.';
import { TestProviders } from '../../../../../common/mock/test_providers';
import { mockAttackDiscovery } from '../../../mock/mock_attack_discovery';

describe('Tabs', () => {
  const defaultProps = {
    attackDiscovery: mockAttackDiscovery,
    replacements: undefined,
    showAnonymized: false,
  };

  const renderTabs = (props = {}) =>
    render(
      <TestProviders>
        <Tabs {...defaultProps} {...props} />
      </TestProviders>
    );

  it('renders the attack discovery tab', () => {
    renderTabs();

    expect(screen.getByTestId('attackDiscoveryTab')).toBeInTheDocument();
  });

  it("renders the alerts tab when it's selected", () => {
    renderTabs();
    const alertsTabButton = screen.getByText('Alerts');

    fireEvent.click(alertsTabButton);

    expect(screen.getByTestId('alertsTab')).toBeInTheDocument();
  });

  it('renders with replacements', () => {
    renderTabs({ replacements: { foo: 'bar' } });

    expect(screen.getByTestId('attackDiscoveryTab')).toBeInTheDocument();
  });

  it('renders with showAnonymized true', () => {
    renderTabs({ showAnonymized: true });

    expect(screen.getByTestId('attackDiscoveryTab')).toBeInTheDocument();
  });

  it('resets the selected tab when the attackDiscovery changes', () => {
    const { rerender } = render(
      <TestProviders>
        <Tabs {...defaultProps} />
      </TestProviders>
    );

    fireEvent.click(screen.getByText('Alerts'));
    expect(screen.getByTestId('alertsTab')).toBeInTheDocument();

    rerender(
      <TestProviders>
        <Tabs {...defaultProps} attackDiscovery={{ ...mockAttackDiscovery, id: 'new-id' }} />
      </TestProviders>
    );
    expect(screen.getByTestId('attackDiscoveryTab')).toBeInTheDocument();
  });

  it('renders the correct tab content when switching tabs', () => {
    renderTabs();

    fireEvent.click(screen.getByText('Alerts'));
    expect(screen.getByTestId('alertsTab')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Attack discovery'));
    expect(screen.getByTestId('attackDiscoveryTab')).toBeInTheDocument();
  });
});
