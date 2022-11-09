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

export default function testPutState({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  describe('PUT /api/guided_onboarding/state', () => {
    afterEach(async () => {
      // Clean up saved objects
      await kibanaServer.savedObjects.clean({ types: [guidedSetupSavedObjectsType] });
    });

    it('should update a guide that has an existing saved object', async () => {
      // Create a saved object for the guide
      await kibanaServer.savedObjects.create({
        type: guidedSetupSavedObjectsType,
        id: testGuideStep1ActiveState.guideId,
        overwrite: true,
        attributes: testGuideStep1ActiveState,
      });

      // Update the state of the guide
      await supertest
        .put(`/api/guided_onboarding/state`)
        .set('kbn-xsrf', 'true')
        .send({
          ...testGuideStep1ActiveState,
          status: 'complete',
        })
        .expect(200);

      // Check that the guide was updated
      const response = await supertest.get('/api/guided_onboarding/state').expect(200);
      const [updatedGuide] = response.body.state;
      expect(updatedGuide.status).to.eql('complete');
    });

    it('should update a guide that does not have a saved object', async () => {
      await supertest
        .put(`/api/guided_onboarding/state`)
        .set('kbn-xsrf', 'true')
        .send({
          ...testGuideStep1ActiveState,
          status: 'ready_to_complete',
        })
        .expect(200);

      // Check that the guide was updated
      const response = await supertest.get('/api/guided_onboarding/state').expect(200);
      const [updatedGuide] = response.body.state;
      expect(updatedGuide.status).to.eql('ready_to_complete');
    });

    it('should update any existing active guides to inactive', async () => {
      // Create an active guide
      await supertest
        .put(`/api/guided_onboarding/state`)
        .set('kbn-xsrf', 'true')
        .send({
          ...testGuideStep1ActiveState,
          isActive: true,
        })
        .expect(200);

      // Create an inactive guide
      await supertest
        .put(`/api/guided_onboarding/state`)
        .set('kbn-xsrf', 'true')
        .send({
          ...mockSearchGuideNotActiveState,
          isActive: false,
        })
        .expect(200);

      // Create a new guide with isActive: true
      await supertest
        .put(`/api/guided_onboarding/state`)
        .set('kbn-xsrf', 'true')
        .send({
          guideId: 'observability',
          isActive: true,
          status: 'in_progress',
          steps: [
            {
              id: 'step1',
              status: 'active',
            },
            {
              id: 'step2',
              status: 'inactive',
            },
            {
              id: 'step3',
              status: 'inactive',
            },
          ],
        })
        .expect(200);

      // Check that the active guide was updated
      const response = await supertest.get('/api/guided_onboarding/state').expect(200);
      const guides = response.body.state;
      expect(guides.length).to.eql(3);
      const activeGuides = guides.filter((guide: { isActive: boolean }) => guide.isActive);
      expect(activeGuides.length).to.eql(1);
      expect(activeGuides[0].guideId).to.eql('observability');
    });
  });
}
