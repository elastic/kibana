/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CORE_SECURITY_MODULES,
  MICROSOFT_DEFENDER_MODULES,
  SECURITY_MODULE_DATASETS,
  getAllSecurityModules,
  getSecurityModuleDatasets,
} from './security_modules';

describe('security_modules', () => {
  describe('data contract enforcement', () => {
    // These are intentional change-detection tests to ensure compatibility
    // across the system. If these fail, update the mappings and verify
    // that downstream consumers (schema detection, event filtering) are updated.

    it('should have CORE_SECURITY_MODULES with expected modules', () => {
      expect(CORE_SECURITY_MODULES).toEqual([
        'crowdstrike',
        'jamf_protect',
        'sentinel_one',
        'sentinel_one_cloud_funnel',
      ]);
    });

    it('should have MICROSOFT_DEFENDER_MODULES with expected modules', () => {
      expect(MICROSOFT_DEFENDER_MODULES).toEqual(['microsoft_defender_endpoint', 'm365_defender']);
    });

    it('should have SECURITY_MODULE_DATASETS with correct mappings', () => {
      expect(SECURITY_MODULE_DATASETS).toEqual({
        crowdstrike: ['crowdstrike.alert', 'crowdstrike.falcon', 'crowdstrike.fdr'],
        jamf_protect: [
          'jamf_protect.telemetry',
          'jamf_protect.alerts',
          'jamf_protect.web-threat-events',
          'jamf_protect.web-traffic-events',
        ],
        sentinel_one: ['sentinel_one.alert'],
        sentinel_one_cloud_funnel: ['sentinel_one_cloud_funnel.event'],
        microsoft_defender_endpoint: ['microsoft_defender_endpoint.log'],
        m365_defender: ['m365_defender.alert', 'm365_defender.incident'],
      });
    });

    it('should have all modules represented in SECURITY_MODULE_DATASETS', () => {
      const allModules = [...CORE_SECURITY_MODULES, ...MICROSOFT_DEFENDER_MODULES];
      const datasetKeys = Object.keys(SECURITY_MODULE_DATASETS);

      allModules.forEach((module) => {
        expect(datasetKeys).toContain(module);
      });
    });
  });

  describe('getAllSecurityModules', () => {
    it('should return all core and Microsoft Defender modules', () => {
      const result = getAllSecurityModules();

      expect(result).toEqual([
        'crowdstrike',
        'jamf_protect',
        'sentinel_one',
        'sentinel_one_cloud_funnel',
        'microsoft_defender_endpoint',
        'm365_defender',
      ]);
    });

    it('should maintain order with core modules first, then Microsoft Defender modules', () => {
      const result = getAllSecurityModules();

      // Check that core modules come first
      CORE_SECURITY_MODULES.forEach((module, index) => {
        expect(result[index]).toBe(module);
      });

      // Check that Microsoft Defender modules come after
      MICROSOFT_DEFENDER_MODULES.forEach((module, index) => {
        expect(result[CORE_SECURITY_MODULES.length + index]).toBe(module);
      });
    });

    it('should return a new array each time (not a reference)', () => {
      const result1 = getAllSecurityModules();
      const result2 = getAllSecurityModules();

      expect(result1).not.toBe(result2);
      expect(result1).toEqual(result2);
    });
  });

  describe('getSecurityModuleDatasets', () => {
    describe('with valid modules', () => {
      it('should return datasets for a single core module', () => {
        const result = getSecurityModuleDatasets(['crowdstrike']);

        expect(result).toEqual(['crowdstrike.alert', 'crowdstrike.falcon', 'crowdstrike.fdr']);
      });

      it('should return datasets for a single Microsoft Defender module', () => {
        const result = getSecurityModuleDatasets(['m365_defender']);

        expect(result).toEqual(['m365_defender.alert', 'm365_defender.incident']);
      });

      it('should return datasets for multiple modules', () => {
        const result = getSecurityModuleDatasets(['crowdstrike', 'sentinel_one']);

        expect(result).toEqual([
          'crowdstrike.alert',
          'crowdstrike.falcon',
          'crowdstrike.fdr',
          'sentinel_one.alert',
        ]);
      });

      it('should return datasets for all core modules', () => {
        const result = getSecurityModuleDatasets(CORE_SECURITY_MODULES);

        expect(result).toEqual([
          'crowdstrike.alert',
          'crowdstrike.falcon',
          'crowdstrike.fdr',
          'jamf_protect.telemetry',
          'jamf_protect.alerts',
          'jamf_protect.web-threat-events',
          'jamf_protect.web-traffic-events',
          'sentinel_one.alert',
          'sentinel_one_cloud_funnel.event',
        ]);
      });

      it('should return datasets for all modules', () => {
        const allModules = getAllSecurityModules();
        const result = getSecurityModuleDatasets(allModules);

        expect(result).toEqual([
          'crowdstrike.alert',
          'crowdstrike.falcon',
          'crowdstrike.fdr',
          'jamf_protect.telemetry',
          'jamf_protect.alerts',
          'jamf_protect.web-threat-events',
          'jamf_protect.web-traffic-events',
          'sentinel_one.alert',
          'sentinel_one_cloud_funnel.event',
          'microsoft_defender_endpoint.log',
          'm365_defender.alert',
          'm365_defender.incident',
        ]);
      });

      it('should maintain the order of datasets as they appear in module iteration', () => {
        const result = getSecurityModuleDatasets(['jamf_protect', 'crowdstrike']);

        expect(result).toEqual([
          'jamf_protect.telemetry',
          'jamf_protect.alerts',
          'jamf_protect.web-threat-events',
          'jamf_protect.web-traffic-events',
          'crowdstrike.alert',
          'crowdstrike.falcon',
          'crowdstrike.fdr',
        ]);
      });
    });

    describe('with edge cases', () => {
      it('should return empty array for empty input', () => {
        const result = getSecurityModuleDatasets([]);

        expect(result).toEqual([]);
      });

      it('should ignore unknown modules and return datasets for known ones', () => {
        const result = getSecurityModuleDatasets(['crowdstrike', 'unknown_module', 'sentinel_one']);

        expect(result).toEqual([
          'crowdstrike.alert',
          'crowdstrike.falcon',
          'crowdstrike.fdr',
          'sentinel_one.alert',
        ]);
      });

      it('should return empty array for all unknown modules', () => {
        const result = getSecurityModuleDatasets(['unknown1', 'unknown2']);

        expect(result).toEqual([]);
      });

      it('should handle mixed case and different string types', () => {
        // Test with readonly array (as used in the actual implementation)
        const readonlyModules = ['crowdstrike', 'sentinel_one'] as const;
        const result = getSecurityModuleDatasets(readonlyModules);

        expect(result).toEqual([
          'crowdstrike.alert',
          'crowdstrike.falcon',
          'crowdstrike.fdr',
          'sentinel_one.alert',
        ]);
      });
    });

    describe('type safety', () => {
      it('should accept readonly arrays', () => {
        const readonlyArray = ['crowdstrike'] as const;
        const result = getSecurityModuleDatasets(readonlyArray);

        expect(result).toEqual(['crowdstrike.alert', 'crowdstrike.falcon', 'crowdstrike.fdr']);
      });

      it('should return a mutable array even with readonly input', () => {
        const readonlyArray = ['crowdstrike'] as const;
        const result = getSecurityModuleDatasets(readonlyArray);

        // This should not cause TypeScript errors
        result.push('test.dataset');
        expect(result).toContain('test.dataset');
      });
    });
  });

  describe('integration scenarios', () => {
    it('should work with getAllSecurityModules output as input to getSecurityModuleDatasets', () => {
      const allModules = getAllSecurityModules();
      const allDatasets = getSecurityModuleDatasets(allModules);

      expect(allDatasets.length).toBeGreaterThan(0);
      expect(allDatasets).toContain('crowdstrike.alert');
      expect(allDatasets).toContain('microsoft_defender_endpoint.log');
    });

    it('should support partial module selection scenarios', () => {
      // Scenario: Only core modules enabled
      const coreDatasets = getSecurityModuleDatasets(CORE_SECURITY_MODULES);
      expect(coreDatasets).not.toContain('microsoft_defender_endpoint.log');
      expect(coreDatasets).toContain('crowdstrike.alert');

      // Scenario: Only Microsoft Defender modules enabled
      const defenderDatasets = getSecurityModuleDatasets(MICROSOFT_DEFENDER_MODULES);
      expect(defenderDatasets).toContain('microsoft_defender_endpoint.log');
      expect(defenderDatasets).not.toContain('crowdstrike.alert');
    });
  });
});
