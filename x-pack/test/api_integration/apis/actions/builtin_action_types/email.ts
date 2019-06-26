/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { KibanaFunctionalTestDefaultProviders } from '../../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default function emailTest({ getService }: KibanaFunctionalTestDefaultProviders) {
  const supertest = getService('supertest');

  describe('create email action', () => {
    it('should return 200 when creating an email action successfully', async () => {
      await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'foo')
        .send({
          attributes: {
            description: 'An email action',
            actionTypeId: '.email',
            actionTypeConfig: {
              service: 'gmail',
              user: 'bob',
              password: 'supersecret',
              from: 'bob@example.com',
            },
          },
        })
        .expect(200)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            type: 'action',
            id: resp.body.id,
            attributes: {
              description: 'An email action',
              actionTypeId: '.email',
              actionTypeConfig: {
                from: 'bob@example.com',
                service: 'gmail',
                user: 'bob',
              },
            },
            references: [],
            updated_at: resp.body.updated_at,
            version: resp.body.version,
          });
          expect(typeof resp.body.id).to.be('string');
        });
    });

    it('should respond with a 400 Bad Request when creating an email action with an invalid config', async () => {
      await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'foo')
        .send({
          attributes: {
            description: 'An email action',
            actionTypeId: '.email',
            actionTypeConfig: {},
          },
        })
        .expect(400)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message:
              'The actionTypeConfig is invalid: [user]: expected value of type [string] but got [undefined]',
          });
        });
    });
  });

  // TODO: once we have the HTTP API fire action, test that with a webhook url pointing
  // back to the Kibana server
}
