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
  const log = providerContext.getService('log');

  // Phase 1: Wait for the transform to exist before attempting to get stats
  let transform: any;
  let triggerCount: number = 0;
  let docsProcessed: number = 0;

  await retry.waitForWithTimeout(
    `Transform ${USER_TRANSFORM_ID} to exist`,
    TIMEOUT_MS,
    async () => {
      try {
        const { count, transforms } = await es.transform.getTransformStats({
          transform_id: USER_TRANSFORM_ID,
        });
        if (count !== 1) {
          log.debug(`Waiting for transform ${USER_TRANSFORM_ID} to exist, count: ${count}`);
          return false;
        }
        transform = transforms[0];
        triggerCount = transform.stats.trigger_count;
        docsProcessed = transform.stats.documents_processed;
        log.debug(
          `Transform ${USER_TRANSFORM_ID} found, trigger_count: ${triggerCount}, docs_processed: ${docsProcessed}`
        );
        return true;
      } catch (e: any) {
        if (e.message?.includes('resource_not_found_exception')) {
          log.debug(`Transform ${USER_TRANSFORM_ID} not found yet, waiting...`);
          return false;
        }
        throw e;
      }
    }
  );

  for (let i = 0; i < docs.length; i++) {
    const { result } = await es.index(buildUserTransformDocument(docs[i], dataStream));
    expect(result).toBe('created');
  }

  // Trigger the transform manually
  await triggerTransform(providerContext, USER_TRANSFORM_ID);

  // Phase 2: Wait for transform to execute
  await retry.waitForWithTimeout('Transform to run again', TIMEOUT_MS, async () => {
    try {
      const response = await es.transform.getTransformStats({
        transform_id: USER_TRANSFORM_ID,
      });
      if (!response.transforms[0]) {
        log.debug(`Transform ${USER_TRANSFORM_ID} not found in stats response, retrying...`);
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
        log.debug(`Transform ${USER_TRANSFORM_ID} not found, retrying...`);
        return false;
      }
      throw e;
    }
  });
}

export interface EntityStoreSourceDocument {
  user?: EcsUser;
  entity?: Omit<EntityField, 'id'>;
}
