/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { RoleCredentials } from '@kbn/ftr-common-functional-services';
import expect from '@kbn/expect';
import { PrivateLocation } from '@kbn/synthetics-plugin/common/runtime_types';
import { syntheticsMonitorSavedObjectType } from '@kbn/synthetics-plugin/common/types/saved_objects';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { PrivateLocationTestService } from '../../../services/synthetics_private_location';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  describe('getMonitorFilters', function () {
    const kibanaServer = getService('kibanaServer');
    const supertest = getService('supertestWithoutAuth');
    const samlAuth = getService('samlAuth');

    const privateLocationTestService = new PrivateLocationTestService(getService);

    let editorUser: RoleCredentials;
    let privateLocation: PrivateLocation;

    after(async () => {
      await kibanaServer.savedObjects.clean({ types: [syntheticsMonitorSavedObjectType] });
    });

    before(async () => {
      await kibanaServer.savedObjects.clean({ types: [syntheticsMonitorSavedObjectType] });
      editorUser = await samlAuth.createM2mApiKeyWithRoleScope('editor');
      privateLocation = await privateLocationTestService.addTestPrivateLocation();
    });

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

      await supertest
        .post(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(newMonitor)
        .expect(200);

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
  });
}
