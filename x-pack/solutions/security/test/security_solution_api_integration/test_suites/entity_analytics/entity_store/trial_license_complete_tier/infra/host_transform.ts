/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { EcsHost } from '@elastic/ecs';
import type { IndexRequest } from '@elastic/elasticsearch/lib/api/types';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import { HOST_TRANSFORM_ID, TIMEOUT_MS } from './constants';
import { triggerTransform } from './transforms';

export function buildHostTransformDocument(
  host: EcsHost & { timestamp?: string },
  dataStream: string
): IndexRequest {
  // If not timestamp provided
  // Get timestamp without the millisecond part
  const isoTimestamp: string = !!host.timestamp
    ? host.timestamp
    : new Date().toISOString().split('.')[0];

  delete host.timestamp;

  const document: IndexRequest = {
    index: dataStream,
    document: {
      '@timestamp': isoTimestamp,
      host,
    },
  };
  return document;
}

export async function createDocumentsAndTriggerTransform(
  providerContext: FtrProviderContext,
  docs: (EcsHost & { timestamp?: string })[],
  dataStream: string
): Promise<void> {
  const es = providerContext.getService('es');
  const retry = providerContext.getService('retry');
  const log = providerContext.getService('log');

  // Wait for the transform to be created - Entity Store may report 'running' before transform exists
  let transform: Awaited<ReturnType<typeof es.transform.getTransformStats>>['transforms'][0];
  let triggerCount: number = 0;
  let docsProcessed: number = 0;

  await retry.waitForWithTimeout(
    `Transform ${HOST_TRANSFORM_ID} to exist`,
    TIMEOUT_MS,
    async () => {
      try {
        const { count, transforms } = await es.transform.getTransformStats({
          transform_id: HOST_TRANSFORM_ID,
        });
        if (count !== 1) {
          log.debug(`Waiting for transform ${HOST_TRANSFORM_ID} to exist, count: ${count}`);
          return false;
        }
        transform = transforms[0];
        triggerCount = transform.stats.trigger_count;
        docsProcessed = transform.stats.documents_processed;
        log.debug(
          `Transform ${HOST_TRANSFORM_ID} found, trigger_count: ${triggerCount}, docs_processed: ${docsProcessed}`
        );
        return true;
      } catch (e: any) {
        if (e.message?.includes('resource_not_found_exception')) {
          log.debug(`Transform ${HOST_TRANSFORM_ID} not found yet, waiting...`);
          return false;
        }
        throw e;
      }
    }
  );

  expect(transform!.id).toBe(HOST_TRANSFORM_ID);

  for (let i = 0; i < docs.length; i++) {
    const { result } = await es.index(buildHostTransformDocument(docs[i], dataStream));
    expect(result).toBe('created');
  }

  // Trigger the transform manually
  await triggerTransform(providerContext, HOST_TRANSFORM_ID);
  await retry.waitForWithTimeout('Transform to run again', TIMEOUT_MS, async () => {
    try {
      const response = await es.transform.getTransformStats({
        transform_id: HOST_TRANSFORM_ID,
      });
      if (!response.transforms[0]) {
        log.debug(`Transform ${HOST_TRANSFORM_ID} not found in stats response, retrying...`);
        return false;
      }
      transform = response.transforms[0];
      if (transform.stats.trigger_count <= triggerCount) {
        log.debug(
          `Transform trigger_count ${transform.stats.trigger_count} not greater than ${triggerCount}, waiting...`
        );
        return false;
      }
      if (transform.stats.documents_processed <= docsProcessed) {
        log.debug(
          `Transform docs_processed ${transform.stats.documents_processed} not greater than ${docsProcessed}, waiting...`
        );
        return false;
      }
      log.debug(
        `Transform completed: trigger_count=${transform.stats.trigger_count}, docs_processed=${transform.stats.documents_processed}`
      );
      return true;
    } catch (e: any) {
      if (e.message?.includes('resource_not_found_exception')) {
        log.debug(`Transform ${HOST_TRANSFORM_ID} not found, retrying...`);
        return false;
      }
      throw e;
    }
  });
}

export interface HostTransformResult {
  host: HostTransformResultHost;
}

export interface HostTransformResultHost {
  name: string;
  domain: string[] | undefined;
  hostname: string[] | undefined;
  id: string[] | undefined;
  os: {
    name: string[] | undefined;
    type: string[] | undefined;
  };
  mac: string[] | undefined;
  architecture: string[] | undefined;
  type: string[] | undefined;
  ip: string[] | undefined;
}
