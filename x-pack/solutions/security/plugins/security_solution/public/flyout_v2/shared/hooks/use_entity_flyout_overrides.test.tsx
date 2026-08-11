/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { useEntityFlyoutOverrides } from './use_entity_flyout_overrides';
import { useEntityFlyoutApi } from '../../entity/use_entity_flyout_api';
import { OpenFlyoutLink } from '../components/open_flyout_link';
import { CspInsightLeftPanelSubTab } from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { EntityType } from '../../../../common/entity_analytics/types';

jest.mock('../../entity/use_entity_flyout_api');

const mockOpenUserFlyoutAsChild = jest.fn();
const mockOpenHostFlyoutAsChild = jest.fn();
const mockOpenEntityAlertsInsights = jest.fn();
const mockOpenEntityMisconfigurationInsights = jest.fn();
const mockOpenEntityVulnerabilityInsights = jest.fn();

const mockUseEntityFlyoutApi = useEntityFlyoutApi as jest.Mock;

const mockHit = { id: 'doc-1', raw: { _id: 'doc-1' }, flattened: {} } as unknown as DataTableRecord;

describe('useEntityFlyoutOverrides', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEntityFlyoutApi.mockReturnValue({
      openUserFlyoutAsChild: mockOpenUserFlyoutAsChild,
      openHostFlyoutAsChild: mockOpenHostFlyoutAsChild,
      openEntityAlertsInsights: mockOpenEntityAlertsInsights,
      openEntityMisconfigurationInsights: mockOpenEntityMisconfigurationInsights,
      openEntityVulnerabilityInsights: mockOpenEntityVulnerabilityInsights,
    });
  });

  describe('buildUserOverrides', () => {
    it('returns linkRenderer = OpenFlyoutLink', () => {
      const { result } = renderHook(() =>
        useEntityFlyoutOverrides({ scopeId: 'test-scope', hit: mockHit })
      );
      const overrides = result.current.buildUserOverrides!({ name: 'alice', entityId: 'u1' });
      expect(overrides.linkRenderer).toBe(OpenFlyoutLink);
    });

    it('onPreviewEntity calls openUserFlyoutAsChild with the correct arguments', () => {
      const { result } = renderHook(() =>
        useEntityFlyoutOverrides({ scopeId: 'test-scope', hit: mockHit })
      );
      const overrides = result.current.buildUserOverrides!({ name: 'alice', entityId: 'u1' });
      overrides.onPreviewEntity!();
      expect(mockOpenUserFlyoutAsChild).toHaveBeenCalledWith({
        userName: 'alice',
        entityId: 'u1',
        scopeId: 'test-scope',
        hit: mockHit,
      });
    });

    it('onShowDetailsPanel ALERTS calls openEntityAlertsInsights for user', () => {
      const { result } = renderHook(() =>
        useEntityFlyoutOverrides({ scopeId: 'test-scope', hit: mockHit })
      );
      const overrides = result.current.buildUserOverrides!({ name: 'alice', entityId: 'u1' });
      overrides.onShowDetailsPanel!(CspInsightLeftPanelSubTab.ALERTS);
      expect(mockOpenEntityAlertsInsights).toHaveBeenCalledWith({
        entityType: EntityType.user,
        value: 'alice',
        entityId: 'u1',
      });
    });

    it('onShowDetailsPanel MISCONFIGURATIONS calls openEntityMisconfigurationInsights for user', () => {
      const { result } = renderHook(() =>
        useEntityFlyoutOverrides({ scopeId: 'test-scope', hit: mockHit })
      );
      const overrides = result.current.buildUserOverrides!({ name: 'alice', entityId: 'u1' });
      overrides.onShowDetailsPanel!(CspInsightLeftPanelSubTab.MISCONFIGURATIONS);
      expect(mockOpenEntityMisconfigurationInsights).toHaveBeenCalledWith({
        entityType: EntityType.user,
        value: 'alice',
        entityId: 'u1',
      });
    });
  });

  describe('buildHostOverrides', () => {
    it('returns linkRenderer = OpenFlyoutLink', () => {
      const { result } = renderHook(() =>
        useEntityFlyoutOverrides({ scopeId: 'test-scope', hit: mockHit })
      );
      const overrides = result.current.buildHostOverrides!({ name: 'server-1', entityId: 'h1' });
      expect(overrides.linkRenderer).toBe(OpenFlyoutLink);
    });

    it('onPreviewEntity calls openHostFlyoutAsChild with the correct arguments', () => {
      const { result } = renderHook(() =>
        useEntityFlyoutOverrides({ scopeId: 'test-scope', hit: mockHit })
      );
      const overrides = result.current.buildHostOverrides!({ name: 'server-1', entityId: 'h1' });
      overrides.onPreviewEntity!();
      expect(mockOpenHostFlyoutAsChild).toHaveBeenCalledWith({
        hostName: 'server-1',
        entityId: 'h1',
        scopeId: 'test-scope',
        hit: mockHit,
      });
    });

    it('onShowDetailsPanel ALERTS calls openEntityAlertsInsights for host', () => {
      const { result } = renderHook(() =>
        useEntityFlyoutOverrides({ scopeId: 'test-scope', hit: mockHit })
      );
      const overrides = result.current.buildHostOverrides!({ name: 'server-1', entityId: 'h1' });
      overrides.onShowDetailsPanel!(CspInsightLeftPanelSubTab.ALERTS);
      expect(mockOpenEntityAlertsInsights).toHaveBeenCalledWith({
        entityType: EntityType.host,
        value: 'server-1',
        entityId: 'h1',
      });
    });

    it('onShowDetailsPanel MISCONFIGURATIONS calls openEntityMisconfigurationInsights for host', () => {
      const { result } = renderHook(() =>
        useEntityFlyoutOverrides({ scopeId: 'test-scope', hit: mockHit })
      );
      const overrides = result.current.buildHostOverrides!({ name: 'server-1', entityId: 'h1' });
      overrides.onShowDetailsPanel!(CspInsightLeftPanelSubTab.MISCONFIGURATIONS);
      expect(mockOpenEntityMisconfigurationInsights).toHaveBeenCalledWith({
        entityType: EntityType.host,
        value: 'server-1',
        entityId: 'h1',
      });
    });

    it('onShowDetailsPanel VULNERABILITIES calls openEntityVulnerabilityInsights with onShowHost', () => {
      const { result } = renderHook(() =>
        useEntityFlyoutOverrides({ scopeId: 'test-scope', hit: mockHit })
      );
      const overrides = result.current.buildHostOverrides!({ name: 'server-1', entityId: 'h1' });
      overrides.onShowDetailsPanel!(CspInsightLeftPanelSubTab.VULNERABILITIES);
      expect(mockOpenEntityVulnerabilityInsights).toHaveBeenCalledWith(
        expect.objectContaining({ value: 'server-1', entityId: 'h1' })
      );
      // verify onShowHost also wires back to openHostFlyoutAsChild
      const { onShowHost } = mockOpenEntityVulnerabilityInsights.mock.calls[0][0];
      onShowHost();
      expect(mockOpenHostFlyoutAsChild).toHaveBeenCalledWith({
        hostName: 'server-1',
        entityId: 'h1',
        scopeId: 'test-scope',
        hit: mockHit,
      });
    });
  });

  describe('without a hit (attack tool usage)', () => {
    it('onPreviewEntity calls openUserFlyoutAsChild with hit=undefined', () => {
      const { result } = renderHook(() => useEntityFlyoutOverrides({ scopeId: 'attack-scope' }));
      const overrides = result.current.buildUserOverrides!({ name: 'alice' });
      overrides.onPreviewEntity!();
      expect(mockOpenUserFlyoutAsChild).toHaveBeenCalledWith({
        userName: 'alice',
        entityId: undefined,
        scopeId: 'attack-scope',
        hit: undefined,
      });
    });

    it('onPreviewEntity calls openHostFlyoutAsChild with hit=undefined', () => {
      const { result } = renderHook(() => useEntityFlyoutOverrides({ scopeId: 'attack-scope' }));
      const overrides = result.current.buildHostOverrides!({ name: 'server-1' });
      overrides.onPreviewEntity!();
      expect(mockOpenHostFlyoutAsChild).toHaveBeenCalledWith({
        hostName: 'server-1',
        entityId: undefined,
        scopeId: 'attack-scope',
        hit: undefined,
      });
    });
  });
});
