/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { AttackDetailsContainer, TABS_TEST_ID } from './attack_details_container';
import { TestProviders } from '../../../../../common/mock/test_providers';
import { getMockAttackDiscoveryAlerts } from '../../../../../attack_discovery/pages/mock/mock_attack_discovery_alerts';
import { AlertsTab } from './alerts_tab';
import { SummaryTab } from './summary_tab';

// Mock heavy child components to speed up tests
jest.mock('./alerts_tab', () => ({
  AlertsTab: jest.fn(() => <div data-test-subj="alertsTab">{'AlertsTab'}</div>),
}));

jest.mock('./summary_tab', () => ({
  SummaryTab: jest.fn(() => <div data-test-subj="attackSummaryTab">{'SummaryTab'}</div>),
}));

describe('AttackDetailsContainer', () => {
  const mockAttack = getMockAttackDiscoveryAlerts()[0];
  const defaultProps = {
    attack: mockAttack,
    showAnonymized: false,
    groupingFilters: [],
    defaultFilters: [],
    isTableLoading: false,
  };

  const renderContainer = (props = {}) =>
    render(
      <TestProviders>
        <AttackDetailsContainer {...defaultProps} {...props} />
      </TestProviders>
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('tab rendering', () => {
    it('renders tabs with correct names and badge when attack is provided', () => {
      renderContainer();

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(2);
      expect(tabs[0]).toHaveTextContent('Attack summary');
      expect(tabs[1]).toHaveTextContent('Alerts');
      expect(tabs[1]).toHaveTextContent(String(mockAttack.alertIds.length));
    });

    it('renders the attack summary tab by default with correct props', () => {
      renderContainer({ showAnonymized: true });

      expect(screen.getByTestId(TABS_TEST_ID)).toBeInTheDocument();
      expect(screen.getByTestId('attackSummaryTab')).toBeInTheDocument();
      expect(SummaryTab).toHaveBeenCalledWith(
        expect.objectContaining({
          attack: mockAttack,
          showAnonymized: true,
        }),
        {}
      );
    });
  });

  describe('tab switching', () => {
    it("renders the alerts tab when it's selected", () => {
      renderContainer();
      const alertsTabButton = screen.getByText('Alerts');

      fireEvent.click(alertsTabButton);

      expect(screen.getByTestId('alertsTab')).toBeInTheDocument();
      expect(AlertsTab).toHaveBeenCalledWith(
        expect.objectContaining({
          groupingFilters: [],
          defaultFilters: [],
          isTableLoading: false,
        }),
        {}
      );
    });

    it('renders the correct tab content when switching tabs', () => {
      renderContainer();

      fireEvent.click(screen.getByText('Alerts'));
      expect(screen.getByTestId('alertsTab')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Attack summary'));
      expect(screen.getByTestId('attackSummaryTab')).toBeInTheDocument();
    });
  });

  describe('tab reset on attack change', () => {
    it('resets the selected tab when the attack changes', () => {
      const { rerender } = render(
        <TestProviders>
          <AttackDetailsContainer {...defaultProps} />
        </TestProviders>
      );

      fireEvent.click(screen.getByText('Alerts'));
      expect(screen.getByTestId('alertsTab')).toBeInTheDocument();

      const newAttack = { ...mockAttack, id: 'new-id' };
      rerender(
        <TestProviders>
          <AttackDetailsContainer {...defaultProps} attack={newAttack} />
        </TestProviders>
      );
      // Should be back to summary tab
      expect(screen.getByTestId('attackSummaryTab')).toBeInTheDocument();
    });
  });
});
