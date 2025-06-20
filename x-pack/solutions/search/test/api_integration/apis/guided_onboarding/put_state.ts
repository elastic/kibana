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
  testGuideStep1InProgressState,
  testGuideStep2ActiveState,
  testGuideParams,
} from '@kbn/guided-onboarding-plugin/public/services/api.mocks';
import {
  pluginStateSavedObjectsType,
  pluginStateSavedObjectsId,
  guideStateSavedObjectsType,
} from '@kbn/guided-onboarding-plugin/server/saved_objects/guided_setup';
import { testGuideId } from '@kbn/guided-onboarding';
import { API_BASE_PATH } from '@kbn/guided-onboarding-plugin/common';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import {
  createGuides,
  createPluginState,
} from '@kbn/test-suites-src/api_integration/apis/guided_onboarding/helpers';
import type { FtrProviderContext } from '../../ftr_provider_context';

const putStatePath = `${API_BASE_PATH}/state`;
export default function testPutState({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  describe(`PUT ${putStatePath}`, () => {
    afterEach(async () => {
      // Clean up saved objects
      await kibanaServer.savedObjects.clean({
        types: [pluginStateSavedObjectsType, guideStateSavedObjectsType],
      });
    });

    it('creates a plugin saved object when updating the status and there is no state yet', async () => {
      const response = await supertest
        .put(putStatePath)
        .set('kbn-xsrf', 'true')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send({
          status: 'in_progress',
        })
        .expect(200);

      expect(response.body).to.eql({
        pluginState: {
          status: 'in_progress',
          isActivePeriod: true,
        },
      });

      const createdSO = await kibanaServer.savedObjects.get({
        type: pluginStateSavedObjectsType,
        id: pluginStateSavedObjectsId,
      });

      expect(createdSO.attributes.status).to.eql('in_progress');
    });

    it('updates the plugin saved object when updating the status and there is already state', async () => {
      await createPluginState(kibanaServer, {
        status: 'not_started',
        creationDate: new Date().toISOString(),
      });

      const response = await supertest
        .put(putStatePath)
        .set('kbn-xsrf', 'true')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send({
          status: 'in_progress',
        })
        .expect(200);

      expect(response.body).to.eql({
        pluginState: {
          status: 'in_progress',
          isActivePeriod: true,
        },
      });

      const createdSO = await kibanaServer.savedObjects.get({
        type: pluginStateSavedObjectsType,
        id: pluginStateSavedObjectsId,
      });

      expect(createdSO.attributes.status).to.eql('in_progress');
    });

    it('creates a guide saved object when updating the guide and there is no guide SO yet', async () => {
      await supertest
        .put(putStatePath)
        .set('kbn-xsrf', 'true')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send({
          guide: testGuideStep1ActiveState,
        })
        .expect(200);

      const createdSO = await kibanaServer.savedObjects.get({
        type: guideStateSavedObjectsType,
        id: testGuideId,
      });

      expect(createdSO.attributes).to.eql(testGuideStep1ActiveState);
    });

    it('updates the guide saved object when updating the guide and there is already guide SO', async () => {
      await createGuides(kibanaServer, [testGuideStep1ActiveState]);

      await supertest
        .put(putStatePath)
        .set('kbn-xsrf', 'true')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send({
          guide: testGuideNotActiveState,
        })
        .expect(200);

      const createdSO = await kibanaServer.savedObjects.get({
        type: guideStateSavedObjectsType,
        id: testGuideId,
      });

      expect(createdSO.attributes).to.eql(testGuideNotActiveState);
    });

    it('updates any existing active guides to inactive', async () => {
      // create an active guide
      await createGuides(kibanaServer, [testGuideStep1ActiveState]);

      // Create a new guide with isActive: true
      await supertest
        .put(putStatePath)
        .set('kbn-xsrf', 'true')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send({
          guide: {
            ...testGuideStep1ActiveState,
            guideId: 'kubernetes',
          },
        })
        .expect(200);

      // Check that all guides except observability are inactive
      const testGuideSO = await kibanaServer.savedObjects.get({
        type: guideStateSavedObjectsType,
        id: testGuideId,
      });
      expect(testGuideSO.attributes.isActive).to.eql(false);

      const kubernetesGuide = await kibanaServer.savedObjects.get({
        type: guideStateSavedObjectsType,
        id: 'kubernetes',
      });
      expect(kubernetesGuide.attributes.isActive).to.eql(true);
    });

    it('saves dynamic params if provided', async () => {
      // create a guide
      await createGuides(kibanaServer, [testGuideStep1InProgressState]);

      // complete step1 with dynamic params
      await supertest
        .put(putStatePath)
        .set('kbn-xsrf', 'true')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send({
          guide: {
            ...testGuideStep2ActiveState,
            params: testGuideParams,
          },
        })
        .expect(200);

      // check that params object was saved
      const testGuideSO = await kibanaServer.savedObjects.get({
        type: guideStateSavedObjectsType,
        id: testGuideId,
      });
      expect(testGuideSO.attributes.params).to.eql(testGuideParams);
    });
  });
}
