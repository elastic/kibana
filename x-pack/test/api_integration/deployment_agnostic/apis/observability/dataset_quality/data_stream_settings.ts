/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { log, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';

import { LogsSynthtraceEsClient } from '@kbn/apm-synthtrace';
import {
  createBackingIndexNameWithoutVersion,
  getDataStreamSettingsOfEarliestIndex,
  rolloverDataStream,
} from './utils/es_utils';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { RoleCredentials, SupertestWithRoleScopeType } from '../../../services';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const samlAuth = getService('samlAuth');
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');
  const esClient = getService('es');
  const packageApi = getService('packageApi');
  const config = getService('config');
  const isServerless = !!config.get('serverless');
  const start = '2024-09-20T11:00:00.000Z';
  const end = '2024-09-20T11:01:00.000Z';
  const type = 'logs';
  const dataset = 'synth';
  const syntheticsDataset = 'synthetics';
  const namespace = 'default';
  const serviceName = 'my-service';
  const hostName = 'synth-host';
  const dataStreamName = `${type}-${dataset}-${namespace}`;
  const syntheticsDataStreamName = `${type}-${syntheticsDataset}-${namespace}`;

  const defaultDataStreamPrivileges = {
    datasetUserPrivileges: { canRead: true, canMonitor: true, canViewIntegrations: true },
  };

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
      `/internal/dataset_quality/data_streams/${dataStream}/settings`
    );
  }

  describe('Dataset quality settings', function () {
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
    });

    after(async () => {
      await samlAuth.invalidateM2mApiKeyWithRoleScope(adminRoleAuthc);
    });

    it('returns only privileges if matching data stream is not available', async () => {
      const nonExistentDataSet = 'Non-existent';
      const nonExistentDataStream = `${type}-${nonExistentDataSet}-${namespace}`;
      const resp = await callApiAs({
        roleScopedSupertestWithCookieCredentials: supertestAdminWithCookieCredentials,
        apiParams: {
          dataStream: nonExistentDataStream,
        },
      });
      expect(resp.body).eql(defaultDataStreamPrivileges);
    });

    describe('gets the data stream settings for non integrations', () => {
      before(async () => {
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

      it('returns "createdOn", "indexTemplate" and "lastBackingIndexName" correctly when available for non integration', async () => {
        const dataStreamSettings = await getDataStreamSettingsOfEarliestIndex(
          esClient,
          dataStreamName
        );
        const resp = await callApiAs({
          roleScopedSupertestWithCookieCredentials: supertestAdminWithCookieCredentials,
          apiParams: {
            dataStream: dataStreamName,
          },
        });

        if (!isServerless) {
          expect(resp.body.createdOn).to.be(Number(dataStreamSettings?.index?.creation_date));
        }
        expect(resp.body.indexTemplate).to.be('logs');
        expect(resp.body.lastBackingIndexName).to.be(
          `${createBackingIndexNameWithoutVersion({
            type,
            dataset,
            namespace,
          })}-000001`
        );
        expect(resp.body.datasetUserPrivileges).to.eql(
          defaultDataStreamPrivileges.datasetUserPrivileges
        );
      });

      it('returns "createdOn", "indexTemplate" and "lastBackingIndexName" correctly for rolled over dataStream', async () => {
        await rolloverDataStream(esClient, dataStreamName);
        const dataStreamSettings = await getDataStreamSettingsOfEarliestIndex(
          esClient,
          dataStreamName
        );
        const resp = await callApiAs({
          roleScopedSupertestWithCookieCredentials: supertestAdminWithCookieCredentials,
          apiParams: {
            dataStream: dataStreamName,
          },
        });

        if (!isServerless) {
          expect(resp.body.createdOn).to.be(Number(dataStreamSettings?.index?.creation_date));
        }
        expect(resp.body.lastBackingIndexName).to.be(
          `${createBackingIndexNameWithoutVersion({ type, dataset, namespace })}-000002`
        );
        expect(resp.body.indexTemplate).to.be('logs');
      });
    });

    describe('gets the data stream settings for integrations', () => {
      before(async () => {
        await packageApi.installPackage({
          roleAuthc: adminRoleAuthc,
          pkg: syntheticsDataset,
        });
        await synthtraceLogsEsClient.index([
          timerange(start, end)
            .interval('1m')
            .rate(1)
            .generator((timestamp) =>
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
                })
            ),
        ]);
      });
      after(async () => {
        await synthtraceLogsEsClient.clean();
        await packageApi.uninstallPackage({
          roleAuthc: adminRoleAuthc,
          pkg: syntheticsDataset,
        });
      });

      it('returns "createdOn", "integration", "indexTemplate" and "lastBackingIndexName" correctly when available for integration', async () => {
        const dataStreamSettings = await getDataStreamSettingsOfEarliestIndex(
          esClient,
          syntheticsDataStreamName
        );
        const resp = await callApiAs({
          roleScopedSupertestWithCookieCredentials: supertestAdminWithCookieCredentials,
          apiParams: {
            dataStream: syntheticsDataStreamName,
          },
        });

        if (!isServerless) {
          expect(resp.body.createdOn).to.be(Number(dataStreamSettings?.index?.creation_date));
        }
        expect(resp.body.indexTemplate).to.be('logs');
        expect(resp.body.lastBackingIndexName).to.be(
          `${createBackingIndexNameWithoutVersion({
            type,
            dataset: syntheticsDataset,
            namespace,
          })}-000001`
        );
        expect(resp.body.datasetUserPrivileges).to.eql(
          defaultDataStreamPrivileges.datasetUserPrivileges
        );
      });

      it('returns "createdOn", "integration", "indexTemplate" and "lastBackingIndexName" correctly for rolled over dataStream', async () => {
        await rolloverDataStream(esClient, syntheticsDataStreamName);
        const dataStreamSettings = await getDataStreamSettingsOfEarliestIndex(
          esClient,
          syntheticsDataStreamName
        );
        const resp = await callApiAs({
          roleScopedSupertestWithCookieCredentials: supertestAdminWithCookieCredentials,
          apiParams: {
            dataStream: syntheticsDataStreamName,
          },
        });

        if (!isServerless) {
          expect(resp.body.createdOn).to.be(Number(dataStreamSettings?.index?.creation_date));
        }
        expect(resp.body.lastBackingIndexName).to.be(
          `${createBackingIndexNameWithoutVersion({
            type,
            dataset: syntheticsDataset,
            namespace,
          })}-000002`
        );
        expect(resp.body.indexTemplate).to.be('logs');
      });
    });
  });
}
