/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';
import { USER } from '../../../functional/services/machine_learning/security_common';

const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
};

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  const testDataList = [
    {
      testTitleSuffix: 'for sample logs dataset',
      sourceDataArchive: 'ml/sample_logs',
      indexPattern: 'kibana_sample_data_logs',
      user: USER.ML_POWERUSER,
      expected: {
        responseCode: 200,
        moduleIds: ['sample_data_weblogs'],
      },
    },
    {
      testTitleSuffix: 'for non existent index pattern',
      sourceDataArchive: 'empty_kibana',
      indexPattern: 'non-existent-index-pattern',
      user: USER.ML_POWERUSER,
      expected: {
        responseCode: 200,
        moduleIds: [],
      },
    },
  ];

  async function executeRecognizeModuleRequest(indexPattern: string, user: USER, rspCode: number) {
    const { body } = await supertest
      .get(`/api/ml/modules/recognize/${indexPattern}`)
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(COMMON_HEADERS)
      .expect(rspCode);

    return body;
  }

  describe('module recognizer', function() {
    for (const testData of testDataList) {
      describe('lists matching modules', function() {
        before(async () => {
          await esArchiver.load(testData.sourceDataArchive);
        });

        after(async () => {
          await esArchiver.unload(testData.sourceDataArchive);
        });

        it(testData.testTitleSuffix, async () => {
          const rspBody = await executeRecognizeModuleRequest(
            testData.indexPattern,
            testData.user,
            testData.expected.responseCode
          );
          expect(rspBody).to.be.an(Array);

          const responseModuleIds = rspBody.map((module: { id: string }) => module.id);
          expect(responseModuleIds).to.eql(testData.expected.moduleIds);
        });
      });
    }
  });
};
