/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('sources', () => {
    before(() => esArchiver.load('auditbeat/default'));
    after(() => esArchiver.unload('auditbeat/default'));

    it('Make sure that we get source information when auditbeat indices is there', async () => {
      const { body: sourceStatus } = await supertest
        .post('/internal/search/securitySolutionIndexFields/')
        .set('kbn-xsrf', 'true')
        .send({
          indices: ['auditbeat-*'],
          onlyCheckIfIndicesExist: false,
        })
        .expect(200);

      expect(sourceStatus.indexFields.length).to.be(351);
      expect(sourceStatus.indicesExist).to.eql(['auditbeat-*']);
    });

    it('should find indexes as being available when they exist', async () => {
      const { body: sourceStatus } = await supertest
        .post('/internal/search/securitySolutionIndexFields/')
        .set('kbn-xsrf', 'true')
        .send({
          indices: ['auditbeat-*', 'filebeat-*'],
          onlyCheckIfIndicesExist: false,
        })
        .expect(200);

      expect(sourceStatus.indicesExist).to.eql(['auditbeat-*']);
    });

    it('should not find indexes as existing when there is an empty array of them', async () => {
      const { body: sourceStatus } = await supertest
        .post('/internal/search/securitySolutionIndexFields/')
        .set('kbn-xsrf', 'true')
        .send({
          indices: [],
          onlyCheckIfIndicesExist: false,
        })
        .expect(200);

      expect(sourceStatus.indicesExist).to.eql([]);
    });

    it('should not find indexes as existing when there is a _all within it', async () => {
      const { body: sourceStatus } = await supertest
        .post('/internal/search/securitySolutionIndexFields/')
        .set('kbn-xsrf', 'true')
        .send({
          indices: ['_all'],
          onlyCheckIfIndicesExist: false,
        })
        .expect(200);

      expect(sourceStatus.indicesExist).to.eql([]);
    });

    it('should not find indexes as existing when there are empty strings within it', async () => {
      const { body: sourceStatus } = await supertest
        .post('/internal/search/securitySolutionIndexFields/')
        .set('kbn-xsrf', 'true')
        .send({
          indices: [''],
          onlyCheckIfIndicesExist: false,
        })
        .expect(200);

      expect(sourceStatus.indicesExist).to.eql([]);
    });

    it('should not find indexes as existing when there are blank spaces within it', async () => {
      const { body: sourceStatus } = await supertest
        .post('/internal/search/securitySolutionIndexFields/')
        .set('kbn-xsrf', 'true')
        .send({
          indices: ['   '],
          onlyCheckIfIndicesExist: false,
        })
        .expect(200);

      expect(sourceStatus.indicesExist).to.eql([]);
    });

    it('should find indexes when one is an empty index but the others are valid', async () => {
      const { body: sourceStatus } = await supertest
        .post('/internal/search/securitySolutionIndexFields/')
        .set('kbn-xsrf', 'true')
        .send({
          indices: ['', 'auditbeat-*'],
          onlyCheckIfIndicesExist: false,
        })
        .expect(200);

      expect(sourceStatus.indicesExist).to.eql(['auditbeat-*']);
    });
  });
}
