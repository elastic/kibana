/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../services';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const supertest = getService('supertest');

  describe('POST /api/saved_objects_tagging/assignments/update_by_tags', () => {
    beforeEach(async () => {
      await kibanaServer.importExport.load(
        'x-pack/test/saved_object_tagging/common/fixtures/es_archiver/bulk_assign/data.json'
      );
    });

    afterEach(async () => {
      await kibanaServer.importExport.unload(
        'x-pack/test/saved_object_tagging/common/fixtures/es_archiver/bulk_assign/data.json'
      );
    });

    it('allows to update tag assignments', async () => {
      await supertest
        .post(`/api/saved_objects_tagging/assignments/update_by_tags`)
        .send({
          tags: ['tag-1', 'tag-2'],
          assign: [{ type: 'dashboard', id: 'ref-to-tag-1-and-tag-3' }],
          unassign: [{ type: 'visualization', id: 'ref-to-tag-1' }],
        })
        .expect(200);

      const bulkResponse = await supertest
        .post(`/api/saved_objects/_bulk_get`)
        .send([
          { type: 'dashboard', id: 'ref-to-tag-1-and-tag-3' },
          { type: 'visualization', id: 'ref-to-tag-1' },
        ])
        .expect(200);

      const [dashboard, visualization] = bulkResponse.body.saved_objects;

      expect(dashboard.references.map((ref: any) => ref.id)).to.eql(['tag-1', 'tag-3', 'tag-2']);
      expect(visualization.references.map((ref: any) => ref.id)).to.eql([]);
    });

    it('returns an error when trying to assign to non-taggable types', async () => {
      const { body } = await supertest
        .post(`/api/saved_objects_tagging/assignments/update_by_tags`)
        .send({
          tags: ['tag-1', 'tag-2'],
          assign: [{ type: 'config', id: 'foo' }],
          unassign: [{ type: 'visualization', id: 'ref-to-tag-1' }],
        })
        .expect(400);

      expect(body).to.eql({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Unsupported type [config]',
      });

      const bulkResponse = await supertest
        .post(`/api/saved_objects/_bulk_get`)
        .send([{ type: 'visualization', id: 'ref-to-tag-1' }])
        .expect(200);

      const [visualization] = bulkResponse.body.saved_objects;
      expect(visualization.references.map((ref: any) => ref.id)).to.eql(['tag-1']);
    });

    it('returns an error when both `assign` and `unassign` are unspecified', async () => {
      const { body } = await supertest
        .post(`/api/saved_objects_tagging/assignments/update_by_tags`)
        .send({
          tags: ['tag-1', 'tag-2'],
          assign: undefined,
          unassign: undefined,
        })
        .expect(400);

      expect(body).to.eql({
        statusCode: 400,
        error: 'Bad Request',
        message: '[request body]: either `assign` or `unassign` must be specified',
      });
    });
  });
}
