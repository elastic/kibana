/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../services';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('DELETE /api/saved_objects_tagging/tags/{id}', () => {
    beforeEach(async () => {
      await esArchiver.load('delete_with_references');
    });

    afterEach(async () => {
      await esArchiver.unload('delete_with_references');
    });

    it('should delete the tag', async () => {
      await supertest.get(`/api/saved_objects_tagging/tags/tag-1`).expect(200);

      await supertest.delete(`/api/saved_objects_tagging/tags/tag-1`).expect(200);

      await supertest.get(`/api/saved_objects_tagging/tags/tag-1`).expect(404);
    });

    it('should remove references to the deleted tag', async () => {
      await supertest.get(`/api/saved_objects_tagging/tags/tag-1`).expect(200);

      await supertest.delete(`/api/saved_objects_tagging/tags/tag-1`).expect(200);

      const bulkResponse = await supertest
        .post(`/api/saved_objects/_bulk_get`)
        .send([
          { type: 'visualization', id: 'ref-to-tag-1' },
          { type: 'visualization', id: 'ref-to-tag-1-and-tag-2' },
        ])
        .expect(200);

      const [vis1, vis2] = bulkResponse.body.saved_objects;

      expect(vis1.references).to.eql([]);
      expect(vis2.references).to.eql([{ type: 'tag', id: 'tag-2', name: 'tag-2' }]);
    });
  });
}
