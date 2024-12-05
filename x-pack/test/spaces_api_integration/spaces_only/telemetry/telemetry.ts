/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const spacesService = getService('spaces');
  const usageAPI = getService('usageAPI');

  describe('Verify disabledFeatures telemetry payloads', () => {
    before(async () => {
      await spacesService.create({
        id: 'space-1',
        name: 'space-1',
        description: 'This is your space-1!',
        color: '#00bfb3',
        disabledFeatures: ['canvas', 'maps'],
      });

      await spacesService.create({
        id: 'space-2',
        name: 'space-2',
        description: 'This is your space-2!',
        color: '#00bfb3',
        solution: 'security',
        disabledFeatures: ['savedObjectsManagement', 'canvas', 'maps'],
      });

      await spacesService.create({
        id: 'space-3',
        name: 'space-3',
        description: 'This is your space-3!',
        color: '#00bfb3',
        disabledFeatures: [],
        solution: 'es',
      });
    });

    after(async () => {
      await spacesService.delete('space-1');
      await spacesService.delete('space-2');
      await spacesService.delete('space-3');
    });

    it('includes only disabledFeatures findings', async () => {
      const [{ stats }] = await usageAPI.getTelemetryStats({
        unencrypted: true,
        refreshCache: true,
      });

      expect(stats.stack_stats.kibana.plugins.spaces.disabledFeatures).to.eql({
        guidedOnboardingFeature: 0,
        actions: 0,
        observabilityAIAssistant: 0,
        aiAssistantManagementSelection: 0,
        savedObjectsTagging: 0,
        graph: 0,
        rulesSettings: 0,
        maintenanceWindow: 0,
        stackAlerts: 0,
        generalCases: 0,
        generalCasesV2: 0,
        maps: 2,
        canvas: 2,
        ml: 0,
        fleetv2: 0,
        fleet: 0,
        osquery: 0,
        observabilityCases: 0,
        observabilityCasesV2: 0,
        uptime: 0,
        slo: 0,
        infrastructure: 0,
        inventory: 0,
        logs: 0,
        monitoring: 0,
        apm: 0,
        enterpriseSearch: 0,
        searchInferenceEndpoints: 0,
        siem: 0,
        securitySolutionCases: 0,
        securitySolutionCasesV2: 0,
        securitySolutionAssistant: 0,
        securitySolutionAttackDiscovery: 0,
        discover: 0,
        visualize: 0,
        dashboard: 0,
        dev_tools: 0,
        advancedSettings: 0,
        indexPatterns: 0,
        filesManagement: 0,
        filesSharedImage: 0,
        savedObjectsManagement: 1,
        savedQueryManagement: 0,
        dataQuality: 0,
        entityManager: 0,
      });
    });

    it('includes only solution findings', async () => {
      const [{ stats }] = await usageAPI.getTelemetryStats({
        unencrypted: true,
        refreshCache: true,
      });

      expect(stats.stack_stats.kibana.plugins.spaces.solutions).to.eql({
        security: 1,
        es: 1,
        oblt: 0,
        classic: 0,
        unset: 2,
      });
    });
  });
}
