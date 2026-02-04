/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ContentTabIds } from '../../components/asset_details/types';
import {
  hostDetailsTabs,
  hostDetailsFlyoutTabs,
  getAssetDetailsTabs,
  getAssetDetailsFlyoutTabs,
} from './asset_details_tabs';

describe('asset_details_tabs', () => {
  describe('hostDetailsTabs', () => {
    it('should include the profiling tab', () => {
      const profilingTab = hostDetailsTabs.find((tab) => tab.id === ContentTabIds.PROFILING);
      expect(profilingTab).toBeDefined();
      expect(profilingTab?.id).toBe(ContentTabIds.PROFILING);
      expect(profilingTab?.name).toBeDefined();
    });

    it('should have profiling tab in the correct position', () => {
      const tabIds = hostDetailsTabs.map((tab) => tab.id);
      const profilingIndex = tabIds.indexOf(ContentTabIds.PROFILING);
      expect(profilingIndex).toBeGreaterThanOrEqual(0);
      // Profiling tab should be after processes tab
      const processesIndex = tabIds.indexOf(ContentTabIds.PROCESSES);
      expect(profilingIndex).toBeGreaterThan(processesIndex);
    });

    it('should include all expected tabs for host', () => {
      const expectedTabIds = [
        ContentTabIds.OVERVIEW,
        ContentTabIds.METADATA,
        ContentTabIds.METRICS,
        ContentTabIds.PROCESSES,
        ContentTabIds.PROFILING,
        ContentTabIds.LOGS,
        ContentTabIds.ANOMALIES,
        ContentTabIds.OSQUERY,
      ];
      const actualTabIds = hostDetailsTabs.map((tab) => tab.id);
      expectedTabIds.forEach((tabId) => {
        expect(actualTabIds).toContain(tabId);
      });
    });
  });

  describe('hostDetailsFlyoutTabs', () => {
    it('should include the profiling tab', () => {
      const profilingTab = hostDetailsFlyoutTabs.find((tab) => tab.id === ContentTabIds.PROFILING);
      expect(profilingTab).toBeDefined();
      expect(profilingTab?.id).toBe(ContentTabIds.PROFILING);
    });

    it('should have the same tabs as hostDetailsTabs', () => {
      expect(hostDetailsFlyoutTabs.length).toBe(hostDetailsTabs.length);
      hostDetailsTabs.forEach((tab) => {
        const flyoutTab = hostDetailsFlyoutTabs.find((t) => t.id === tab.id);
        expect(flyoutTab).toBeDefined();
        expect(flyoutTab?.id).toBe(tab.id);
      });
    });
  });

  describe('getAssetDetailsTabs', () => {
    it('should return tabs including profiling for host type', () => {
      const tabs = getAssetDetailsTabs('host');
      const profilingTab = tabs.find((tab) => tab.id === ContentTabIds.PROFILING);
      expect(profilingTab).toBeDefined();
      expect(profilingTab?.id).toBe(ContentTabIds.PROFILING);
    });

    it('should not include profiling tab for container type', () => {
      const tabs = getAssetDetailsTabs('container');
      const profilingTab = tabs.find((tab) => tab.id === ContentTabIds.PROFILING);
      expect(profilingTab).toBeUndefined();
    });
  });

  describe('getAssetDetailsFlyoutTabs', () => {
    it('should return tabs including profiling for host type', () => {
      const tabs = getAssetDetailsFlyoutTabs('host');
      const profilingTab = tabs.find((tab) => tab.id === ContentTabIds.PROFILING);
      expect(profilingTab).toBeDefined();
      expect(profilingTab?.id).toBe(ContentTabIds.PROFILING);
    });

    it('should not include profiling tab for container type', () => {
      const tabs = getAssetDetailsFlyoutTabs('container');
      const profilingTab = tabs.find((tab) => tab.id === ContentTabIds.PROFILING);
      expect(profilingTab).toBeUndefined();
    });
  });
});
