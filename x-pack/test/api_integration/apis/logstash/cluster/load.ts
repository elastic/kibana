/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('legacyEs');

  describe('load', () => {
    it('should return the ES cluster info', async () => {
      const { body } = await supertest.get('/api/logstash/cluster').expect(200);

      const responseFromES = await es.info();
      expect(body.cluster.uuid).to.eql(responseFromES.cluster_uuid);
    });
  });
}
