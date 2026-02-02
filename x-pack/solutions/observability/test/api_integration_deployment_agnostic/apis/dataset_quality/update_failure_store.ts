/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { log, timerange } from '@kbn/synthtrace-client';
import expect from '@kbn/expect';
import type { LogsSynthtraceEsClient } from '@kbn/synthtrace';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const synthtrace = getService('synthtrace');
  const roleScopedSupertest = getService('roleScopedSupertest');
  const config = getService('config');
  const isServerless = !!config.get('serverless');
  const start = '2023-12-11T18:00:00.000Z';
  const end = '2023-12-11T18:01:00.000Z';
  const type = 'logs';
  const dataset = 'nginx.access';
  const namespace = 'default';
  const serviceName = 'my-service';
  const hostName = 'synth-host';

  async function callApiAs(
    supertestApi: any,
    ds: string,
    body: {
      failureStoreEnabled: boolean;
      customRetentionPeriod: string | undefined;
    }
  ) {
    return supertestApi
      .put(`/internal/dataset_quality/data_streams/${encodeURIComponent(ds)}/update_failure_store`)
      .send(body);
  }

  describe('updates failure store configuration for data streams', function () {
    let client: LogsSynthtraceEsClient;
    let supertestAdmin: any;

    before(async () => {
      client = synthtrace.createLogsSynthtraceEsClient();
      await client.index([
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

      supertestAdmin = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
        useCookieHeader: true,
        withInternalHeaders: true,
      });
    });

    after(async () => {
      await client.clean();
    });

    it('should enable failure store successfully', async () => {
      const dataStreamName = `${type}-${dataset}-${namespace}`;
      const resp = await callApiAs(supertestAdmin, dataStreamName, {
        failureStoreEnabled: true,
        customRetentionPeriod: undefined,
      });
      expect(resp.status).to.be(200);
      const requestBody = JSON.parse(resp.body.meta.request.params.body);
      expect(requestBody).to.have.property('failure_store');
      expect(requestBody.failure_store).to.have.property('enabled', true);
      expect(requestBody.failure_store).to.have.property('lifecycle');
      expect(requestBody.failure_store.lifecycle).not.to.have.property('data_retention');
    });

    it('should disable failure store successfully', async () => {
      const dataStreamName = `${type}-${dataset}-${namespace}`;
      const resp = await callApiAs(supertestAdmin, dataStreamName, {
        failureStoreEnabled: false,
        customRetentionPeriod: undefined,
      });
      expect(resp.status).to.be(200);
      const requestBody = JSON.parse(resp.body.meta.request.params.body);
      expect(requestBody).to.have.property('failure_store');
      expect(requestBody.failure_store).to.have.property('enabled', false);
      expect(requestBody.failure_store).to.have.property('lifecycle');
      expect(requestBody.failure_store.lifecycle).not.to.have.property('data_retention');
    });

    it('should enable failure store with custom retention period', async () => {
      const dataStreamName = `${type}-${dataset}-${namespace}`;
      const resp = await callApiAs(supertestAdmin, dataStreamName, {
        failureStoreEnabled: true,
        customRetentionPeriod: '30d',
      });
      expect(resp.status).to.be(200);
      const requestBody = JSON.parse(resp.body.meta.request.params.body);
      expect(requestBody).to.have.property('failure_store');
      expect(requestBody.failure_store).to.have.property('enabled', true);
      expect(requestBody.failure_store).to.have.property('lifecycle');
      expect(requestBody.failure_store.lifecycle).to.have.property('data_retention', '30d');
      if (!isServerless) {
        expect(requestBody.failure_store.lifecycle).to.have.property('enabled', true);
      }
    });
  });
}
