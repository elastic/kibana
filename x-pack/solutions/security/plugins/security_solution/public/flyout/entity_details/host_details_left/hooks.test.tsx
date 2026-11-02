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
import { TestProviders } from '../../../common/mock';
import {
  getRiskInputTab,
  getInsightsInputTab,
  getResolutionGroupTab,
} from '../../../entity_analytics/components/entity_details_flyout';
import { getGraphViewTab } from '../shared/components/left';
import { useHasEntityResolutionLicense } from '../../../common/hooks/use_has_entity_resolution_license';
import { EntityType } from '../../../../common/entity_analytics/types';
import type { HostDetailsPanelProps } from '.';
import type { LeftPanelTabsType } from '../shared/components/left_panel/left_panel_header';
import { EntityDetailsLeftPanelTab } from '../shared/components/left_panel/left_panel_header';

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: jest.fn(() => ({
    openLeftPanel: jest.fn(),
  })),
}));

jest.mock('../../../common/hooks/use_has_entity_resolution_license', () => ({
  useHasEntityResolutionLicense: jest.fn(() => false),
}));

jest.mock('../../../entity_analytics/components/entity_details_flyout', () => ({
  getRiskInputTab: jest.fn(),
  getInsightsInputTab: jest.fn(),
  getResolutionGroupTab: jest.fn(),
}));

jest.mock('../shared/components/left', () => ({
  getGraphViewTab: jest.fn(),
}));

// `useTabs` calls these factory functions to build the tab objects. The
// mocks return placeholder shapes with the correct `id` so inclusion/order
// assertions still work, while leaving the call arguments available for
// shape verification via `toHaveBeenCalledWith`.
const setupTabFactoryMocks = () => {
  (getRiskInputTab as jest.Mock).mockImplementation(() => ({
    id: EntityDetailsLeftPanelTab.RISK_INPUTS,
  }));
  (getInsightsInputTab as jest.Mock).mockImplementation(() => ({
    id: EntityDetailsLeftPanelTab.CSP_INSIGHTS,
  }));
  (getGraphViewTab as jest.Mock).mockImplementation(() => ({
    id: EntityDetailsLeftPanelTab.GRAPH_VIEW,
  }));
  (getResolutionGroupTab as jest.Mock).mockImplementation(() => ({
    id: EntityDetailsLeftPanelTab.RESOLUTION_GROUP,
  }));
};

const defaultParams: HostDetailsPanelProps = {
  isRiskScoreExist: true,
  hostName: 'testHost',
  entityId: 'testEntityId',
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
      jest.resetAllMocks();
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
      jest.resetAllMocks();
      (useHasEntityResolutionLicense as jest.Mock).mockReturnValue(false);
      (useExpandableFlyoutApi as jest.Mock).mockReturnValue({ openLeftPanel: jest.fn() });
      setupTabFactoryMocks();
    });

    it('should include the risk score tab when isRiskScoreExist and name are true', () => {
      const { result } = renderHook(() => useTabs(defaultParams), { wrapper: TestProviders });

      expect(result.current).toEqual([
        expect.objectContaining({ id: EntityDetailsLeftPanelTab.RISK_INPUTS }),
      ]);
      // Risk tab receives `entityStoreEntityId` (not the panel param `entityId`).
      // When entity is not in the entity store, this is `undefined` by design.
      expect(getRiskInputTab).toHaveBeenCalledWith({
        entityName: defaultParams.hostName,
        entityType: EntityType.host,
        scopeId: defaultParams.scopeId,
        entityId: undefined,
      });
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
      expect(getInsightsInputTab).toHaveBeenCalledWith({
        field: 'host.name',
        value: defaultParams.hostName,
        entityId: defaultParams.entityId,
        scopeId: defaultParams.scopeId,
        entityType: EntityType.host,
      });
    });

    it('should return the risk inputs and graph view tabs when entityStoreEntityId and hostName are set', () => {
      const params: HostDetailsPanelProps = {
        isRiskScoreExist: false,
        hostName: 'testHost',
        entityId: 'testEntityId',
        scopeId: 'scope1',
        hasMisconfigurationFindings: false,
        hasVulnerabilitiesFindings: false,
        hasNonClosedAlerts: false,
        entityStoreEntityId: 'testEntityStoreId',
      };
      const { result } = renderHook(() => useTabs(params), { wrapper: TestProviders });

      expect(result.current).toEqual([
        expect.objectContaining({ id: EntityDetailsLeftPanelTab.RISK_INPUTS }),
        expect.objectContaining({ id: EntityDetailsLeftPanelTab.GRAPH_VIEW }),
      ]);
      // When the entity is in the entity store, the risk tab receives the
      // `entityStoreEntityId` so it can look up unscored-entity context.
      expect(getRiskInputTab).toHaveBeenCalledWith({
        entityName: params.hostName,
        entityType: EntityType.host,
        scopeId: params.scopeId,
        entityId: params.entityStoreEntityId,
      });
      expect(getGraphViewTab).toHaveBeenCalledWith({
        entityId: params.entityStoreEntityId,
        scopeId: params.scopeId,
      });
    });

    it('should return an empty array when no risk score, no entity store entity, no insights signals, and isRiskScoreExist is false', () => {
      const { result } = renderHook(
        () =>
          useTabs({
            isRiskScoreExist: false,
            hostName: 'testHost',
            entityId: '',
            scopeId: 'scope1',
            hasMisconfigurationFindings: false,
            hasVulnerabilitiesFindings: false,
            hasNonClosedAlerts: false,
          }),
        { wrapper: TestProviders }
      );

      expect(result.current).toEqual([]);
      expect(getRiskInputTab).not.toHaveBeenCalled();
      expect(getInsightsInputTab).not.toHaveBeenCalled();
      expect(getGraphViewTab).not.toHaveBeenCalled();
      expect(getResolutionGroupTab).not.toHaveBeenCalled();
    });

    it('includes Resolution tab when entityStoreEntityId is set and Entity Resolution license is active', () => {
      (useHasEntityResolutionLicense as jest.Mock).mockReturnValue(true);
      const { result } = renderHook(
        () =>
          useTabs({
            ...defaultParams,
            entityStoreEntityId: 'stored-host-entity-1',
          }),
        { wrapper: TestProviders }
      );

      expect(result.current).toEqual([
        expect.objectContaining({ id: EntityDetailsLeftPanelTab.RISK_INPUTS }),
        expect.objectContaining({ id: EntityDetailsLeftPanelTab.GRAPH_VIEW }),
        expect.objectContaining({ id: EntityDetailsLeftPanelTab.RESOLUTION_GROUP }),
      ]);
      // The Resolution tab is the host variant, scoped correctly, and uses the
      // entity store ID — guards against host/user copy-paste bugs.
      expect(getResolutionGroupTab).toHaveBeenCalledWith({
        entityId: 'stored-host-entity-1',
        entityType: EntityType.host,
        scopeId: defaultParams.scopeId,
      });
    });

    it('does not include Resolution tab when entityStoreEntityId is set but license is inactive', () => {
      (useHasEntityResolutionLicense as jest.Mock).mockReturnValue(false);
      const { result } = renderHook(
        () =>
          useTabs({
            ...defaultParams,
            entityStoreEntityId: 'stored-host-entity-1',
          }),
        { wrapper: TestProviders }
      );

      expect(result.current).toEqual([
        expect.objectContaining({ id: EntityDetailsLeftPanelTab.RISK_INPUTS }),
        expect.objectContaining({ id: EntityDetailsLeftPanelTab.GRAPH_VIEW }),
      ]);
      expect(getResolutionGroupTab).not.toHaveBeenCalled();
    });

    it('does not include Resolution tab when license is active but entityStoreEntityId is missing', () => {
      (useHasEntityResolutionLicense as jest.Mock).mockReturnValue(true);
      const { result } = renderHook(() => useTabs(defaultParams), { wrapper: TestProviders });

      expect(result.current).toEqual([
        expect.objectContaining({ id: EntityDetailsLeftPanelTab.RISK_INPUTS }),
      ]);
      // Both Graph and Resolution are gated on `entityStoreEntityId`. License
      // alone must not enable either.
      expect(getGraphViewTab).not.toHaveBeenCalled();
      expect(getResolutionGroupTab).not.toHaveBeenCalled();
    });
  });
});
