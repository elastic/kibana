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
      expect(response1.body.traceId).to.be.a('string');

      const response2 = await supertest.get('/emit_log_with_trace_id');
      expect(response1.body.traceId).to.be.a('string');

      expect(response2.body.traceId).not.to.be(response1.body.traceId);

      await assertLogContains({
        description: `traceId ${response1.body.traceId} included in the Kibana logs`,
        predicate: (record) => record.trace?.id === response1.body.traceId,
        retry,
      });
    });
  });
}
