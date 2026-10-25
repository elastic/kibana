/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityUpdateClient } from '@kbn/entity-store/server';
import type { RiskWriterProfile } from '../utils/risk_writer_profile';
import type { EntityType } from '../../../../../../common/entity_analytics/types';
import type { EntityRiskScoreRecord } from '../../../../../../common/api/entity_analytics/common';
import type { RiskEngineDataWriter } from '../../risk_engine_data_writer';
import { persistRiskScoresToEntityStore } from '../../persist_risk_scores_to_entity_store';
import type { PageStepRecorder } from '../utils/page_step_timings';
import type { ScopedLogger } from '../utils/with_log_context';

export const persistScoresToRiskIndex = async ({
  writer,
  entityType,
  scores,
  logger,
  refresh,
  timer,
  profile,
  parallelChunks = 1,
}: {
  writer: Pick<RiskEngineDataWriter, 'bulk'>;
  entityType: EntityType;
  scores: EntityRiskScoreRecord[];
  logger: ScopedLogger;
  refresh?: Parameters<RiskEngineDataWriter['bulk']>[0]['refresh'];
  /** Records the write as the page's `riskWrite` step, with the bulk responses' `took`. */
  timer?: PageStepRecorder;
  profile?: RiskWriterProfile;
  /** Splits the write into this many bulk requests, sent at the same time. */
  parallelChunks?: number;
}): Promise<number> => {
  profile?.recordDocuments('produced', scores.length);
  const chunkSize = Math.max(1, Math.ceil(scores.length / Math.max(1, parallelChunks)));
  const chunks =
    scores.length <= chunkSize
      ? [scores]
      : Array.from({ length: Math.ceil(scores.length / chunkSize) }, (_, index) =>
          scores.slice(index * chunkSize, (index + 1) * chunkSize)
        );
  // Elasticsearch's own time, summed over the chunks.
  const write = async () => {
    const responses = await Promise.all(
      chunks.map((chunk) =>
        writer.bulk({ [entityType]: chunk, refresh, ...(profile ? { profile } : {}) })
      )
    );
    return {
      errors: responses.flatMap((response) => response.errors),
      docs_written: responses.reduce((sum, response) => sum + response.docs_written, 0),
      took: responses.reduce((sum, response) => sum + response.took, 0),
    };
  };
  const bulkResponse = timer
    ? await timer.time('riskWrite', write, (response) => response.took)
    : await write();
  if (bulkResponse.errors.length > 0) {
    logger.warn(
      `risk score bulk write had ${bulkResponse.errors.length} error(s): ${bulkResponse.errors.join(
        '; '
      )}`
    );
  } else {
    logger.debug(
      `risk score bulk write succeeded: attempted=${scores.length}, written=${bulkResponse.docs_written}, took=${bulkResponse.took}ms`
    );
  }
  return bulkResponse.docs_written;
};

export const persistScoresToEntityStore = async ({
  crudClient,
  logger,
  entityType,
  scores,
  enabled,
  refresh,
  parallelChunks,
}: {
  crudClient: EntityUpdateClient;
  logger: ScopedLogger;
  entityType: EntityType;
  scores: EntityRiskScoreRecord[];
  enabled: boolean;
  /** The write waits for a refresh unless this is `false`. */
  refresh?: 'wait_for' | false;
  /** Splits the write into this many bulk requests, sent at the same time. */
  parallelChunks?: number;
}): Promise<{ docsWritten: number; errorsCount: number; tookMs: number }> => {
  if (!enabled) {
    return { docsWritten: 0, errorsCount: 0, tookMs: 0 };
  }

  const { docsWritten, unexpectedErrors, tookMs } = await persistRiskScoresToEntityStore({
    crudClient,
    logger,
    scores: { [entityType]: scores },
    refresh,
    parallelChunks,
  });
  if (unexpectedErrors.length > 0) {
    logger.warn(
      `Entity store dual-write had ${unexpectedErrors.length} error(s): ${unexpectedErrors.join(
        '; '
      )}`
    );
  }
  return { docsWritten, errorsCount: unexpectedErrors.length, tookMs };
};
