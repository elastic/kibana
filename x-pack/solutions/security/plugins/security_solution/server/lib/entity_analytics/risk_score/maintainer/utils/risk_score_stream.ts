/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PassThrough } from 'stream';
import type { BulkStats } from '@elastic/elasticsearch/lib/helpers';
import type { RiskWriterProfile } from './risk_writer_profile';
import type { EntityRiskScoreRecord } from '../../../../../../common/api/entity_analytics/common';
import type { EntityType } from '../../../../../../common/entity_analytics/types';
import type { RiskEngineDataWriter, RiskScoreStreamOptions } from '../../risk_engine_data_writer';
import type { ScopedLogger } from './with_log_context';

interface RiskScoreStream {
  write: (scores: EntityRiskScoreRecord[]) => Promise<void>;
  finish: () => Promise<BulkStats>;
}

/** Feeds concurrent scoring pages into one bulk helper with bounded page buffering. */
export const createRiskScoreStream = ({
  writer,
  entityType,
  options,
  profile,
  refresh,
  logger,
  stage,
}: {
  writer: Pick<RiskEngineDataWriter, 'stream'>;
  entityType: EntityType;
  options: RiskScoreStreamOptions;
  profile?: RiskWriterProfile;
  refresh?: 'wait_for';
  logger: ScopedLogger;
  stage: 'base' | 'resolution';
}): RiskScoreStream => {
  // One readable and one writable page can buffer while the helper sends serialized batches.
  const pages = new PassThrough({ objectMode: true, highWaterMark: 1 });
  const scores = async function* (): AsyncGenerator<EntityRiskScoreRecord> {
    for await (const page of pages) {
      const records = page as EntityRiskScoreRecord[];
      yield* records;
      profile?.recordDocuments('consumed', records.length);
    }
  };
  const completion = writer
    .stream({ scores: scores(), entityType, refresh, profile, ...options })
    .then(
      (stats) => ({ stats }),
      (error: Error) => {
        pages.destroy();
        return { error };
      }
    );

  return {
    write: (page) =>
      new Promise<void>((resolve, reject) => {
        if (page.length === 0) {
          resolve();
          return;
        }
        const onClose = () => reject(new Error('Risk score stream closed during enqueue'));
        if (pages.destroyed) {
          onClose();
          return;
        }
        profile?.recordDocuments('produced', page.length);
        pages.once('close', onClose);
        pages.write(page, (error) => {
          pages.off('close', onClose);
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      }),
    finish: async () => {
      const startedAt = Date.now();
      pages.end();
      const result = await completion;
      if ('error' in result) {
        throw result.error;
      }
      logger.info(
        `[${stage}] risk stream ${JSON.stringify({
          ...result.stats,
          drainMs: Date.now() - startedAt,
          ...options,
        })}`
      );
      return result.stats;
    },
  };
};
