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

  describe('POST /api/saved_objects_tagging/tags/create', () => {
    beforeEach(async () => {
      await esArchiver.load('functional_base');
    });

    afterEach(async () => {
      await esArchiver.unload('functional_base');
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
          name: 'Inv%li& t@g n*me',
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
                name: 'Tag name can only include a-z, 0-9, _, -,:.',
                color: 'Tag color must be a valid hex color',
              },
            },
          });
        });
    });
  });
}
