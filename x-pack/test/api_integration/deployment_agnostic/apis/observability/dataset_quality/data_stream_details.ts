/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { log, timerange } from '@kbn/apm-synthtrace-client';

import { SupertestWithRoleScopeType } from '../../../services';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import {
  DatasetQualitySupertestUser,
  getDatasetQualityMonitorSupertestUser,
  getDatasetQualityReadSupertestUser,
} from './utils';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const synthtrace = getService('logsSynthtraceEsClient');
  const start = '2023-12-11T18:00:00.000Z';
  const end = '2023-12-11T18:01:00.000Z';
  const type = 'logs';
  const dataset = 'nginx.access';
  const namespace = 'default';
  const serviceName = 'my-service';
  const hostName = 'synth-host';

  async function callApiAs(
    roleScopedSupertestWithCookieCredentials: SupertestWithRoleScopeType,
    dataStream: string
  ) {
    return roleScopedSupertestWithCookieCredentials
      .get(`/internal/dataset_quality/data_streams/${dataStream}/details`)
      .query({
        start,
        end,
      });
  }

  describe('DataStream Details', function () {
    before(async () => {
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

    after(async () => {
      await synthtrace.clean();
    });

    describe('viewerUser', function () {
      let supertestDatasetQualityReadUser: DatasetQualitySupertestUser;

      before(async () => {
        supertestDatasetQualityReadUser = await getDatasetQualityReadSupertestUser({
          getService,
        });
      });

      after(async () => {
        await supertestDatasetQualityReadUser.clean();
      });

      it('returns lastActivity as undefined when user does not have access to the data stream', async () => {
        const resp = await callApiAs(
          supertestDatasetQualityReadUser.user,
          `${type}-${dataset}-${namespace}`
        );
        expect(resp.body.lastActivity).to.be(undefined);

        // userPrivileges.canMonitor should be false for readUser
        expect(resp.body.userPrivileges?.canMonitor).to.be(false);
      });
    });

    describe('datasetQualityMonitorUser', function () {
      let supertestDatasetQualityMonitorUser: DatasetQualitySupertestUser;

      before(async () => {
        supertestDatasetQualityMonitorUser = await getDatasetQualityMonitorSupertestUser({
          getService,
        });
      });

      after(async () => {
        await supertestDatasetQualityMonitorUser.clean();
      });

      it('returns error when dataStream param is not provided', async () => {
        const expectedMessage = 'Data Stream name cannot be empty';
        const resp = await callApiAs(
          supertestDatasetQualityMonitorUser.user,
          encodeURIComponent(' ')
        );
        expect(resp.status).to.be(400);
        expect(resp.body.message.indexOf(expectedMessage)).to.greaterThan(-1);
      });

      it('returns {} if matching data stream is not available', async () => {
        const nonExistentDataSet = 'Non-existent';
        const nonExistentDataStream = `${type}-${nonExistentDataSet}-${namespace}`;
        const resp = await callApiAs(
          supertestDatasetQualityMonitorUser.user,
          nonExistentDataStream
        );
        expect(resp.body).empty();
      });

      it('returns service.name and host.name correctly', async () => {
        const resp = await callApiAs(
          supertestDatasetQualityMonitorUser.user,
          `${type}-${dataset}-${namespace}`
        );
        expect(resp.body.services).to.eql({ ['service.name']: [serviceName] });
        expect(resp.body.hosts?.['host.name']).to.eql([hostName]);
      });
    });
  });
}
