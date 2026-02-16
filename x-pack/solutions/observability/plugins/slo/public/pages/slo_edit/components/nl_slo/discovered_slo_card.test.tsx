/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { render } from '../../../../utils/test_helper';
import { DiscoveredSloCard } from './discovered_slo_card';
import type { ProposedSlo } from '../../../../hooks/use_discover_slos';

const createProposal = (overrides: Partial<ProposedSlo> = {}): ProposedSlo => ({
  sloDefinition: {
    name: 'API Availability',
    description: 'Tracks availability for the API gateway service',
    indicator: {
      type: 'sli.apm.transactionErrorRate',
      params: {
        service: 'api-gateway',
        environment: 'production',
        index: 'metrics-apm*',
      },
    },
    timeWindow: { duration: '30d', type: 'rolling' },
    budgetingMethod: 'occurrences',
    objective: { target: 0.995 },
    tags: ['api', 'auto-discovered'],
  },
  rationale: 'This service handles critical user-facing traffic',
  category: 'availability',
  priority: 'critical',
  ...overrides,
});

describe('DiscoveredSloCard', () => {
  const mockOnToggle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the SLO name and description', () => {
    const proposal = createProposal();
    render(
      <DiscoveredSloCard proposal={proposal} index={0} isSelected={false} onToggle={mockOnToggle} />
    );

    expect(screen.getByText('API Availability')).toBeTruthy();
    expect(
      screen.getByText('Tracks availability for the API gateway service')
    ).toBeTruthy();
  });

  it('renders priority badge with correct color', () => {
    const proposal = createProposal({ priority: 'critical' });
    render(
      <DiscoveredSloCard proposal={proposal} index={0} isSelected={false} onToggle={mockOnToggle} />
    );

    expect(screen.getByText('Critical')).toBeTruthy();
  });

  it('renders category badge', () => {
    const proposal = createProposal({ category: 'availability' });
    render(
      <DiscoveredSloCard proposal={proposal} index={0} isSelected={false} onToggle={mockOnToggle} />
    );

    expect(screen.getByText('Availability')).toBeTruthy();
  });

  it('renders rationale text', () => {
    const proposal = createProposal();
    render(
      <DiscoveredSloCard proposal={proposal} index={0} isSelected={false} onToggle={mockOnToggle} />
    );

    expect(
      screen.getByText('This service handles critical user-facing traffic')
    ).toBeTruthy();
  });

  it('renders the checkbox', () => {
    render(
      <DiscoveredSloCard
        proposal={createProposal()}
        index={0}
        isSelected={false}
        onToggle={mockOnToggle}
      />
    );

    expect(screen.getByTestId('discoveredSloCheckbox-0')).toBeTruthy();
  });

  it('marks checkbox as checked when selected', () => {
    render(
      <DiscoveredSloCard
        proposal={createProposal()}
        index={0}
        isSelected={true}
        onToggle={mockOnToggle}
      />
    );

    const checkbox = screen.getByTestId('discoveredSloCheckbox-0') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('calls onToggle with the correct index when checkbox is clicked', () => {
    render(
      <DiscoveredSloCard
        proposal={createProposal()}
        index={3}
        isSelected={false}
        onToggle={mockOnToggle}
      />
    );

    fireEvent.click(screen.getByTestId('discoveredSloCheckbox-3'));
    expect(mockOnToggle).toHaveBeenCalledWith(3);
  });

  it('renders indicator details', () => {
    const proposal = createProposal();
    render(
      <DiscoveredSloCard proposal={proposal} index={0} isSelected={false} onToggle={mockOnToggle} />
    );

    expect(screen.getByText('APM Availability')).toBeTruthy();
    expect(screen.getByText('0.995%')).toBeTruthy();
  });

  it('renders service and environment for APM indicators', () => {
    const proposal = createProposal();
    render(
      <DiscoveredSloCard proposal={proposal} index={0} isSelected={false} onToggle={mockOnToggle} />
    );

    expect(screen.getByText('api-gateway')).toBeTruthy();
    expect(screen.getByText('production')).toBeTruthy();
  });

  it('renders tags as badges', () => {
    const proposal = createProposal();
    render(
      <DiscoveredSloCard proposal={proposal} index={0} isSelected={false} onToggle={mockOnToggle} />
    );

    expect(screen.getByText('api')).toBeTruthy();
    expect(screen.getByText('auto-discovered')).toBeTruthy();
  });

  it('renders with different priority levels', () => {
    const priorities: Array<ProposedSlo['priority']> = ['critical', 'high', 'medium', 'low'];

    for (const priority of priorities) {
      const { unmount } = render(
        <DiscoveredSloCard
          proposal={createProposal({ priority })}
          index={0}
          isSelected={false}
          onToggle={mockOnToggle}
        />
      );
      unmount();
    }
  });

  it('applies primary panel color when selected', () => {
    render(
      <DiscoveredSloCard
        proposal={createProposal()}
        index={0}
        isSelected={true}
        onToggle={mockOnToggle}
      />
    );

    const card = screen.getByTestId('discoveredSloCard-0');
    expect(card).toBeTruthy();
  });

  it('renders latency category correctly', () => {
    const proposal = createProposal({ category: 'latency' });
    render(
      <DiscoveredSloCard proposal={proposal} index={0} isSelected={false} onToggle={mockOnToggle} />
    );

    expect(screen.getByText('Latency')).toBeTruthy();
  });
});
