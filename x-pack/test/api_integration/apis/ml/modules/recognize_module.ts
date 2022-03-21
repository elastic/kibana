/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  const testDataList = [
    {
      testTitleSuffix: 'for sample logs dataset',
      sourceDataArchive: 'x-pack/test/functional/es_archives/ml/module_sample_logs',
      indexPattern: 'ft_module_sample_logs',
      user: USER.ML_POWERUSER,
      expected: {
        responseCode: 200,
        moduleIds: ['sample_data_weblogs'],
      },
    },
    {
      testTitleSuffix: 'for apache dataset',
      sourceDataArchive: 'x-pack/test/functional/es_archives/ml/module_apache',
      indexPattern: 'ft_module_apache',
      user: USER.ML_POWERUSER,
      expected: {
        responseCode: 200,
        moduleIds: ['apache_ecs'],
      },
    },
    {
      testTitleSuffix: 'for logs dataset',
      sourceDataArchive: 'x-pack/test/functional/es_archives/ml/module_logs',
      indexPattern: 'ft_module_logs',
      user: USER.ML_POWERUSER,
      expected: {
        responseCode: 200,
        moduleIds: [], // the logs modules don't define a query and can't be recognized
      },
    },
    {
      testTitleSuffix: 'for nginx dataset',
      sourceDataArchive: 'x-pack/test/functional/es_archives/ml/module_nginx',
      indexPattern: 'ft_module_nginx',
      user: USER.ML_POWERUSER,
      expected: {
        responseCode: 200,
        moduleIds: ['nginx_ecs'],
      },
    },
    {
      testTitleSuffix: 'for sample ecommerce dataset',
      sourceDataArchive: 'x-pack/test/functional/es_archives/ml/module_sample_ecommerce',
      indexPattern: 'ft_module_sample_ecommerce',
      user: USER.ML_POWERUSER,
      expected: {
        responseCode: 200,
        moduleIds: ['sample_data_ecommerce'],
      },
    },
    {
      testTitleSuffix: 'for siem auditbeat dataset',
      sourceDataArchive: 'x-pack/test/functional/es_archives/ml/module_siem_auditbeat',
      indexPattern: 'ft_module_siem_auditbeat',
      user: USER.ML_POWERUSER,
      expected: {
        responseCode: 200,
        moduleIds: ['security_auth'],
      },
    },
    {
      testTitleSuffix: 'for siem packetbeat dataset',
      sourceDataArchive: 'x-pack/test/functional/es_archives/ml/module_siem_packetbeat',
      indexPattern: 'ft_module_siem_packetbeat',
      user: USER.ML_POWERUSER,
      expected: {
        responseCode: 200,
        moduleIds: ['siem_packetbeat'],
      },
    },
    {
      testTitleSuffix: 'for siem winlogbeat dataset',
      sourceDataArchive: 'x-pack/test/functional/es_archives/ml/module_siem_winlogbeat',
      indexPattern: 'ft_module_siem_winlogbeat',
      user: USER.ML_POWERUSER,
      expected: {
        responseCode: 200,
        moduleIds: [
          'security_auth',
          'security_network',
          'security_windows_v3,',
        ],
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
    {
      testTitleSuffix: 'for heartbeat dataset',
      sourceDataArchive: 'x-pack/test/functional/es_archives/ml/module_heartbeat',
      indexPattern: 'ft_module_heartbeat',
      user: USER.ML_POWERUSER,
      expected: {
        responseCode: 200,
        moduleIds: ['uptime_heartbeat'],
      },
    },
    {
      testTitleSuffix: 'for auditbeat dataset',
      sourceDataArchive: 'x-pack/test/functional/es_archives/ml/module_auditbeat',
      indexPattern: 'ft_module_auditbeat',
      user: USER.ML_POWERUSER,
      expected: {
        responseCode: 200,
        moduleIds: ['security_linux_v3'],
      },
    },
    {
      testTitleSuffix: 'for security endpoint dataset',
      sourceDataArchive: 'x-pack/test/functional/es_archives/ml/module_security_endpoint',
      indexPattern: 'ft_logs-endpoint.events.*',
      user: USER.ML_POWERUSER,
      expected: {
        responseCode: 200,
        moduleIds: ['security_auth', 'security_linux_v3', 'security_network', 'security_windows_v3,'],
      },
    },
    {
      testTitleSuffix: 'for metricbeat dataset',
      sourceDataArchive: 'x-pack/test/functional/es_archives/ml/module_metricbeat',
      indexPattern: 'ft_module_metricbeat',
      user: USER.ML_POWERUSER,
      expected: {
        responseCode: 200,
        moduleIds: ['metricbeat_system_ecs', 'security_linux_v3'],
      },
    },
    {
      testTitleSuffix: 'for siem clodutrail dataset',
      sourceDataArchive: 'x-pack/test/functional/es_archives/ml/module_siem_cloudtrail',
      indexPattern: 'ft_module_siem_cloudtrail',
      user: USER.ML_POWERUSER,
      expected: {
        responseCode: 200,
        moduleIds: ['siem_cloudtrail'],
      },
    },
    {
      testTitleSuffix: 'for metrics ui dataset',
      sourceDataArchive: 'x-pack/test/functional/es_archives/ml/module_metrics_ui',
      indexPattern: 'ft_module_metrics_ui',
      user: USER.ML_POWERUSER,
      expected: {
        responseCode: 200,
        moduleIds: ['security_linux_v3'], // the metrics ui modules don't define a query and can't be recognized
      },
    },
    {
      testTitleSuffix: 'for apache data stream dataset',
      sourceDataArchive: 'x-pack/test/functional/es_archives/ml/module_apache_data_stream',
      indexPattern: 'ft_module_apache_data_stream',
      user: USER.ML_POWERUSER,
      expected: {
        responseCode: 200,
        moduleIds: ['apache_data_stream'],
      },
    },
    {
      testTitleSuffix: 'for nginx data stream dataset',
      sourceDataArchive: 'x-pack/test/functional/es_archives/ml/module_nginx_data_stream',
      indexPattern: 'ft_module_nginx_data_stream',
      user: USER.ML_POWERUSER,
      expected: {
        responseCode: 200,
        moduleIds: ['nginx_data_stream'],
      },
    },
    {
      testTitleSuffix: 'for apm transaction dataset',
      sourceDataArchive: 'x-pack/test/functional/es_archives/ml/module_apm_transaction',
      indexPattern: 'ft_module_apm_transaction',
      user: USER.ML_POWERUSER,
      expected: {
        responseCode: 200,
        moduleIds: ['apm_transaction'],
      },
    },
  ];

  async function executeRecognizeModuleRequest(indexPattern: string, user: USER, rspCode: number) {
    const { body, status } = await supertest
      .get(`/api/ml/modules/recognize/${indexPattern}`)
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(COMMON_REQUEST_HEADERS);
    ml.api.assertResponseStatusCode(rspCode, status, body);

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
