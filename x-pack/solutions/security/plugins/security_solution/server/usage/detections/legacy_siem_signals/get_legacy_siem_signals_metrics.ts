/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { getNonMigratedSignalsInfo } from '../../../lib/detection_engine/migrations/get_non_migrated_signals_info';
import type { LegacySiemSignals } from './types';

export interface GetLegacySiemSignalsUsageOptions {
  signalsIndex: string;
  esClient: ElasticsearchClient;
  logger: Logger;
}

export const getLegacySiemSignalsUsage = async ({
  signalsIndex,
  esClient,
  logger,
}: GetLegacySiemSignalsUsageOptions): Promise<LegacySiemSignals> => {
  const { indices, spaces } = await getNonMigratedSignalsInfo({
    esClient,
    signalsIndex,
    logger,
  });

  return {
    non_migrated_indices_total: indices.length,
    spaces_total: spaces.length,
  };
};
