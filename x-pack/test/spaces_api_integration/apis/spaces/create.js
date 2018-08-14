/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { SPACES } from '../lib/spaces';
import { getUrlPrefix } from '../lib/space_test_utils';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('create', () => {
    const createExpectResult = expectedResult => resp => {
      expect(resp.body).to.eql(expectedResult);
    };

    const expectConflictResponse = resp => {
      const spaceId = 'space_1';
      expect(resp.body).to.only.have.keys(['error', 'message', 'statusCode']);
      expect(resp.body.error).to.equal('Conflict');
      expect(resp.body.statusCode).to.equal(409);
      expect(resp.body.message).to.match(new RegExp(`\\[doc]\\[space:${spaceId}]: version conflict, document already exists.*`));
    };

    const createTest = (description, { currentSpace, tests }) => {
      describe(description, () => {
        before(async () => esArchiver.load(`saved_objects/spaces`));
        after(async () => esArchiver.unload(`saved_objects/spaces`));

        it(`should return ${tests.newSpace.statusCode}`, async () => {
          return supertest
            .post(`${getUrlPrefix(currentSpace.id)}/api/spaces/v1/space`)
            .send(tests.newSpace.space)
            .expect(tests.newSpace.statusCode)
            .then(tests.newSpace.response);
        });

        describe('when it already exists', () => {
          it(`should return ${tests.alreadyExists.statusCode}`, async () => {
            return supertest
              .post(`${getUrlPrefix(currentSpace.id)}/api/spaces/v1/space`)
              .send({
                name: 'space_1',
                id: 'space_1',
                color: '#ffffff',
                description: 'a description',
              })
              .expect(tests.alreadyExists.statusCode)
              .then(tests.alreadyExists.response);
          });
        });

        describe('when _reserved is specified', () => {
          it(`should return ${tests.reservedSpecified.statusCode} and ignore _reserved`, async () => {
            return supertest
              .post(`${getUrlPrefix(currentSpace.id)}/api/spaces/v1/space`)
              .send(tests.reservedSpecified.space)
              .expect(tests.reservedSpecified.statusCode)
              .then(tests.reservedSpecified.response);
          });
        });
      });
    };

    createTest(`from the default space`, {
      currentSpace: SPACES.DEFAULT,
      tests: {
        newSpace: {
          space: {
            name: 'marketing',
            id: 'marketing',
            description: 'a description',
            color: '#5c5959',
          },
          statusCode: 200,
          response: createExpectResult({
            name: 'marketing',
            id: 'marketing',
            description: 'a description',
            color: '#5c5959',
          }),
        },
        alreadyExists: {
          statusCode: 409,
          response: expectConflictResponse,
        },
        reservedSpecified: {
          space: {
            name: 'reserved space',
            id: 'reserved',
            description: 'a description',
            color: '#5c5959',
            _reserved: true,
          },
          statusCode: 200,
          response: createExpectResult({
            name: 'reserved space',
            id: 'reserved',
            description: 'a description',
            color: '#5c5959',
          })
        }
      },
    });

    createTest(`from space_1`, {
      currentSpace: SPACES.SPACE_1,
      tests: {
        newSpace: {
          space: {
            name: 'marketing',
            id: 'marketing',
            description: 'a description',
            color: '#5c5959',
          },
          statusCode: 200,
          response: createExpectResult({
            name: 'marketing',
            id: 'marketing',
            description: 'a description',
            color: '#5c5959',
          }),
        },
        alreadyExists: {
          statusCode: 409,
          response: expectConflictResponse,
        },
        reservedSpecified: {
          space: {
            name: 'reserved space',
            id: 'reserved',
            description: 'a description',
            color: '#5c5959',
            _reserved: true,
          },
          statusCode: 200,
          response: createExpectResult({
            name: 'reserved space',
            id: 'reserved',
            description: 'a description',
            color: '#5c5959',
          })
        },
      },
    });
  });
}
