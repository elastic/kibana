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

  const { count, transforms } = await es.transform.getTransformStats({
    transform_id: HOST_TRANSFORM_ID,
  });
  expect(count).toBe(1);
  let transform = transforms[0];
  expect(transform.id).toBe(HOST_TRANSFORM_ID);
  const triggerCount: number = transform.stats.trigger_count;
  const docsProcessed: number = transform.stats.documents_processed;

  for (let i = 0; i < docs.length; i++) {
    const { result } = await es.index(buildHostTransformDocument(docs[i], dataStream));
    expect(result).toBe('created');
  }

  // Trigger the transform manually
  await triggerTransform(providerContext, HOST_TRANSFORM_ID);
  await retry.waitForWithTimeout('Transform to run again', TIMEOUT_MS, async () => {
    const response = await es.transform.getTransformStats({
      transform_id: HOST_TRANSFORM_ID,
    });
    transform = response.transforms[0];
    expect(transform.stats.trigger_count).toBeGreaterThan(triggerCount);
    expect(transform.stats.documents_processed).toBeGreaterThan(docsProcessed);
    return true;
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
