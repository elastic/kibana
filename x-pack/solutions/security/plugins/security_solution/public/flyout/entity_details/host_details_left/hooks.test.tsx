/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useSelectedTab, useTabs } from './hooks';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { TestProviders } from '@kbn/timelines-plugin/public/mock';
import type { HostDetailsPanelProps } from '.';
import type { LeftPanelTabsType } from '../shared/components/left_panel/left_panel_header';
import { EntityDetailsLeftPanelTab } from '../shared/components/left_panel/left_panel_header';

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: jest.fn(() => ({
    openLeftPanel: jest.fn(),
  })),
}));

const defaultParams: HostDetailsPanelProps = {
  isRiskScoreExist: true,
  name: 'testHost',
  scopeId: 'test',
};

const defaultTabs: LeftPanelTabsType = [
  {
    id: EntityDetailsLeftPanelTab.CSP_INSIGHTS,
    'data-test-subj': 'cspInsightsTab',
    name: <span>{'cspInsightsTab name'}</span>,
    content: <span>{'cspInsightsTab content'}</span>,
  },
  {
    id: EntityDetailsLeftPanelTab.RISK_INPUTS,
    'data-test-subj': 'riskTab',
    name: <span>{'riskTab name'}</span>,
    content: <span>{'riskTab content'}</span>,
  },
];

describe('hooks', () => {
  describe('useSelectedTab', () => {
    const mockOpenLeftPanel = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
      (useExpandableFlyoutApi as jest.Mock).mockReturnValue({ openLeftPanel: mockOpenLeftPanel });
    });

    it('should return the default tab when no path is provided', () => {
      const { result } = renderHook(
        () => useSelectedTab({ path: undefined, ...defaultParams }, defaultTabs),
        {
          wrapper: TestProviders,
        }
      );

      expect(result.current.selectedTabId).toBe(EntityDetailsLeftPanelTab.CSP_INSIGHTS);
    });

    it('should return the tab matching the path', () => {
      const { result } = renderHook(
        () =>
          useSelectedTab(
            { path: { tab: EntityDetailsLeftPanelTab.RISK_INPUTS }, ...defaultParams },
            defaultTabs
          ),
        {
          wrapper: TestProviders,
        }
      );

      expect(result.current.selectedTabId).toBe(EntityDetailsLeftPanelTab.RISK_INPUTS);
    });

    it('should call openLeftPanel with the correct parameters when setSelectedTabId is called', () => {
      const { result } = renderHook(
        () => useSelectedTab({ path: undefined, ...defaultParams }, defaultTabs),
        {
          wrapper: TestProviders,
        }
      );

      act(() => {
        result.current.setSelectedTabId(EntityDetailsLeftPanelTab.RISK_INPUTS);
      });

      expect(mockOpenLeftPanel).toHaveBeenCalledWith({
        id: expect.any(String),
        params: { ...defaultParams, path: { tab: EntityDetailsLeftPanelTab.RISK_INPUTS } },
      });
    });
  });

  describe('useTabs', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should include the risk score tab when isRiskScoreExist and name are true', () => {
      const { result } = renderHook(() => useTabs(defaultParams), { wrapper: TestProviders });

      expect(result.current).toEqual([
        expect.objectContaining({ id: EntityDetailsLeftPanelTab.RISK_INPUTS }),
      ]);
    });

    it('should include the insights tab when any findings or alerts are present', () => {
      const { result } = renderHook(
        () =>
          useTabs({
            ...defaultParams,
            isRiskScoreExist: false,
            hasMisconfigurationFindings: true,
            hasVulnerabilitiesFindings: true,
            hasNonClosedAlerts: true,
          }),
        {
          wrapper: TestProviders,
        }
      );

      expect(result.current).toEqual([
        expect.objectContaining({ id: EntityDetailsLeftPanelTab.CSP_INSIGHTS }),
      ]);
    });

    it('should return an empty array when no tabs are available', () => {
      const { result } = renderHook(
        () =>
          useTabs({
            isRiskScoreExist: false,
            name: '',
            scopeId: 'scope1',
            hasMisconfigurationFindings: false,
            hasVulnerabilitiesFindings: false,
            hasNonClosedAlerts: false,
          }),
        { wrapper: TestProviders }
      );

      expect(result.current).toEqual([]);
    });
  });
});
