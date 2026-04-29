/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { EcsUser } from '@elastic/ecs';
import type { IndexRequest } from '@elastic/elasticsearch/lib/api/types';
import type { EntityField } from '@kbn/security-solution-plugin/common/api/entity_analytics';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import { TIMEOUT_MS, USER_TRANSFORM_ID } from './constants';
import { triggerTransform } from './transforms';

function buildUserTransformDocument(
  doc: EntityStoreSourceDocument,
  dataStream: string
): IndexRequest {
  // If not timestamp provided
  // Get timestamp without the millisecond part
  const isoTimestamp: string = new Date().toISOString().split('.')[0];

  const document: IndexRequest = {
    index: dataStream,
    document: {
      '@timestamp': isoTimestamp,
      ...doc,
    },
  };
  return document;
}

export async function createDocumentsAndTriggerTransform(
  providerContext: FtrProviderContext,
  docs: EntityStoreSourceDocument[],
  dataStream: string
): Promise<void> {
  const retry = providerContext.getService('retry');
  const es = providerContext.getService('es');

  const { count, transforms } = await es.transform.getTransformStats({
    transform_id: USER_TRANSFORM_ID,
  });
  expect(count).toBe(1);
  let transform = transforms[0];
  expect(transform.id).toBe(USER_TRANSFORM_ID);
  const triggerCount: number = transform.stats.trigger_count;
  const docsProcessed: number = transform.stats.documents_processed;

  for (let i = 0; i < docs.length; i++) {
    const { result } = await es.index(buildUserTransformDocument(docs[i], dataStream));
    expect(result).toBe('created');
  }

  // Trigger the transform manually
  await triggerTransform(providerContext, USER_TRANSFORM_ID);
  await retry.waitForWithTimeout('Transform to run again', TIMEOUT_MS, async () => {
    const response = await es.transform.getTransformStats({
      transform_id: USER_TRANSFORM_ID,
    });
    transform = response.transforms[0];
    expect(transform.stats.trigger_count).toBeGreaterThan(triggerCount);
    expect(transform.stats.documents_processed).toBeGreaterThan(docsProcessed);
    return true;
  });
}

export interface EntityStoreSourceDocument {
  user?: EcsUser;
  entity?: Omit<EntityField, 'id'>;
}
