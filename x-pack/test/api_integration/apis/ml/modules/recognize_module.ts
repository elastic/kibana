/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  const testDataList = [
    {
      testTitleSuffix: 'for sample logs dataset',
      sourceDataArchive: 'ml/module_sample_logs',
      indexPattern: 'ft_module_sample_logs',
      user: USER.ML_POWERUSER,
      expected: {
        responseCode: 200,
        moduleIds: ['sample_data_weblogs'],
      },
    },
    {
      testTitleSuffix: 'for apache dataset',
      sourceDataArchive: 'ml/module_apache',
      indexPattern: 'ft_module_apache',
      user: USER.ML_POWERUSER,
      expected: {
        responseCode: 200,
        moduleIds: ['apache_ecs'],
      },
    },
    {
      testTitleSuffix: 'for apm dataset',
      sourceDataArchive: 'ml/module_apm',
      indexPattern: 'ft_module_apm',
      user: USER.ML_POWERUSER,
      expected: {
        responseCode: 200,
        moduleIds: ['apm_jsbase', 'apm_transaction', 'apm_nodejs'],
      },
    },
    {
      testTitleSuffix: 'for logs dataset',
      sourceDataArchive: 'ml/module_logs',
      indexPattern: 'ft_module_logs',
      user: USER.ML_POWERUSER,
      expected: {
        responseCode: 200,
        moduleIds: [], // the logs modules don't define a query and can't be recognized
      },
    },
    {
      testTitleSuffix: 'for nginx dataset',
      sourceDataArchive: 'ml/module_nginx',
      indexPattern: 'ft_module_nginx',
      user: USER.ML_POWERUSER,
      expected: {
        responseCode: 200,
        moduleIds: ['nginx_ecs'],
      },
    },
    {
      testTitleSuffix: 'for sample ecommerce dataset',
      sourceDataArchive: 'ml/module_sample_ecommerce',
      indexPattern: 'ft_module_sample_ecommerce',
      user: USER.ML_POWERUSER,
      expected: {
        responseCode: 200,
        moduleIds: ['sample_data_ecommerce'],
      },
    },
    {
      testTitleSuffix: 'for siem auditbeat dataset',
      sourceDataArchive: 'ml/module_siem_auditbeat',
      indexPattern: 'ft_module_siem_auditbeat',
      user: USER.ML_POWERUSER,
      expected: {
        responseCode: 200,
        moduleIds: ['siem_auditbeat', 'siem_auditbeat_auth'],
      },
    },
    {
      testTitleSuffix: 'for siem packetbeat dataset',
      sourceDataArchive: 'ml/module_siem_packetbeat',
      indexPattern: 'ft_module_siem_packetbeat',
      user: USER.ML_POWERUSER,
      expected: {
        responseCode: 200,
        moduleIds: ['siem_packetbeat'],
      },
    },
    {
      testTitleSuffix: 'for siem winlogbeat dataset',
      sourceDataArchive: 'ml/module_siem_winlogbeat',
      indexPattern: 'ft_module_siem_winlogbeat',
      user: USER.ML_POWERUSER,
      expected: {
        responseCode: 200,
        moduleIds: ['siem_winlogbeat'],
      },
    },
    {
      testTitleSuffix: 'for non existent index pattern',
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
      .set(COMMON_REQUEST_HEADERS)
      .expect(rspCode);

    return body;
  }

  describe('module recognizer', function () {
    before(async () => {
      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    for (const testData of testDataList) {
      describe('lists matching modules', function () {
        before(async () => {
          if (testData.hasOwnProperty('sourceDataArchive')) {
            await esArchiver.loadIfNeeded(testData.sourceDataArchive!);
          }
        });

        it(testData.testTitleSuffix, async () => {
          const rspBody = await executeRecognizeModuleRequest(
            testData.indexPattern,
            testData.user,
            testData.expected.responseCode
          );
          expect(rspBody).to.be.an(Array);

          const responseModuleIds = rspBody.map((module: { id: string }) => module.id).sort();
          expect(responseModuleIds).to.eql(
            testData.expected.moduleIds.sort(),
            `Expected matching module ids for index '${
              testData.indexPattern
            }' to be '${testData.expected.moduleIds.sort()}' (got '${responseModuleIds}')`
          );
        });
      });
    }
  });
};
