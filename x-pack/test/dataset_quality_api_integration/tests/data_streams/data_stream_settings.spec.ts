/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { log, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import { DatasetQualityApiClientKey } from '../../common/config';
import { DatasetQualityApiError } from '../../common/dataset_quality_api_supertest';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  expectToReject,
  getDataStreamSettingsOfEarliestIndex,
  rolloverDataStream,
} from '../../utils';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const synthtrace = getService('logSynthtraceEsClient');
  const esClient = getService('es');
  const datasetQualityApiClient = getService('datasetQualityApiClient');
  const pkgService = getService('packageService');
  const start = '2023-12-11T18:00:00.000Z';
  const end = '2023-12-11T18:01:00.000Z';
  const type = 'logs';
  const dataset = 'synth.1';
  const integrationDataset = 'apache.access';
  const namespace = 'default';
  const serviceName = 'my-service';
  const hostName = 'synth-host';
  const pkg = {
    name: 'apache',
    version: '1.14.0',
  };

  const defaultDataStreamPrivileges = {
    datasetUserPrivileges: { canRead: true, canMonitor: true, canViewIntegrations: true },
  };

  async function callApiAs(user: DatasetQualityApiClientKey, dataStream: string) {
    return await datasetQualityApiClient[user]({
      endpoint: 'GET /internal/dataset_quality/data_streams/{dataStream}/settings',
      params: {
        path: {
          dataStream,
        },
      },
    });
  }

  registry.when('DataStream Settings', { config: 'basic' }, () => {
    describe('gets the data stream settings', () => {
      before(async () => {
        // Install Integration and ingest logs for it
        await pkgService.installPackage(pkg);
        await synthtrace.index([
          timerange(start, end)
            .interval('1m')
            .rate(1)
            .generator((timestamp) =>
              log
                .create()
                .message('This is a log message')
                .timestamp(timestamp)
                .dataset(integrationDataset)
                .namespace(namespace)
                .defaults({
                  'log.file.path': '/my-service.log',
                  'service.name': serviceName,
                  'host.name': hostName,
                })
            ),
        ]);
        // Ingest basic logs
        await synthtrace.index([
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

      it('returns error when dataStream param is not provided', async () => {
        const expectedMessage = 'Data Stream name cannot be empty';
        const err = await expectToReject<DatasetQualityApiError>(() =>
          callApiAs('datasetQualityMonitorUser', encodeURIComponent(' '))
        );
        expect(err.res.status).to.be(400);
        expect(err.res.body.message.indexOf(expectedMessage)).to.greaterThan(-1);
      });

      it('returns only privileges if matching data stream is not available', async () => {
        const nonExistentDataSet = 'Non-existent';
        const nonExistentDataStream = `${type}-${nonExistentDataSet}-${namespace}`;
        const resp = await callApiAs('datasetQualityMonitorUser', nonExistentDataStream);
        expect(resp.body).eql(defaultDataStreamPrivileges);
      });

      it('returns "createdOn" correctly', async () => {
        const dataStreamSettings = await getDataStreamSettingsOfEarliestIndex(
          esClient,
          `${type}-${dataset}-${namespace}`
        );
        const resp = await callApiAs(
          'datasetQualityMonitorUser',
          `${type}-${dataset}-${namespace}`
        );
        expect(resp.body.createdOn).to.be(Number(dataStreamSettings?.index?.creation_date));
      });

      it('returns "createdOn" correctly for rolled over dataStream', async () => {
        await rolloverDataStream(esClient, `${type}-${dataset}-${namespace}`);
        const dataStreamSettings = await getDataStreamSettingsOfEarliestIndex(
          esClient,
          `${type}-${dataset}-${namespace}`
        );
        const resp = await callApiAs(
          'datasetQualityMonitorUser',
          `${type}-${dataset}-${namespace}`
        );
        expect(resp.body.createdOn).to.be(Number(dataStreamSettings?.index?.creation_date));
      });

      it('returns "createdOn" and "integration" correctly when available', async () => {
        const dataStreamSettings = await getDataStreamSettingsOfEarliestIndex(
          esClient,
          `${type}-${integrationDataset}-${namespace}`
        );
        const resp = await callApiAs(
          'datasetQualityMonitorUser',
          `${type}-${integrationDataset}-${namespace}`
        );
        expect(resp.body.createdOn).to.be(Number(dataStreamSettings?.index?.creation_date));
        expect(resp.body.integration).to.be('apache');
        expect(resp.body.datasetUserPrivileges).to.eql(
          defaultDataStreamPrivileges.datasetUserPrivileges
        );
      });

      after(async () => {
        await synthtrace.clean();
        await pkgService.uninstallPackage(pkg);
      });
    });
  });
}
