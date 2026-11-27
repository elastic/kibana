/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { COMPOSITE_SUMMARY_INDEX_NAME } from '../../../common/constants';
import type { SloTelemetryReporter } from '../../lib/telemetry';
import {
  COMPOSITE_SLO_DELETED_EBT_EVENT_TYPE,
  toCompositeSloDeletedEbtData,
} from '../../lib/telemetry';
import { retryTransientEsErrors } from '../../utils/retry';
import type { CompositeSLORepository } from './composite_slo_repository';
import { buildCompositeSloSummaryDocId } from './composite_slo_summary_index';

interface Dependencies {
  esClient: ElasticsearchClient;
  compositeRepository: CompositeSLORepository;
  logger: Logger;
  telemetry: SloTelemetryReporter;
}

interface Params {
  id: string;
  spaceId: string;
}

export async function deleteCompositeSlo(
  { id, spaceId }: Params,
  { esClient, compositeRepository, logger, telemetry }: Dependencies
): Promise<void> {
  await compositeRepository.deleteById(id);

  telemetry.report(COMPOSITE_SLO_DELETED_EBT_EVENT_TYPE, () => toCompositeSloDeletedEbtData(id));

  const docId = buildCompositeSloSummaryDocId(spaceId, id);
  try {
    await retryTransientEsErrors(
      () =>
        esClient.delete({
          index: COMPOSITE_SUMMARY_INDEX_NAME,
          id: docId,
          refresh: true,
        }),
      { logger }
    );
  } catch (err) {
    // 404 means the summary doc was never written (e.g. task hasn't run yet) — not an error.
    // Other failures are best-effort cleanup: log and swallow so the composite delete still succeeds.
    if (err?.statusCode !== 404) {
      logger.debug(`Failed to delete composite summary doc [${docId}]: ${err}`);
    }
  }
}
