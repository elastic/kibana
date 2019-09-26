/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function ({ getService }) {
  const supertest = getService('supertest');

  describe('check nodes settings', function () {
    // TODO: https://github.com/elastic/stack-monitoring/issues/31
    this.tags(['skipCloud']);

    it('should check node settings', async () => {
      const { body } = await supertest
        .get('/api/monitoring/v1/elasticsearch_settings/check/nodes')
        .expect(200);

      expect(body.found).to.be(false);
    });
  });
}
