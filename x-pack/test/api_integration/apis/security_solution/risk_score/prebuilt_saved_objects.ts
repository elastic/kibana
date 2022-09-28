/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  prebuiltSavedObjectsBulkCreateUrl,
  prebuiltSavedObjectsBulkDeleteUrl,
} from '@kbn/security-solution-plugin/common/constants';
import { legacyHostRiskScoreSavedObjects, legacyUserRiskScoreSavedObjects } from './mocks';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const supertest = getService('supertest');
  const hostRiskScoreDashboards = 'hostRiskScoreDashboards';
  const userRiskScoreDashboards = 'userRiskScoreDashboards';

  describe('Prebuilt Saved Objects', () => {
    beforeEach(() => kibanaServer.savedObjects.cleanStandardList());
    afterEach(() => kibanaServer.savedObjects.cleanStandardList());

    it('creates prebuilt saved objects for host risk score  dashboards', async () => {
      const response = await supertest
        .post(prebuiltSavedObjectsBulkCreateUrl(hostRiskScoreDashboards))
        .set('kbn-xsrf', 'true');

      expect(response.status).to.be(200);
      expect(response.body.saved_objects.length).to.be(12);
    });

    it('creates prebuilt saved objects for user risk score dashboards', async () => {
      const response = await supertest
        .post(prebuiltSavedObjectsBulkCreateUrl(userRiskScoreDashboards))
        .set('kbn-xsrf', 'true');
      expect(response.status).to.be(200);
      expect(response.body.saved_objects.length).to.be(12);
    });

    it('deletes legacy prebuilt saved objects for host risk score dashboards', async () => {
      const {
        body: { saved_objects: createdHostRiskScoreDashboards },
      } = await supertest
        .post(prebuiltSavedObjectsBulkCreateUrl(hostRiskScoreDashboards))
        .set('kbn-xsrf', 'true');

      const response = await supertest
        .post(prebuiltSavedObjectsBulkDeleteUrl(hostRiskScoreDashboards))
        .set('kbn-xsrf', 'true');

      expect(response.status).to.be(200);
      expect(response.text).to.be(JSON.stringify(legacyHostRiskScoreSavedObjects));
    });

    it('deletes legacy and current prebuilt saved objects for host risk score dashboards', async () => {
      const {
        body: { saved_objects: createdHostRiskScoreDashboards },
      } = await supertest
        .post(prebuiltSavedObjectsBulkCreateUrl(hostRiskScoreDashboards))
        .set('kbn-xsrf', 'true');

      const response = await supertest
        .post(prebuiltSavedObjectsBulkDeleteUrl(hostRiskScoreDashboards))
        .send({ deleteAll: true })
        .set('kbn-xsrf', 'true');

      expect(response.status).to.be(200);
      expect(response.text).to.be(
        JSON.stringify([
          ...legacyHostRiskScoreSavedObjects,
          ...createdHostRiskScoreDashboards.map((s) => `Deleted saved object: ${s.id}`),
        ])
      );
    });

    it('deletes legacy prebuilt saved objects for user risk score dashboards', async () => {
      const {
        body: { saved_objects: createdUserRiskScoreDashboards },
      } = await supertest
        .post(prebuiltSavedObjectsBulkCreateUrl(userRiskScoreDashboards))
        .set('kbn-xsrf', 'true');

      const response = await supertest
        .post(prebuiltSavedObjectsBulkDeleteUrl(userRiskScoreDashboards))
        .set('kbn-xsrf', 'true');

      expect(response.status).to.be(200);
      expect(response.text).to.be(JSON.stringify(legacyUserRiskScoreSavedObjects));
    });

    it('deletes legacy and current prebuilt saved objects for user risk score dashboards', async () => {
      const {
        body: { saved_objects: createdUserRiskScoreDashboards },
      } = await supertest
        .post(prebuiltSavedObjectsBulkCreateUrl(userRiskScoreDashboards))
        .set('kbn-xsrf', 'true');

      const response = await supertest
        .post(prebuiltSavedObjectsBulkDeleteUrl(userRiskScoreDashboards))
        .send({ deleteAll: true })
        .set('kbn-xsrf', 'true');

      expect(response.status).to.be(200);
      expect(response.text).to.be(
        JSON.stringify([
          ...legacyUserRiskScoreSavedObjects,
          ...createdUserRiskScoreDashboards.map((s) => `Deleted saved object: ${s.id}`),
        ])
      );
    });
  });
}
