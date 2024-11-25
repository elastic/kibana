/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { log, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';

import { APIClientRequestParamsOf } from '@kbn/dataset-quality-plugin/common/rest';
import { LogsSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { RoleCredentials, SupertestWithRoleScopeType } from '../../../services';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const samlAuth = getService('samlAuth');
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');
  const from = '2024-09-20T11:00:00.000Z';
  const to = '2024-09-20T11:01:00.000Z';
  const dataStreamType = 'logs';
  const dataset = 'synth';
  const syntheticsDataset = 'synthetics';
  const namespace = 'default';
  const serviceName = 'my-service';
  const hostName = 'synth-host';
  const dataStreamName = `${dataStreamType}-${dataset}-${namespace}`;
  const syntheticsDataStreamName = `${dataStreamType}-${syntheticsDataset}-${namespace}`;

  const endpoint = 'GET /internal/dataset_quality/data_streams/total_docs';
  type ApiParams = APIClientRequestParamsOf<typeof endpoint>['params']['query'];

  async function callApiAs({
    roleScopedSupertestWithCookieCredentials,
    apiParams: { type, start, end },
  }: {
    roleScopedSupertestWithCookieCredentials: SupertestWithRoleScopeType;
    apiParams: ApiParams;
  }) {
    return roleScopedSupertestWithCookieCredentials
      .get(`/internal/dataset_quality/data_streams/total_docs`)
      .query({
        type,
        start,
        end,
      });
  }

  describe('DataStream total docs', function () {
    let adminRoleAuthc: RoleCredentials;
    let supertestAdminWithCookieCredentials: SupertestWithRoleScopeType;
    let synthtraceLogsEsClient: LogsSynthtraceEsClient;

    before(async () => {
      synthtraceLogsEsClient = await synthtrace.createLogsSynthtraceEsClient();
      adminRoleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
      supertestAdminWithCookieCredentials = await roleScopedSupertest.getSupertestWithRoleScope(
        'admin',
        {
          useCookieHeader: true,
          withInternalHeaders: true,
        }
      );

      await synthtraceLogsEsClient.index([
        timerange(from, to)
          .interval('1m')
          .rate(1)
          .generator((timestamp) => [
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
              }),
            log
              .create()
              .message('This is a log message')
              .timestamp(timestamp)
              .dataset(syntheticsDataset)
              .namespace(namespace)
              .defaults({
                'log.file.path': '/my-service.log',
                'service.name': serviceName,
                'host.name': hostName,
              }),
          ]),
      ]);
    });

    after(async () => {
      await synthtraceLogsEsClient.clean();
      await samlAuth.invalidateM2mApiKeyWithRoleScope(adminRoleAuthc);
    });

    it('returns number of documents per DataStream', async () => {
      const resp = await callApiAs({
        roleScopedSupertestWithCookieCredentials: supertestAdminWithCookieCredentials,
        apiParams: {
          type: dataStreamType,
          start: from,
          end: to,
        },
      });

      expect(resp.body.totalDocs.length).to.be(2);
      expect(resp.body.totalDocs[0].dataset).to.be(dataStreamName);
      expect(resp.body.totalDocs[0].count).to.be(1);
      expect(resp.body.totalDocs[1].dataset).to.be(syntheticsDataStreamName);
      expect(resp.body.totalDocs[1].count).to.be(1);
    });

    it('returns empty when all documents are outside timeRange', async () => {
      const resp = await callApiAs({
        roleScopedSupertestWithCookieCredentials: supertestAdminWithCookieCredentials,
        apiParams: {
          type: dataStreamType,
          start: '2024-09-21T11:00:00.000Z',
          end: '2024-09-21T11:01:00.000Z',
        },
      });

      expect(resp.body.totalDocs.length).to.be(0);
    });
  });
}
