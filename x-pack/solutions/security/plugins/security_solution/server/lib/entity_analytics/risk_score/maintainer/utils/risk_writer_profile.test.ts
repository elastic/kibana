/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performance } from 'perf_hooks';
import { Client } from '@elastic/elasticsearch';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createRiskWriterProfile } from './risk_writer_profile';

describe('risk writer profile', () => {
  it('separates summed request time from overlapping busy time and isolates stages', () => {
    let now = 0;
    const clock = jest.spyOn(performance, 'now').mockImplementation(() => now);
    const esClient = new Client({ node: 'http://localhost:9220' });
    const logger = loggingSystemMock.createLogger();
    const profile = createRiskWriterProfile({ esClient, logger, stage: 'base', mode: 'stream' });
    const diagnosticResult = (id: string, context = profile.context) => ({
      meta: {
        context,
        request: { id, params: { headers: { 'content-length': '100' } } },
        attempts: 0,
      },
      body: { took: 20, errors: false, items: [{ create: { status: 201 } }] },
    });
    const first = diagnosticResult('first');
    const second = diagnosticResult('second');
    const unrelated = diagnosticResult('other', { riskWriterProfileId: 'another-stage' });
    esClient.diagnostic.emit('serialization', null, unrelated);
    esClient.diagnostic.emit('serialization', null, first);
    now = 10;
    esClient.diagnostic.emit('request', null, first);
    now = 20;
    esClient.diagnostic.emit('serialization', null, second);
    now = 30;
    esClient.diagnostic.emit('request', null, second);
    now = 50;
    esClient.diagnostic.emit('response', null, first);
    now = 80;
    esClient.diagnostic.emit('response', null, second);
    esClient.diagnostic.emit('response', null, unrelated);
    profile.recordDocuments('produced', 2);
    profile.finish();
    const message = logger.info.mock.calls[0][0] as string;
    const summary = JSON.parse(message.split('risk writer profile ')[1]);
    expect(summary).toMatchObject({
      requests: 2,
      incompleteRequests: 0,
      requestWallMs: 110,
      busyMs: 80,
      transportPreparationMs: 20,
      esTookMs: 40,
      bytes: 200,
      successful: 2,
      production: [{ kind: 'produced', docs: 2, atMs: 80 }],
    });
    expect(esClient.diagnostic.listenerCount('serialization')).toBe(0);
    expect(esClient.diagnostic.listenerCount('request')).toBe(0);
    expect(esClient.diagnostic.listenerCount('response')).toBe(0);
    clock.mockRestore();
  });
});
