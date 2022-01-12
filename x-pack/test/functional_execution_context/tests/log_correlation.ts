/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';
import { assertLogContains } from '../test_utils';

export default function ({ getService }: FtrProviderContext) {
  const retry = getService('retry');
  const supertest = getService('supertest');

  describe('Log Correlation', () => {
    it('Emits "trace.id" into the logs', async () => {
      const response1 = await supertest.get('/emit_log_with_trace_id');
      expect(response1.status).to.be(200);
      expect(response1.body.traceId).to.be.a('string');

      const response2 = await supertest.get('/emit_log_with_trace_id');
      expect(response2.status).to.be(200);
      expect(response1.body.traceId).to.be.a('string');

      expect(response2.body.traceId).not.to.be(response1.body.traceId);

      let responseTraceId: string | undefined;
      await assertLogContains({
        description: 'traceId included in the http logs',
        predicate: (record) => {
          // we don't check trace.id value since trace.id in the test plugin and Kibana are different on CI.
          // because different 'elastic-apm-node' instaces are imported
          if (
            record.log?.logger === 'http.server.response' &&
            record.url?.path === '/emit_log_with_trace_id'
          ) {
            responseTraceId = record.trace?.id;
            return true;
          }
          return false;
        },
        retry,
      });

      expect(responseTraceId).to.be.a('string');

      await assertLogContains({
        description: 'elasticsearch logs have the same traceId',
        predicate: (record) =>
          Boolean(
            record.log?.logger === 'elasticsearch.query.data' &&
              record.trace?.id === responseTraceId &&
              // esClient.ping() request
              record.message?.includes('HEAD /')
          ),

        retry,
      });
    });
  });
}
