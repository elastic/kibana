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
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('POST /api/saved_objects_tagging/tags/create', () => {
    beforeEach(async () => {
      await esArchiver.load(
        'x-pack/test/saved_object_tagging/common/fixtures/es_archiver/functional_base'
      );
    });

    afterEach(async () => {
      await esArchiver.unload(
        'x-pack/test/saved_object_tagging/common/fixtures/es_archiver/functional_base'
      );
    });

    it('should create the tag when validation succeed', async () => {
      const createResponse = await supertest
        .post(`/api/saved_objects_tagging/tags/create`)
        .send({
          name: 'my new tag',
          description: 'some desc',
          color: '#772299',
        })
        .expect(200);

      const newTagId = createResponse.body.tag.id;
      expect(createResponse.body).to.eql({
        tag: {
          id: newTagId,
          name: 'my new tag',
          description: 'some desc',
          color: '#772299',
        },
      });

      await supertest
        .get(`/api/saved_objects_tagging/tags/${newTagId}`)
        .expect(200)
        .then(({ body }) => {
          expect(body).to.eql({
            tag: {
              id: newTagId,
              name: 'my new tag',
              description: 'some desc',
              color: '#772299',
            },
          });
        });
    });

    it('should return an error with details when validation failed', async () => {
      await supertest
        .post(`/api/saved_objects_tagging/tags/create`)
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
