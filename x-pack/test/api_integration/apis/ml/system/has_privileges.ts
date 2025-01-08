/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';
import { getCommonRequestHeader } from '../../../../functional/services/ml/common_api';
import { USER } from '../../../../functional/services/ml/security_common';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  async function runRequest(user: USER, index: any, expectedStatusCode = 200) {
    const { body, status } = await supertest
      .post(`/internal/ml/_has_privileges`)
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(getCommonRequestHeader('1'))
      .send({ index });
    ml.api.assertResponseStatusCode(expectedStatusCode, status, body);

    return body;
  }

  const testData = [
    {
      user: USER.ML_POWERUSER,
      index: [
        {
          names: ['ft_farequote_small'],
          privileges: ['read'],
        },
        {
          names: ['ft_farequote_small'],
          privileges: ['write'],
        },
      ],
      expectedResponse: {
        hasPrivileges: {
          username: 'ft_ml_poweruser',
          has_all_requested: false,
          cluster: {},
          index: {
            ft_farequote_small: {
              read: true,
              write: false,
            },
          },
          application: {},
        },
        upgradeInProgress: false,
      },
      expectedStatusCode: 200,
    },
    {
      user: USER.ML_VIEWER,
      index: [
        {
          names: ['ft_farequote_small'],
          privileges: ['read'],
        },
        {
          names: ['ft_farequote_small'],
          privileges: ['write'],
        },
      ],
      expectedResponse: {
        hasPrivileges: {
          username: 'ft_ml_viewer',
          has_all_requested: false,
          cluster: {},
          index: {
            ft_farequote_small: {
              read: true,
              write: false,
            },
          },
          application: {},
        },
        upgradeInProgress: false,
      },

      expectedStatusCode: 200,
    },
    {
      user: USER.ML_UNAUTHORIZED,
      index: [
        {
          names: ['ft_farequote_small'],
          privileges: ['read'],
        },
        {
          names: ['ft_farequote_small'],
          privileges: ['write'],
        },
      ],
      expectedResponse: {
        statusCode: 403,
        error: 'Forbidden',
      },
      expectedStatusCode: 403,
    },
  ];

  describe("ML's _has_privileges", () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote_small');
    });
    after(async () => {
      await ml.api.setUpgradeMode(false);
    });

    it('should return correct privileges for test data', async () => {
      for (const { user, index, expectedResponse, expectedStatusCode } of testData) {
        const response = await runRequest(user, index, expectedStatusCode);
        expect(response.statusCode).to.eql(
          expectedResponse.statusCode,
          `expected ${JSON.stringify(expectedResponse.statusCode)}, got ${JSON.stringify(
            response.statusCode
          )}`
        );
        expect(response.error).to.eql(
          expectedResponse.error,
          `expected ${JSON.stringify(expectedResponse.error)}, got ${JSON.stringify(
            response.error
          )}`
        );
      }
    });

    it('should return correct upgrade in progress', async () => {
      const index = testData[0].index;
      const expectedResponse = { ...testData[0].expectedResponse, upgradeInProgress: true };
      await ml.api.setUpgradeMode(true);
      await ml.api.assertUpgradeMode(true);

      const response = await runRequest(USER.ML_POWERUSER, index);
      expect(response).to.eql(
        expectedResponse,
        `expected ${JSON.stringify(expectedResponse)}, got ${JSON.stringify(response)}`
      );
    });
  });
};
