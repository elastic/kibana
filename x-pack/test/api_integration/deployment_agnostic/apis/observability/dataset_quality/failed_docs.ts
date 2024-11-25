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
import { merge } from 'lodash';
import rison from '@kbn/rison';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { RoleCredentials, SupertestWithRoleScopeType } from '../../../services';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const samlAuth = getService('samlAuth');
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');
  const retry = getService('retry');
  const from = '2024-09-20T11:00:00.000Z';
  const to = '2024-09-20T11:01:00.000Z';
  const dataStreamType = 'logs';
  const dataset = 'synth';
  const syntheticsDataset = 'synthetics';
  const namespace = 'default';
  const serviceName = 'my-service';
  const hostName = 'synth-host';
  const syntheticsDataStreamName = `${dataStreamType}-${syntheticsDataset}-${namespace}`;

  const endpoint = 'GET /internal/dataset_quality/data_streams/failed_docs';
  type ApiParams = APIClientRequestParamsOf<typeof endpoint>['params']['query'];
  type DataStreamType = ApiParams['types'][0];

  const processors = [
    {
      script: {
        tag: 'normalize log level',
        lang: 'painless',
        source: `
          String level = ctx['log.level'];
          if ('0'.equals(level)) {
            ctx['log.level'] = 'info';
          } else if ('1'.equals(level)) {
            ctx['log.level'] = 'debug';
          } else if ('2'.equals(level)) {
            ctx['log.level'] = 'warning';
          } else if ('3'.equals(level)) {
            ctx['log.level'] = 'error';
          } else {
            throw new Exception("Not a valid log level");
          }
        `,
      },
    },
  ];

  async function callApiAs({
    roleScopedSupertestWithCookieCredentials,
    apiParams: { types = rison.encodeArray(['logs']), start, end },
  }: {
    roleScopedSupertestWithCookieCredentials: SupertestWithRoleScopeType;
    apiParams: Omit<ApiParams, 'types'> & { types?: DataStreamType[] };
  }) {
    return roleScopedSupertestWithCookieCredentials
      .get(`/internal/dataset_quality/data_streams/failed_docs`)
      .query({
        types,
        start,
        end,
      });
  }

  describe('DataStream failed docs', function () {
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

      await synthtraceLogsEsClient.createCustomPipeline(processors);
      await synthtraceLogsEsClient.updateIndexTemplate('logs', (template) => {
        const next = {
          name: 'logs',
          data_stream: {
            failure_store: true,
          },
        };

        return merge({}, template, next);
      });
      await synthtraceLogsEsClient.index([
        timerange(from, to)
          .interval('1m')
          .rate(1)
          .generator((timestamp) => [
            log
              .create()
              .message('This is a log message')
              .timestamp(timestamp)
              .dataset(syntheticsDataset)
              .namespace(namespace)
              .logLevel('5')
              .defaults({
                'log.file.path': '/my-service.log',
                'service.name': serviceName,
                'host.name': hostName,
              }),
            log
              .create()
              .message('This is a log message')
              .timestamp(timestamp)
              .dataset(dataset)
              .namespace(namespace)
              .logLevel('0')
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

    it('returns number of failed documents per DataStream', async () => {
      await retry.tryForTime(180 * 1000, async () => {
        const resp = await callApiAs({
          roleScopedSupertestWithCookieCredentials: supertestAdminWithCookieCredentials,
          apiParams: {
            start: from,
            end: new Date().toISOString(),
          },
        });

        expect(resp.body.failedDocs.length).to.be(1);
        expect(resp.body.failedDocs[0].dataset).to.be(syntheticsDataStreamName);
        expect(resp.body.failedDocs[0].count).to.be(1);
      });
    });

    it('returns empty when all documents are outside timeRange', async () => {
      const resp = await callApiAs({
        roleScopedSupertestWithCookieCredentials: supertestAdminWithCookieCredentials,
        apiParams: {
          start: '2024-09-21T11:00:00.000Z',
          end: '2024-09-21T11:01:00.000Z',
        },
      });

      expect(resp.body.failedDocs.length).to.be(0);
    });
  });
}
