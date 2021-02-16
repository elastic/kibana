/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
          selectedPatterns: [{ id: 'config', title: 'auditbeat-*' }],
          onlyCheckIfIndicesExist: false,
        })
        .expect(200);

      expect(sourceStatus.indexFields.length).to.be(351);
      expect(sourceStatus.indicesExist).to.eql(['auditbeat-*']);
    });

    it('should not find indexes as existing when there is an empty array of them', async () => {
      const { body: sourceStatus } = await supertest
        .post('/internal/search/securitySolutionIndexFields/')
        .set('kbn-xsrf', 'true')
        .send({
          selectedPatterns: [],
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
          selectedPatterns: [{ id: 'config', title: '_all' }],
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
          selectedPatterns: [{ id: 'config', title: '' }],
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
          selectedPatterns: [{ id: 'config', title: '   ' }],
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
          selectedPatterns: [
            { id: 'config', title: '' },
            { id: 'config', title: 'auditbeat-*' },
          ],
          onlyCheckIfIndicesExist: false,
        })
        .expect(200);

      expect(sourceStatus.indicesExist).to.eql(['auditbeat-*']);
    });

    describe('KIP/saved object dependent tests', () => {
      const pattern = { id: '12345-saved-obj-id', title: 'fake-*' };
      before(async () => {
        await supertest
          .post(`/api/saved_objects/index-pattern/${pattern.id}`)
          .set('kbn-xsrf', 'xxx')
          .send({
            attributes: {
              title: pattern.title,
              fields:
                '[{"name":"@timestamp","type":"date","esTypes":["date"],"count":30,"scripted":false,"searchable":true,"aggregatable":true,"readFromDocValues":true}]',
            },
          });
      });
      after(async () => {
        await supertest
          .delete(`/api/saved_objects/index-pattern/${pattern.id}`)
          .set('kbn-xsrf', 'xxx');
      });
      it('should use KIP service when pattern is a KIP', async () => {
        const { body: sourceStatus } = await supertest
          .post('/internal/search/securitySolutionIndexFields/')
          .set('kbn-xsrf', 'true')
          .send({
            selectedPatterns: [pattern],
            onlyCheckIfIndicesExist: false,
          })
          .expect(200);

        // 1 fields we posted above and 2 "missingFields" = 3
        expect(sourceStatus.indexFields.length).to.eql(3);
      });
    });
  });
}
