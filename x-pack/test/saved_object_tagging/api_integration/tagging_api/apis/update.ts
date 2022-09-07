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

  describe('POST /api/saved_objects_tagging/tags/{id}', () => {
    beforeEach(async () => {
      await kibanaServer.importExport.load(
        'x-pack/test/saved_object_tagging/common/fixtures/es_archiver/functional_base/data.json'
      );
    });

    afterEach(async () => {
      await kibanaServer.importExport.unload(
        'x-pack/test/saved_object_tagging/common/fixtures/es_archiver/functional_base/data.json'
      );
    });

    it('should update the tag when validation succeed', async () => {
      await supertest
        .post(`/api/saved_objects_tagging/tags/tag-1`)
        .send({
          name: 'updated name',
          description: 'updated desc',
          color: '#123456',
        })
        .expect(200)
        .then(({ body }) => {
          expect(body).to.eql({
            tag: {
              id: 'tag-1',
              name: 'updated name',
              description: 'updated desc',
              color: '#123456',
            },
          });
        });

      await supertest
        .get(`/api/saved_objects_tagging/tags/tag-1`)
        .expect(200)
        .then(({ body }) => {
          expect(body).to.eql({
            tag: {
              id: 'tag-1',
              name: 'updated name',
              description: 'updated desc',
              color: '#123456',
            },
          });
        });
    });

    it('should return a 404 when trying to update a non existing tag', async () => {
      await supertest
        .post(`/api/saved_objects_tagging/tags/unknown-tag-id`)
        .send({
          name: 'updated name',
          description: 'updated desc',
          color: '#123456',
        })
        .expect(404)
        .then(({ body }) => {
          expect(body).to.eql({
            statusCode: 404,
            error: 'Not Found',
            message: 'Saved object [tag/unknown-tag-id] not found',
          });
        });
    });

    it('should return an error with details when validation failed', async () => {
      await supertest
        .post(`/api/saved_objects_tagging/tags/tag-1`)
        .send({
          name: 'a',
          description: 'some desc',
          color: 'this is not a valid color',
        })
        .expect(400)
        .then(({ body }) => {
          expect(body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message: 'Error validating tag attributes',
            attributes: {
              valid: false,
              warnings: [],
              errors: {
                name: 'Tag name must be at least 2 characters',
                color: 'Tag color must be a valid hex color',
              },
            },
          });
        });
    });
  });
}
