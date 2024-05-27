/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import { FtrProviderContext } from '../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const spacesService = getService('spaces');

  describe('Verify disabledFeatures telemetry payloads', async () => {
    beforeEach(async () => {
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
        disabledFeatures: ['savedObjectsManagement', 'canvas', 'maps'],
      });
    });

    afterEach(async () => {
      await spacesService.delete('space-1');
      await spacesService.delete('space-2');
    });

    it('includes only disabledFeatures findings', async () => {
      const {
        body: [{ stats: apiResponse }],
      } = await supertest
        .post(`/internal/telemetry/clusters/_stats`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '2')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .set('kbn-xsrf', 'xxxx')
        .send({
          unencrypted: true,
          refreshCache: true,
        })
        .expect(200);

      expect(apiResponse.stack_stats.kibana.plugins.spaces.disabledFeatures).to.eql({
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
        maps: 2,
        canvas: 2,
        ml: 0,
        fleetv2: 0,
        fleet: 0,
        osquery: 0,
        observabilityCases: 0,
        uptime: 0,
        slo: 0,
        infrastructure: 0,
        logs: 0,
        monitoring: 0,
        apm: 0,
        enterpriseSearch: 0,
        siem: 0,
        securitySolutionCases: 0,
        securitySolutionAssistant: 0,
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
      });
    });
  });
}
