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

  describe('DELETE /api/saved_objects_tagging/tags/{id}', () => {
    beforeEach(async () => {
      await kibanaServer.importExport.load(
        'x-pack/test/saved_object_tagging/common/fixtures/es_archiver/delete_with_references/data.json'
      );
    });

    afterEach(async () => {
      await kibanaServer.importExport.unload(
        'x-pack/test/saved_object_tagging/common/fixtures/es_archiver/delete_with_references/data.json'
      );
    });

    it('should delete the tag', async () => {
      const getRes = await supertest.get(`/api/saved_objects_tagging/tags/tag-1`);
      // eslint-disable-next-line no-console
      console.trace('%O', getRes.body);
      expect(getRes.status).to.eql(200);

      const delRes = await supertest.delete(`/api/saved_objects_tagging/tags/tag-1`);
      // eslint-disable-next-line no-console
      console.trace('%O', delRes.body);
      expect(delRes.status).to.eql(200);

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
