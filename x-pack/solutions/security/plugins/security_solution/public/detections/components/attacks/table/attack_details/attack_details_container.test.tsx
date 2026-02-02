/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import {
  ALERTS_TAB,
  ATTACK_SUMMARY_TAB,
  AttackDetailsContainer,
  TABS_TEST_ID,
} from './attack_details_container';
import { TestProviders } from '../../../../../common/mock/test_providers';
import { getMockAttackDiscoveryAlerts } from '../../../../../attack_discovery/pages/mock/mock_attack_discovery_alerts';
import { useLocalStorage } from '../../../../../common/components/local_storage';
import { getSettingKey } from '../../../../../common/components/local_storage/helpers';
import {
  ATTACK_GROUP_DETAILS_CATEGORY,
  ATTACKS_PAGE,
  SELECTED_TAB_SETTING_NAME,
} from '../../constants';
import { SummaryTab } from './summary_tab';

// Mock heavy child components to speed up tests
jest.mock('./alerts_tab', () => ({
  AlertsTab: jest.fn(() => <div data-test-subj="testAlertsTab">{'AlertsTab'}</div>),
}));

jest.mock('./summary_tab', () => ({
  SummaryTab: jest.fn(() => <div data-test-subj="testAttackSummaryTab">{'SummaryTab'}</div>),
}));

jest.mock('../../../../../common/components/local_storage', () => ({
  useLocalStorage: jest.fn(),
}));

describe('AttackDetailsContainer', () => {
  const mockAttack = getMockAttackDiscoveryAlerts()[0];
  const defaultProps = {
    attack: mockAttack,
    showAnonymized: false,
    groupingFilters: [],
    defaultFilters: [],
    isTableLoading: false,
    filteredAlertsCount: 5,
  };
  const mockSetSelectedTabId = jest.fn();

  const renderContainer = (props = {}) =>
    render(
      <TestProviders>
        <AttackDetailsContainer {...defaultProps} {...props} />
      </TestProviders>
    );

  beforeEach(() => {
    jest.clearAllMocks();
    (useLocalStorage as jest.Mock).mockReturnValue([ATTACK_SUMMARY_TAB, mockSetSelectedTabId]);
  });

  describe('tab rendering', () => {
    it('renders tabs with correct names and badge when attack is provided', () => {
      renderContainer();

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(2);
      expect(tabs[0]).toHaveTextContent('Attack summary');
      expect(tabs[1]).toHaveTextContent('Alerts');
      expect(tabs[1]).toHaveTextContent(`5/${mockAttack.alertIds.length}`);
    });

    it('renders the attack summary tab by default with correct props', () => {
      renderContainer({ showAnonymized: true });

      expect(screen.getByTestId(TABS_TEST_ID)).toBeInTheDocument();
      expect(screen.getByTestId('testAttackSummaryTab')).toBeInTheDocument();
      expect(SummaryTab).toHaveBeenCalledWith(
        expect.objectContaining({
          attack: mockAttack,
          showAnonymized: true,
        }),
        {}
      );
    });
  });

  describe('local storage', () => {
    it('initializes useLocalStorage with correct key and default value', () => {
      renderContainer();

      const expectedKey = getSettingKey({
        page: ATTACKS_PAGE,
        category: ATTACK_GROUP_DETAILS_CATEGORY,
        setting: SELECTED_TAB_SETTING_NAME,
      });

      expect(useLocalStorage).toHaveBeenCalledWith({
        defaultValue: ATTACK_SUMMARY_TAB,
        key: expectedKey,
      });
    });

    it('renders the content based on stored value', () => {
      (useLocalStorage as jest.Mock).mockReturnValue([ALERTS_TAB, mockSetSelectedTabId]);
      renderContainer();

      expect(screen.getByTestId('testAlertsTab')).toBeInTheDocument();
      expect(screen.queryByTestId('testAttackSummaryTab')).not.toBeInTheDocument();
    });

    it('updates stored value to alerts tab when tab is clicked', () => {
      (useLocalStorage as jest.Mock).mockReturnValue([ATTACK_SUMMARY_TAB, mockSetSelectedTabId]);
      renderContainer();

      fireEvent.click(screen.getByText('Alerts'));

      expect(mockSetSelectedTabId).toHaveBeenCalledWith(ALERTS_TAB);
    });

    it('updates stored value to summary tab when tab is clicked', () => {
      (useLocalStorage as jest.Mock).mockReturnValue([ALERTS_TAB, mockSetSelectedTabId]);
      renderContainer();

      fireEvent.click(screen.getByText('Attack summary'));

      expect(mockSetSelectedTabId).toHaveBeenCalledWith(ATTACK_SUMMARY_TAB);
    });
  });
});
