/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import expect from 'expect.js';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  const indexName = `metricbeat-6.7.0-2019.03.11`;

  describe('metricbeat default_field setting', () => {
    beforeEach(async () => {
      await esArchiver.load('upgrade_assistant/metricbeat');
    });

    afterEach(async () => {
      await esArchiver.unload('upgrade_assistant/metricbeat');
    });

    it('returns true for metricbeat index', async () => {
      // Upgrade assistant should show deprecation message
      const { body: uaBody } = await supertest.get('/api/upgrade_assistant/status').expect(200);
      const depMessage = uaBody.indices.find(
        dep => dep.index === indexName && dep.message === 'Number of fields exceeds automatic field expansion limit'
      );
      expect(depMessage).to.not.be(undefined);

      // Upgrade assistant should correctly recognize this as a metricbeat index
      const { body: metricbeatBody } = await supertest.get(`/api/upgrade_assistant/metricbeat/${indexName}`).expect(200);
      expect(metricbeatBody).to.be(true);
    });

    it('adds index.query.default_field to metricbeat index', async () => {
      const { body } = await supertest.post(`/api/upgrade_assistant/metricbeat/${indexName}/fix`).set('kbn-xsrf', 'xxx').expect(200);
      expect(body.acknowledged).to.be(true);

      // The index.query.default_field setting should now be set
      const settingsResp = await es.indices.getSettings({ index: indexName });
      expect(settingsResp[indexName].settings.index.query.default_field).to.not.be(undefined);

      // Deprecation message should be gone
      const { body: uaBody } = await supertest.get('/api/upgrade_assistant/status').expect(200);
      const depMessage = uaBody.indices.find(
        dep => dep.index === indexName && dep.message === 'Number of fields exceeds automatic field expansion limit'
      );
      expect(depMessage).to.be(undefined);
    });
  });
}
