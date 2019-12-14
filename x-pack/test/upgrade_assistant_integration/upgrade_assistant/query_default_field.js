/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('legacyEs');

  const indexName = `metricbeat-6.7.0-2019.03.11`;

  describe('add default_field setting', () => {
    beforeEach(async () => {
      await esArchiver.load('upgrade_assistant/metricbeat');
    });

    afterEach(async () => {
      await esArchiver.unload('upgrade_assistant/metricbeat');
    });

    it('adds index.query.default_field to metricbeat index', async () => {
      const { body } = await supertest
        .post(`/api/upgrade_assistant/add_query_default_field/${indexName}`)
        .set('kbn-xsrf', 'xxx')
        .send({ fieldTypes: ['text', 'keyword', 'ip'], otherFields: ['fields.*'] })
        .expect(200);
      expect(body.acknowledged).to.be(true);

      // The index.query.default_field setting should now be set
      const settingsResp = await es.indices.getSettings({ index: indexName });
      expect(settingsResp[indexName].settings.index.query.default_field).to.not.be(undefined);

      // Deprecation message should be gone
      const { body: uaBody } = await supertest.get('/api/upgrade_assistant/status').expect(200);
      const depMessage = uaBody.indices.find(
        dep =>
          dep.index === indexName &&
          dep.message === 'Number of fields exceeds automatic field expansion limit'
      );
      expect(depMessage).to.be(undefined);
    });
  });
}
