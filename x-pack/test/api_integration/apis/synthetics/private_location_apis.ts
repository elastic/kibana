/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  legacyPrivateLocationsSavedObjectId,
  legacyPrivateLocationsSavedObjectName,
  privateLocationSavedObjectName,
} from '@kbn/synthetics-plugin/common/saved_objects/private_locations';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { PrivateLocation } from '@kbn/synthetics-plugin/common/runtime_types';
import { SyntheticsMonitorTestService } from './services/synthetics_monitor_test_service';
import { FtrProviderContext } from '../../ftr_provider_context';
import { PrivateLocationTestService } from './services/private_location_test_service';

export default function ({ getService }: FtrProviderContext) {
  describe('PrivateLocationAPI', function () {
    this.tags('skipCloud');
    const supertestWithoutAuth = getService('supertestWithoutAuth');
    const supertest = getService('supertest');

    const kServer = getService('kibanaServer');

    const testPrivateLocations = new PrivateLocationTestService(getService);
    const monitorTestService = new SyntheticsMonitorTestService(getService);

    before(async () => {
      await testPrivateLocations.installSyntheticsPackage();

      await kServer.savedObjects.clean({
        types: [legacyPrivateLocationsSavedObjectName, privateLocationSavedObjectName],
      });
    });

    it('adds a test legacy private location', async () => {
      const locs = await testPrivateLocations.addLegacyPrivateLocations();
      expect(locs.length).to.be(2);
    });

    it('adds a test private location', async () => {
      await testPrivateLocations.addPrivateLocation();
    });

    it('list all locations', async () => {
      const locs = await testPrivateLocations.fetchAll();
      expect(locs.body.length).to.be(3);
    });

    it('migrates to new saved objet type', async () => {
      const newData = await kServer.savedObjects.find({
        type: privateLocationSavedObjectName,
      });

      expect(newData.saved_objects.length).to.be(3);

      try {
        await kServer.savedObjects.get({
          type: legacyPrivateLocationsSavedObjectName,
          id: legacyPrivateLocationsSavedObjectId,
        });
      } catch (e) {
        expect(e.response.status).to.be(404);
      }
    });

    it('cannot create private location if privileges are missing', async () => {
      const apiResponse = await testPrivateLocations.addFleetPolicy();
      const agentPolicyId = apiResponse.body.item.id;

      const { username, password } = await monitorTestService.addsNewSpace(['minimal_all']);

      const location: Omit<PrivateLocation, 'id'> = {
        label: 'Test private location 10',
        agentPolicyId: agentPolicyId!,
        geo: {
          lat: 0,
          lon: 0,
        },
      };
      const response = await supertestWithoutAuth
        .post(SYNTHETICS_API_URLS.PRIVATE_LOCATIONS)
        .auth(username, password)
        .set('kbn-xsrf', 'true')
        .send(location);

      expect(response.status).to.be(403);
    });

    it('can create private location if privileges are added', async () => {
      const apiResponse = await testPrivateLocations.addFleetPolicy();
      const agentPolicyId = apiResponse.body.item.id;

      const { username, password } = await monitorTestService.addsNewSpace([
        'minimal_all',
        'can_manage_private_locations',
      ]);

      const location: Omit<PrivateLocation, 'id'> = {
        label: 'Test private location 10',
        agentPolicyId: agentPolicyId!,
        geo: {
          lat: 0,
          lon: 0,
        },
      };
      const response = await supertestWithoutAuth
        .post(SYNTHETICS_API_URLS.PRIVATE_LOCATIONS)
        .auth(username, password)
        .set('kbn-xsrf', 'true')
        .send(location);

      expect(response.status).to.be(200);
    });

    it('can delete private location if privileges are added', async () => {
      const locs = await testPrivateLocations.fetchAll();

      const { username, password } = await monitorTestService.addsNewSpace([
        'minimal_all',
        'can_manage_private_locations',
      ]);

      for (const loc of locs.body) {
        const deleteResponse = await supertestWithoutAuth
          .delete(`${SYNTHETICS_API_URLS.PRIVATE_LOCATIONS}/${loc.id}`)
          .auth(username, password)
          .set('kbn-xsrf', 'true');

        expect(deleteResponse.status).to.be(200);
      }
    });

    it('can create private location in multiple spaces', async () => {
      const apiResponse = await testPrivateLocations.addFleetPolicy();
      const agentPolicyId = apiResponse.body.item.id;

      const { SPACE_ID } = await monitorTestService.addsNewSpace([
        'minimal_all',
        'can_manage_private_locations',
      ]);

      const location: Omit<PrivateLocation, 'id'> = {
        label: 'Test private location 11',
        agentPolicyId: agentPolicyId!,
        geo: {
          lat: 0,
          lon: 0,
        },
        spaces: [SPACE_ID, 'default'],
      };
      const response = await supertest
        .post(SYNTHETICS_API_URLS.PRIVATE_LOCATIONS)
        .set('kbn-xsrf', 'true')
        .send(location);

      expect(response.status).to.be(200);
    });

    it('validation errors works in multiple spaces as well', async () => {
      const apiResponse = await testPrivateLocations.addFleetPolicy();
      const agentPolicyId = apiResponse.body.item.id;

      const { username, password, SPACE_ID } = await monitorTestService.addsNewSpace([
        'minimal_all',
        'can_manage_private_locations',
      ]);

      const location: Omit<PrivateLocation, 'id'> = {
        label: 'Test private location 12',
        agentPolicyId: agentPolicyId!,
        geo: {
          lat: 0,
          lon: 0,
        },
        spaces: [SPACE_ID, 'default'],
      };
      const response = await supertest
        .post(SYNTHETICS_API_URLS.PRIVATE_LOCATIONS)
        .set('kbn-xsrf', 'true')
        .send(location);

      expect(response.status).to.be(200);

      const response1 = await supertestWithoutAuth
        .post(SYNTHETICS_API_URLS.PRIVATE_LOCATIONS)
        .auth(username, password)
        .set('kbn-xsrf', 'true')
        .send({ ...location, spaces: [SPACE_ID] });
      expect(response1.status).to.be(400);
    });
  });
}
