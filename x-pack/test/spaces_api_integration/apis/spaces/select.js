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

  describe('select', () => {

    const expectDefaultSpaceResponse = (resp) => {
      expect(resp.body).to.eql({
        location: `/app/kibana`
      });
    };

    const createExpectSpaceResponse = (spaceId) => (resp) => {
      expect(resp.body).to.eql({
        location: `/s/${spaceId}/app/kibana`
      });
    };

    const selectTest = (description, { currentSpace, spaceId, tests }) => {
      describe(description, () => {
        before(async () => esArchiver.load(`saved_objects/spaces`));
        after(async () => esArchiver.unload(`saved_objects/spaces`));

        it(`should return ${tests.exists.statusCode}`, async () => {
          return supertest
            .post(`${getUrlPrefix(currentSpace.id)}/api/spaces/v1/space/${spaceId}/select`)
            .expect(tests.exists.statusCode)
            .then(tests.exists.response);
        });
      });
    };

    selectTest(`can select default space from default space`, {
      currentSpace: SPACES.DEFAULT,
      spaceId: SPACES.DEFAULT.spaceId,
      tests: {
        exists: {
          statusCode: 200,
          response: expectDefaultSpaceResponse,
        },
      }
    });

    selectTest(`can select space_1 from the default space`, {
      currentSpace: SPACES.DEFAULT,
      spaceId: SPACES.SPACE_1.spaceId,
      tests: {
        exists: {
          statusCode: 200,
          response: createExpectSpaceResponse(SPACES.SPACE_1.spaceId),
        },
      }
    });

    selectTest(`can access space_2 from space_1`, {
      currentSpace: SPACES.SPACE_1,
      spaceId: SPACES.SPACE_2.spaceId,
      tests: {
        exists: {
          statusCode: 200,
          response: createExpectSpaceResponse(SPACES.SPACE_2.spaceId),
        },
      }
    });
  });
}
