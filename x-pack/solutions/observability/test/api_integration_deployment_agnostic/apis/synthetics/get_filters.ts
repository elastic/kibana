/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import type { RoleCredentials } from '@kbn/ftr-common-functional-services';
import expect from '@kbn/expect';
import type { PrivateLocation } from '@kbn/synthetics-plugin/common/runtime_types';
import {
  legacySyntheticsMonitorTypeSingle,
  syntheticsMonitorSavedObjectType,
} from '@kbn/synthetics-plugin/common/types/saved_objects';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { PrivateLocationTestService } from '../../services/synthetics_private_location';
import { addMonitorAPIHelper } from './create_monitor';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  describe('getMonitorFilters', function () {
    const kibanaServer = getService('kibanaServer');
    const supertest = getService('supertestWithoutAuth');
    const samlAuth = getService('samlAuth');

    const privateLocationTestService = new PrivateLocationTestService(getService);

    let editorUser: RoleCredentials;
    let privateLocation: PrivateLocation;

    after(async () => {
      await kibanaServer.savedObjects.clean({
        types: [syntheticsMonitorSavedObjectType, legacySyntheticsMonitorTypeSingle],
      });
    });

    before(async () => {
      await kibanaServer.savedObjects.clean({
        types: [syntheticsMonitorSavedObjectType, legacySyntheticsMonitorTypeSingle],
      });
      editorUser = await samlAuth.createM2mApiKeyWithRoleScope('editor');
      await privateLocationTestService.installSyntheticsPackage();
      privateLocation = await privateLocationTestService.addTestPrivateLocation();
    });

    const addMonitor = async (monitor: any, type?: string) => {
      return addMonitorAPIHelper(supertest, monitor, 200, editorUser, samlAuth, false, type);
    };

    it('get list of filters', async () => {
      const apiResponse = await supertest
        .get(SYNTHETICS_API_URLS.FILTERS)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      expect(apiResponse.body).eql({
        monitorTypes: [],
        tags: [],
        locations: [],
        projects: [],
        schedules: [],
      });
    });

    it('get list of filters with monitorTypes', async () => {
      const newMonitor = {
        name: 'Sample name',
        type: 'http',
        urls: 'https://elastic.co',
        tags: ['apm', 'synthetics'],
        locations: [privateLocation],
      };

      await addMonitor(newMonitor);

      const apiResponse = await supertest
        .get(SYNTHETICS_API_URLS.FILTERS)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      expect(apiResponse.body).eql({
        monitorTypes: [{ label: 'http', count: 1 }],
        tags: [
          { label: 'apm', count: 1 },
          { label: 'synthetics', count: 1 },
        ],
        locations: [{ label: privateLocation.id, count: 1 }],
        projects: [],
        schedules: [{ label: '3', count: 1 }],
      });
    });

    it('get list of filters for legacy saved object type monitor', async () => {
      // Create a legacy monitor directly via savedObjectsClient

      // Use the internal savedObjectsClient to create a legacy monitor
      await addMonitor(
        {
          name: 'Legacy Monitor',
          type: 'icmp',
          host: 'https://legacy.elastic.co',
          tags: ['legacy', 'synthetics'],
          locations: [privateLocation],
        },
        legacySyntheticsMonitorTypeSingle
      );

      const apiResponse = await supertest
        .get(SYNTHETICS_API_URLS.FILTERS)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      expect(apiResponse.body.monitorTypes).to.eql([
        { label: 'http', count: 1 },
        { label: 'icmp', count: 1 },
      ]);
      expect(apiResponse.body.tags).to.eql([
        { label: 'apm', count: 1 },
        { label: 'synthetics', count: 2 },
        { label: 'legacy', count: 1 },
      ]);
      expect(apiResponse.body.locations).to.eql([{ label: privateLocation.id, count: 2 }]);
      expect(apiResponse.body.schedules).to.eql([{ label: '3', count: 2 }]);
    });

    it('get list of filters with both legacy and modern monitors', async () => {
      // Create a modern monitor
      const modernMonitor = {
        name: 'Modern Monitor',
        type: 'http',
        urls: 'https://modern.elastic.co',
        tags: ['multi-space', 'synthetics'],
        locations: [privateLocation],
      };

      await addMonitor(modernMonitor);

      await addMonitor(
        {
          name: 'Legacy Monitor 3',
          type: 'icmp',
          host: 'https://legacy2.elastic.co',
          tags: ['legacy2', 'synthetics'],
          locations: [privateLocation],
        },
        legacySyntheticsMonitorTypeSingle
      );

      const apiResponse = await supertest
        .get(SYNTHETICS_API_URLS.FILTERS)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      expect(apiResponse.body.monitorTypes).to.eql([
        { label: 'http', count: 2 },
        { label: 'icmp', count: 2 },
      ]);
      expect(apiResponse.body.tags).to.eql([
        { label: 'synthetics', count: 4 },
        { label: 'apm', count: 1 },
        { label: 'multi-space', count: 1 },
        { label: 'legacy', count: 1 },
        { label: 'legacy2', count: 1 },
      ]);
      expect(apiResponse.body.locations).to.eql([{ label: privateLocation.id, count: 4 }]);
      expect(apiResponse.body.schedules).to.eql([{ label: '3', count: 4 }]);
    });
  });
}
