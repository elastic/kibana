/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from 'expect';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import { TIMEOUT_MS } from './constants';
import { cleanUpEntityStore } from './teardown';

interface Options {
  extraIndexPatterns: string[];
}

export async function enableEntityStore(
  providerContext: FtrProviderContext,
  { extraIndexPatterns }: Options = { extraIndexPatterns: [] }
): Promise<void> {
  const log = providerContext.getService('log');
  const supertest = providerContext.getService('supertest');
  const retry = providerContext.getService('retry');

  const indexPattern = extraIndexPatterns.join(',');

  const RETRIES = 5;
  let success: boolean = false;
  for (let attempt = 0; attempt < RETRIES; attempt++) {
    const response = await supertest.post('/api/entity_store/enable').set('kbn-xsrf', 'xxxx').send({
      indexPattern,
    });
    expect(response.statusCode).toBe(200);
    expect(response.body.succeeded).toBe(true);

    // and wait for it to start up
    await retry.waitForWithTimeout('Entity Store to initialize', TIMEOUT_MS, async () => {
      const { body } = await supertest
        .get('/api/entity_store/status')
        .query({ include_components: true })
        .expect(200);
      if (body.status === 'error') {
        log.error(`Expected body.status to be 'running', got 'error': ${JSON.stringify(body)}`);
        success = false;
        return true;
      }
      expect(body.status).toBe('running');
      success = true;
      return true;
    });

    if (success) {
      break;
    } else {
      log.info(`Retrying Entity Store setup...`);
      await cleanUpEntityStore(providerContext);
    }
  }
  expect(success).toBe(true);
}
