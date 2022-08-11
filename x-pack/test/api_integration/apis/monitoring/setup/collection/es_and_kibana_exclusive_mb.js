/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import fixture from './fixtures/es_and_kibana_exclusive_mb.json';
import { getLifecycleMethods } from '../../data_stream';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('es_and_kibana_exclusive mb', () => {
    const { setup, tearDown } = getLifecycleMethods(getService);
    const archive =
      'x-pack/test/functional/es_archives/monitoring/setup/collection/es_and_kibana_exclusive';
    const archiveMb8 =
      'x-pack/test/functional/es_archives/monitoring/setup/collection/es_and_kibana_exclusive_mb_8';
    const timeRange = {
      min: '2019-04-09T00:00:00.741Z',
      max: '2019-04-09T23:59:59.741Z',
    };

    before('load archive', async () => {
      await esArchiver.load(archive);
      await setup(archiveMb8);
    });

    after('unload archive', async () => {
      await esArchiver.unload(archive);
      await tearDown();
    });

    it('should get collection status', async () => {
      const { body } = await supertest
        .post('/api/monitoring/v1/setup/collection/cluster?skipLiveData=true')
        .set('kbn-xsrf', 'xxx')
        .send({ timeRange })
        .expect(200);
      expect(body).to.eql(fixture);
    });
  });
}
