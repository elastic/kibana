/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function({ getService }) {
  const supertest = getService('supertest');

  describe('check cluster settings', () => {
    it('should get cluster settings', async () => {
      const { body } = await supertest
        .get('/api/monitoring/v1/elasticsearch_settings/check/cluster')
        .expect(200);

      expect(body.found).to.eql(true);
      expect(body.reason.context.indexOf('cluster ') === 0).to.be(true);
      expect(body.reason.property).to.eql('xpack.monitoring.collection.enabled');
      expect(body.reason.data).to.eql('false');
    });
  });
}
