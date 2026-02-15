/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import { TIMEOUT_MS } from './constants';

/**
 * Triggers a transform to run immediately.
 * Waits for the transform to exist before scheduling it.
 */
export async function triggerTransform(providerContext: FtrProviderContext, transformId: string) {
  const es = providerContext.getService('es');
  const retry = providerContext.getService('retry');
  const log = providerContext.getService('log');

  // Wait for transform to exist before trying to schedule it
  await retry.waitForWithTimeout(`Transform ${transformId} to exist`, TIMEOUT_MS, async () => {
    try {
      const { count } = await es.transform.getTransformStats({
        transform_id: transformId,
      });
      if (count !== 1) {
        log.debug(`Waiting for transform ${transformId} to exist, count: ${count}`);
        return false;
      }
      log.debug(`Transform ${transformId} exists, ready to schedule`);
      return true;
    } catch (e: any) {
      if (e.message?.includes('resource_not_found_exception')) {
        log.debug(`Transform ${transformId} not found yet, waiting...`);
        return false;
      }
      throw e;
    }
  });

  const { acknowledged } = await es.transform.scheduleNowTransform({
    transform_id: transformId,
  });
  expect(acknowledged).toBe(true);
}
