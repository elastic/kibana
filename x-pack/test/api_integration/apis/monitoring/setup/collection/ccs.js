/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('ccs', () => {
    const archive = 'monitoring/setup/collection/detect_apm';
    const timeRange = {
      min: '2019-04-16T00:00:00.741Z',
      max: '2019-04-16T23:59:59.741Z',
    };

    before('load archive', () => {
      return esArchiver.load(archive);
    });

    after('unload archive', () => {
      return esArchiver.unload(archive);
    });

    it('should not fail with a ccs parameter for cluster', async () => {
      await supertest
        .post('/api/monitoring/v1/setup/collection/cluster?skipLiveData=true')
        .set('kbn-xsrf', 'xxx')
        .send({ timeRange, ccs: '*' })
        .expect(200);
    });

    it('should not fail with a ccs parameter for node', async () => {
      await supertest
        .post('/api/monitoring/v1/setup/collection/node/123?skipLiveData=true')
        .set('kbn-xsrf', 'xxx')
        .send({ timeRange, ccs: '*' })
        .expect(200);
    });
  });
}
