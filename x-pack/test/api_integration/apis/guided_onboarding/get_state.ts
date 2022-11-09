/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  testGuideStep1ActiveState,
  testGuideNotActiveState,
} from '@kbn/guided-onboarding-plugin/public/services/api.mocks';
import { guidedSetupSavedObjectsType } from '@kbn/guided-onboarding-plugin/server/saved_objects/guided_setup';
import type { GuideState } from '@kbn/guided-onboarding';
import type { FtrProviderContext } from '../../ftr_provider_context';

const mockSearchGuideNotActiveState: GuideState = {
  ...testGuideNotActiveState,
  guideId: 'search',
};

export default function testGetState({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  describe('GET /api/guided_onboarding/state', () => {
    afterEach(async () => {
      // Clean up saved objects
      await kibanaServer.savedObjects.clean({ types: [guidedSetupSavedObjectsType] });
    });

    const createGuides = async (guides: GuideState[]) => {
      for (const guide of guides) {
        await kibanaServer.savedObjects.create({
          type: guidedSetupSavedObjectsType,
          id: guide.guideId,
          overwrite: true,
          attributes: guide,
        });
      }
    };

    it('should return the state for all guides', async () => {
      // Create two guides to return
      await createGuides([testGuideStep1ActiveState, mockSearchGuideNotActiveState]);

      const response = await supertest.get('/api/guided_onboarding/state').expect(200);
      expect(response.body.state.length).to.eql(2);
      expect(response.body).to.eql({
        state: [testGuideStep1ActiveState, mockSearchGuideNotActiveState],
      });
    });

    it('should return the state for the active guide with query param `active=true`', async () => {
      await createGuides([testGuideStep1ActiveState, mockSearchGuideNotActiveState]);

      const response = await supertest
        .get('/api/guided_onboarding/state')
        .query({ active: true })
        .expect(200);
      expect(response.body).to.eql({ state: [testGuideStep1ActiveState] });
    });

    it("should return an empty array if saved object doesn't exist", async () => {
      const response = await supertest.get('/api/guided_onboarding/state').expect(200);
      expect(response.body).to.eql({ state: [] });
    });
  });
}
