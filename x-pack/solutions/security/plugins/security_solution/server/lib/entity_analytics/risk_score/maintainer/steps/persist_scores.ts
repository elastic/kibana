/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityUpdateClient } from '@kbn/entity-store/server';
import type { EntityType } from '../../../../../../common/entity_analytics/types';
import type { EntityRiskScoreRecord } from '../../../../../../common/api/entity_analytics/common';
import type { RiskEngineDataWriter } from '../../risk_engine_data_writer';
import { persistRiskScoresToEntityStore } from '../../persist_risk_scores_to_entity_store';
import type { PageStepTimings } from '../instrumentation/page_timing_types';
import type { ScopedLogger } from '../utils/with_log_context';

export const persistScoresToRiskIndex = async ({
  writer,
  entityType,
  scores,
  logger,
  refresh,
  pageTimings,
}: {
  writer: RiskEngineDataWriter;
  entityType: EntityType;
  scores: EntityRiskScoreRecord[];
  logger: ScopedLogger;
  refresh?: Parameters<RiskEngineDataWriter['bulk']>[0]['refresh'];
  /** Records the write as the page's `riskWrite` step, with the bulk response's `took`. */
  pageTimings?: PageStepTimings;
}): Promise<number> => {
  const bulkResponse = pageTimings
    ? await pageTimings.time(
        ['risk', 'write'],
        () => writer.bulk({ [entityType]: scores, refresh }),
        (response) => response.took
      )
    : await writer.bulk({ [entityType]: scores, refresh });
  pageTimings?.count('riskDocumentsWritten', bulkResponse.docs_written);
  pageTimings?.count('riskWriteFailures', scores.length - bulkResponse.docs_written);
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
}: {
  crudClient: EntityUpdateClient;
  logger: ScopedLogger;
  entityType: EntityType;
  scores: EntityRiskScoreRecord[];
  enabled: boolean;
}): Promise<{ docsWritten: number; errorsCount: number }> => {
  if (!enabled) {
    return { docsWritten: 0, errorsCount: 0 };
  }

  const { docsWritten, unexpectedErrors } = await persistRiskScoresToEntityStore({
    crudClient,
    logger,
    scores: { [entityType]: scores },
  });
  if (unexpectedErrors.length > 0) {
    logger.warn(
      `Entity store dual-write had ${unexpectedErrors.length} error(s): ${unexpectedErrors.join(
        '; '
      )}`
    );
  }
  return { docsWritten, errorsCount: unexpectedErrors.length };
};
