/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function ({ getService }) {
  const supertest = getService('supertest');

  describe('update collection_interval setting', () => {
    it('should set collection.interval to 10s', async () => {
      const { body } = await supertest
        .put('/api/monitoring/v1/elasticsearch_settings/set/collection_interval')
        .set('kbn-xsrf', 'xxx')
        .expect(200);

      expect(body).to.eql({ // returns same response every run
        acknowledged: true,
        persistent: {
          xpack: { monitoring: { collection: { interval: '10s' } } }
        },
        transient: {}
      });
    });
  });
}
