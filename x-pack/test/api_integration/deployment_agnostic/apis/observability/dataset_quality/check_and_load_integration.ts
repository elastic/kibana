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
import { RoleCredentials, SupertestWithRoleScopeType } from '../../../services';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const samlAuth = getService('samlAuth');
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');
  const packageApi = getService('packageApi');
  const start = '2024-11-04T11:00:00.000Z';
  const end = '2024-11-04T11:01:00.000Z';
  const type = 'logs';
  const dataset = 'synth';
  const nginxDataset = 'nginx.access';
  const apmDataset = 'apm.app.test';
  const namespace = 'default';
  const serviceName = 'my-service';
  const hostName = 'synth-host';
  const dataStreamName = `${type}-${dataset}-${namespace}`;
  const nginxDataStreamName = `${type}-${nginxDataset}-${namespace}`;
  const apmAppDataStreamName = `${type}-${apmDataset}-${namespace}`;

  const pkg = 'nginx';

  async function callApiAs({
    roleScopedSupertestWithCookieCredentials,
    apiParams: { dataStream },
  }: {
    roleScopedSupertestWithCookieCredentials: SupertestWithRoleScopeType;
    apiParams: {
      dataStream: string;
    };
  }) {
    return roleScopedSupertestWithCookieCredentials.get(
      `/internal/dataset_quality/data_streams/${dataStream}/integration/check`
    );
  }

  describe('Check and load integrations', function () {
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
      // Install nginx package
      await packageApi.installPackage({
        roleAuthc: adminRoleAuthc,
        pkg,
      });

      await synthtraceLogsEsClient.index([
        // Ingest degraded data in Nginx data stream
        timerange(start, end)
          .interval('1m')
          .rate(1)
          .generator((timestamp) =>
            log
              .create()
              .message('This is a log message')
              .timestamp(timestamp)
              .dataset(nginxDataset)
              .namespace(namespace)
              .defaults({
                'log.file.path': '/my-service.log',
                'service.name': serviceName,
                'host.name': hostName,
              })
          ),
        // ingest data in apm app data stream
        timerange(start, end)
          .interval('1m')
          .rate(1)
          .generator((timestamp) =>
            log
              .create()
              .message('This is a log message')
              .timestamp(timestamp)
              .dataset(apmDataset)
              .namespace(namespace)
              .defaults({
                'log.file.path': '/my-service.log',
                'service.name': serviceName,
                'host.name': hostName,
              })
          ),

        // Ingest data in regular datastream which is not an integration
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
      await packageApi.uninstallPackage({
        roleAuthc: adminRoleAuthc,
        pkg,
      });
      await samlAuth.invalidateM2mApiKeyWithRoleScope(adminRoleAuthc);
    });

    describe('returns integration status', () => {
      it('returns integration as false for regular data stream', async () => {
        const resp = await callApiAs({
          roleScopedSupertestWithCookieCredentials: supertestAdminWithCookieCredentials,
          apiParams: {
            dataStream: dataStreamName,
          },
        });

        expect(resp.body.isIntegration).to.be(false);
        expect(resp.body.areAssetsAvailable).to.be(false);
      });

      it('returns integration as true for nginx data stream as we installed the integration', async () => {
        const resp = await callApiAs({
          roleScopedSupertestWithCookieCredentials: supertestAdminWithCookieCredentials,
          apiParams: {
            dataStream: nginxDataStreamName,
          },
        });

        expect(resp.body.isIntegration).to.be(true);
        expect(resp.body.areAssetsAvailable).to.be(true);
        expect(resp.body.integration.name).to.be(pkg);
        expect(resp.body.integration.datasets[nginxDataset]).to.be.a('string');
      });

      it('returns integration as false but assets are available for apm.app data stream as its preinstalled', async () => {
        const resp = await callApiAs({
          roleScopedSupertestWithCookieCredentials: supertestAdminWithCookieCredentials,
          apiParams: {
            dataStream: apmAppDataStreamName,
          },
        });

        expect(resp.body.isIntegration).to.be(false);
        expect(resp.body.areAssetsAvailable).to.be(true);
      });
    });
  });
}
