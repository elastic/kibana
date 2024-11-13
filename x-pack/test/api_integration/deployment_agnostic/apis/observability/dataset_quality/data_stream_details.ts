/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogsSynthtraceEsClient } from '@kbn/apm-synthtrace';
import expect from '@kbn/expect';
import { log, timerange } from '@kbn/apm-synthtrace-client';

import { SupertestWithRoleScopeType } from '../../../services';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');
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
    let synthtraceLogsEsClient: LogsSynthtraceEsClient;

    before(async () => {
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

    describe('Viewer User', function () {
      let supertestViewerWithCookieCredentials: SupertestWithRoleScopeType;

      before(async () => {
        supertestViewerWithCookieCredentials = await roleScopedSupertest.getSupertestWithRoleScope(
          'viewer',
          {
            useCookieHeader: true,
            withInternalHeaders: true,
          }
        );
      });

      it('returns lastActivity as undefined when user does not have access to the data stream', async () => {
        const resp = await callApiAs(
          supertestViewerWithCookieCredentials,
          `${type}-${dataset}-${namespace}`
        );
        expect(resp.body.lastActivity).to.be(undefined);

        // userPrivileges.canMonitor should be false for readUser
        expect(resp.body.userPrivileges?.canMonitor).to.be(false);
      });
    });

    describe('Editor User', function () {
      let supertestEditorWithCookieCredentials: SupertestWithRoleScopeType;

      before(async () => {
        supertestEditorWithCookieCredentials = await roleScopedSupertest.getSupertestWithRoleScope(
          'editor',
          {
            useCookieHeader: true,
            withInternalHeaders: true,
          }
        );
      });

      it('returns error when dataStream param is not provided', async () => {
        const expectedMessage = 'Data Stream name cannot be empty';
        const resp = await callApiAs(supertestEditorWithCookieCredentials, encodeURIComponent(' '));
        expect(resp.status).to.be(400);
        expect(resp.body.message.indexOf(expectedMessage)).to.greaterThan(-1);
      });

      it('returns {} if matching data stream is not available', async () => {
        const nonExistentDataSet = 'Non-existent';
        const nonExistentDataStream = `${type}-${nonExistentDataSet}-${namespace}`;
        const resp = await callApiAs(supertestEditorWithCookieCredentials, nonExistentDataStream);
        expect(resp.body).empty();
      });

      it('returns service.name and host.name correctly', async () => {
        const resp = await callApiAs(
          supertestEditorWithCookieCredentials,
          `${type}-${dataset}-${namespace}`
        );
        expect(resp.body.services).to.eql({ ['service.name']: [serviceName] });
        expect(resp.body.hosts?.['host.name']).to.eql([hostName]);
      });
    });
  });
}
