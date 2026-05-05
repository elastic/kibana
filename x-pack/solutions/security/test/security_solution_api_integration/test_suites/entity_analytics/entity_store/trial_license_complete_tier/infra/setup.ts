/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from 'expect';
import type { EntityType } from '@kbn/security-solution-plugin/common/api/entity_analytics/entity_store/common.gen';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import { TIMEOUT_MS } from './constants';
import { cleanUpEntityStore } from './teardown';

interface Options {
  extraIndexPatterns?: string[];
  /**
   * Specify which entity types to enable.
   * Defaults to ['host'] to avoid task conflicts when enabling multiple engines.
   * Pass ['host', 'user', 'service'] if you need all engines.
   */
  entityTypes?: EntityType[];
}

/**
 * Enables the Entity Store using the standard /api/entity_store/enable endpoint.
 * Uses retry logic with backoff to handle transient task conflicts that can occur
 * when multiple engines initialize concurrently.
 */
export async function enableEntityStore(
  providerContext: FtrProviderContext,
  { extraIndexPatterns = [], entityTypes = ['host'] }: Options = {}
): Promise<void> {
  const log = providerContext.getService('log');
  const supertest = providerContext.getService('supertest');
  const retry = providerContext.getService('retry');

  const indexPattern = extraIndexPatterns.join(',');

  const RETRIES = 5;
  const RETRY_DELAY_MS = 5000;
  let success: boolean = false;

  for (let attempt = 0; attempt < RETRIES; attempt++) {
    log.info(
      `Enabling Entity Store with entityTypes=${entityTypes.join(',')} (attempt ${
        attempt + 1
      }/${RETRIES})...`
    );

    const response = await supertest
      .post('/api/entity_store/enable')
      .set('kbn-xsrf', 'xxxx')
      .send({ indexPattern, entityTypes });

    if (response.statusCode !== 200) {
      log.error(`Enable request failed: ${response.statusCode} - ${JSON.stringify(response.body)}`);
      if (attempt < RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        await cleanUpEntityStore(providerContext);
      }
      continue;
    }

    if (!response.body.succeeded) {
      log.error(`Enable request returned succeeded=false: ${JSON.stringify(response.body)}`);
      if (attempt < RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        await cleanUpEntityStore(providerContext);
      }
      continue;
    }

    // Wait for Entity Store to reach 'running' status
    try {
      await retry.waitForWithTimeout('Entity Store to initialize', TIMEOUT_MS, async () => {
        const { body } = await supertest
          .get('/api/entity_store/status')
          .query({ include_components: true })
          .expect(200);

        if (body.status === 'running') {
          log.info('Entity Store is now running');
          success = true;
          return true;
        }

        if (body.status === 'error') {
          // Check if this is a transient task conflict error
          const errorEngines = body.engines?.filter((e: any) => e.status === 'error') || [];
          const isTaskConflict = errorEngines.some((e: any) =>
            e.error?.message?.includes('currently running')
          );

          if (isTaskConflict) {
            log.warning('Task conflict detected, will retry after cleanup');
            return true; // Exit wait loop to trigger retry
          }

          log.error(`Entity Store is in error state: ${JSON.stringify(body)}`);
          return true; // Exit wait loop to trigger retry
        }

        log.debug(`Entity Store status: ${body.status}, waiting for 'running'...`);
        return false;
      });
    } catch (e: any) {
      log.error(`Wait for Entity Store failed: ${e.message}`);
    }

    if (success) {
      break;
    }

    if (attempt < RETRIES - 1) {
      log.info(`Retrying Entity Store setup after ${RETRY_DELAY_MS}ms delay...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      await cleanUpEntityStore(providerContext);
    }
  }

  expect(success).toBe(true);
}
