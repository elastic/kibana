/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import { separate } from 'fp-ts/Array';
import { uniqBy } from 'lodash';
import type { Batch, BulkPrivMonUser, BulkBatchProcessingResults, Options } from './types';

export const bulkUpsertBatch =
  (esClient: ElasticsearchClient, index: string, { flushBytes, retries }: Options) =>
  async (batch: Batch) => {
    const { left: parsingErrors, right: users } = separate(batch.uploaded);
    const res = await esClient.bulk<BulkPrivMonUser>({
      index,
      operations: uniqBy(users, (u) => u.username).flatMap((u) => {
        const id = batch.existingUsers[u.username];
        const timestamp = new Date().toISOString();

        if (!id) {
          const labelField = !u.label
            ? {}
            : {
                entity_analytics_monitoring: {
                  labels: [u.label],
                },
              };

          return [
            { create: {} },
            {
              '@timestamp': timestamp,
              event: {
                ingested: timestamp,
                '@timestamp': timestamp,
              },
              user: {
                name: u.username,
                is_privileged: true,
                entity: { attributes: { Privileged: true } },
              },
              labels: { sources: ['csv'], source_ids: [] },
              ...labelField,
            },
            /* eslint-disable @typescript-eslint/no-explicit-any */
          ] as any;
        }

        return [
          { update: { _id: id } },
          {
            script: {
              source: /* java */ `
                boolean userModified = false;

                if (ctx._source.labels == null) {
                  ctx._source.labels = new HashMap();
                }
                if (ctx._source.labels.sources == null) {
                  ctx._source.labels.sources = new ArrayList();
                }
                if (!ctx._source.labels.sources.contains(params.source)) {
                  ctx._source.labels.sources.add(params.source);
                  userModified = true;
                }

                if (params.ea_label != null) {
                  if (ctx._source.entity_analytics_monitoring == null) {
                    ctx._source.entity_analytics_monitoring = new HashMap();
                  }
                  if (ctx._source.entity_analytics_monitoring.labels == null) {
                    ctx._source.entity_analytics_monitoring.labels = new ArrayList();
                  }
                  if (!ctx._source.entity_analytics_monitoring.labels.contains(params.ea_label)) {
                    ctx._source.entity_analytics_monitoring.labels.add(params.ea_label);
                    userModified = true;
                  }
                }

                if (ctx._source.user.is_privileged == false) {
                  ctx._source.user.is_privileged = true;
                  ctx._source.user.entity = ctx._source.user.entity != null ? ctx._source.user.entity : new HashMap();
                  ctx._source.user.entity.attributes = ctx._source.user.entity.attributes != null ? ctx._source.user.entity.attributes : new HashMap();
                  ctx._source.user.entity.attributes.Privileged = true;
                  userModified = true;
                }

                if (userModified) {
                  ctx._source['@timestamp'] = params.timestamp;
                  if (ctx._source.event == null) {
                    ctx._source.event = new HashMap();
                  }
                  ctx._source.event.ingested = params.timestamp;
                  ctx._source.event.put('@timestamp', params.timestamp);
                }
              `,
              lang: 'painless',
              params: {
                source: 'csv',
                ea_label: u.label,
                timestamp,
              },
            },
          },
          /* eslint-disable @typescript-eslint/no-explicit-any */
        ] as any;
        /* eslint-disable @typescript-eslint/no-explicit-any */
      }) as any,
      refresh: 'wait_for',
    });
    const stats = res.items.reduce(
      (acc, item, i) => {
        if (item.create && item.create.error) {
          const err = {
            message: item.create.error.reason || 'Create action: Unknown error',
            username: users[i].username,
            index: i,
          };
          return {
            ...acc,
            failed: acc.failed + 1,
            errors: acc.errors.concat(err),
          };
        }

        if (item.update && item.update.error) {
          const err = {
            message: item.update.error.reason || 'Update action: Unknown error',
            username: users[i].username,
            index: i,
          };
          return {
            ...acc,
            failed: acc.failed + 1,
            errors: acc.errors.concat(err),
          };
        }

        return {
          ...acc,
          successful: acc.successful + 1,
        };
      },
      { failed: parsingErrors.length, successful: 0, errors: parsingErrors }
    );
    return {
      ...stats,
      batch,
    } satisfies BulkBatchProcessingResults;
  };
