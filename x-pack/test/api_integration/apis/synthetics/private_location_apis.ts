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
import { FtrProviderContext } from '../../ftr_provider_context';
import { PrivateLocationTestService } from './services/private_location_test_service';

export default function ({ getService }: FtrProviderContext) {
  describe('PrivateLocationAPI', function () {
    this.tags('skipCloud');

    const kServer = getService('kibanaServer');

    const testPrivateLocations = new PrivateLocationTestService(getService);

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
  });
}
