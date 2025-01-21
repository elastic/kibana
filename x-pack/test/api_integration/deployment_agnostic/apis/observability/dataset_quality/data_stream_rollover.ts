/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { log, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';

import { LogsSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { SupertestWithRoleScopeType } from '../../../services';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');
  const start = '2024-10-17T11:00:00.000Z';
  const end = '2024-10-17T11:01:00.000Z';
  const type = 'logs';
  const dataset = 'synth';
  const namespace = 'default';
  const serviceName = 'my-service';
  const hostName = 'synth-host';
  const dataStreamName = `${type}-${dataset}-${namespace}`;

  async function callApiAs({
    roleScopedSupertestWithCookieCredentials,
    apiParams: { dataStream },
  }: {
    roleScopedSupertestWithCookieCredentials: SupertestWithRoleScopeType;
    apiParams: {
      dataStream: string;
    };
  }) {
    return roleScopedSupertestWithCookieCredentials.post(
      `/internal/dataset_quality/data_streams/${dataStream}/rollover`
    );
  }

  describe('Datastream Rollover', function () {
    let supertestAdminWithCookieCredentials: SupertestWithRoleScopeType;
    let synthtraceLogsEsClient: LogsSynthtraceEsClient;

    before(async () => {
      supertestAdminWithCookieCredentials = await roleScopedSupertest.getSupertestWithRoleScope(
        'admin',
        {
          useCookieHeader: true,
          withInternalHeaders: true,
        }
      );

      synthtraceLogsEsClient = await synthtrace.createLogsSynthtraceEsClient();
      await synthtraceLogsEsClient.index([
        timerange(start, end)
          .interval('1m')
          .rate(1)
          .generator((timestamp) =>
            log
              .create()
              .message('This is a log message')
              .timestamp(timestamp)
              .dataset(dataset)
              .namespace(namespace)
              .defaults({
                'log.file.path': '/my-service.log',
                'service.name': serviceName,
                'host.name': hostName,
              })
          ),
      ]);
    });

    after(async () => {
      await synthtraceLogsEsClient.clean();
    });

    it('returns acknowledged when rollover is successful', async () => {
      const resp = await callApiAs({
        roleScopedSupertestWithCookieCredentials: supertestAdminWithCookieCredentials,
        apiParams: {
          dataStream: dataStreamName,
        },
      });

      expect(resp.body.acknowledged).to.be(true);
    });
  });
}
