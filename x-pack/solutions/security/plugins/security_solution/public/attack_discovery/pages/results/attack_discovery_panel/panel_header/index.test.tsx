/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';

import { PanelHeader } from '.';
import { TestProviders } from '../../../../../common/mock/test_providers';
import { getMockAttackDiscoveryAlerts } from '../../../mock/mock_attack_discovery_alerts';

const mockSetIsOpen = vi.fn();
const mockSetSelectedAttackDiscoveries = vi.fn();
const mockSetIsSelected = vi.fn();
const mockOnToggle = vi.fn();

const mockAttackDiscovery = getMockAttackDiscoveryAlerts()[0];

const defaultProps = {
  attackDiscovery: mockAttackDiscovery,
  isOpen: 'open' as const,
  isSelected: false,
  setIsSelected: mockSetIsSelected,
  onToggle: mockOnToggle,
  replacements: mockAttackDiscovery.replacements,
  setIsOpen: mockSetIsOpen,
  setSelectedAttackDiscoveries: mockSetSelectedAttackDiscoveries,
  showAnonymized: false,
};

describe('PanelHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the PrimaryInteractions', () => {
    render(
      <TestProviders>
        <PanelHeader {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('primaryInteractions')).toBeInTheDocument();
  });

  it('renders the SummaryActions', () => {
    render(
      <TestProviders>
        <PanelHeader {...defaultProps} />
      </TestProviders>
    );
    expect(screen.getByTestId('summaryActions')).toBeInTheDocument();
  });
});
