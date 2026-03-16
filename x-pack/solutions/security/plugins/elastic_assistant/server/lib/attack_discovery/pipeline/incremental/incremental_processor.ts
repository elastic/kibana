/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, KibanaRequest } from '@kbn/core/server';
import type { CasesServerStart } from '@kbn/cases-plugin/server';
import { AttachmentType } from '@kbn/cases-plugin/common';
import { v4 as uuidv4 } from 'uuid';

import type { IncrementalAdConfig } from '../types';
import {
  ensureTrackerIndex,
  getProcessedAlertIds,
  updateProcessedAlertIds,
  computeDeltaAlertIds,
} from './processed_alert_tracker';

export interface IncrementalAdResult {
  readonly caseId: string;
  readonly deltaAlertIds: string[];
  readonly totalAlertIds: number;
  readonly previouslyProcessed: number;
  readonly generationUuid: string;
  readonly skipped: boolean;
  readonly skipReason?: string;
}

/**
 * Determines which alert IDs for a given case are "new" (not yet processed by AD),
 * and returns the delta set. If below the minimum threshold, returns skipped=true.
 */
export const getIncrementalDelta = async ({
  caseId,
  cases,
  config,
  esClient,
  logger,
  request,
  spaceId,
}: {
  caseId: string;
  cases: CasesServerStart;
  config: IncrementalAdConfig;
  esClient: ElasticsearchClient;
  logger: Logger;
  request: KibanaRequest;
  spaceId: string;
}): Promise<IncrementalAdResult> => {
  const generationUuid = uuidv4();

  await ensureTrackerIndex({ esClient, spaceId, logger });

  const casesClient = await cases.getCasesClientWithRequest(request);
  const documents = await casesClient.attachments.getAllDocumentsAttachedToCase({
    caseId,
    attachmentTypes: [AttachmentType.alert],
  });

  const allCaseAlertIds = documents.map((doc) => doc.id);

  if (allCaseAlertIds.length === 0) {
    return {
      caseId,
      deltaAlertIds: [],
      totalAlertIds: 0,
      previouslyProcessed: 0,
      generationUuid,
      skipped: true,
      skipReason: 'No alerts attached to case',
    };
  }

  const tracker = await getProcessedAlertIds({ esClient, spaceId, caseId, logger });
  const deltaAlertIds = computeDeltaAlertIds({ allCaseAlertIds, tracker });

  if (deltaAlertIds.length < config.minNewAlerts) {
    return {
      caseId,
      deltaAlertIds,
      totalAlertIds: allCaseAlertIds.length,
      previouslyProcessed: tracker?.processedAlertIds.length ?? 0,
      generationUuid,
      skipped: true,
      skipReason: `Only ${deltaAlertIds.length} new alerts, below minimum threshold of ${config.minNewAlerts}`,
    };
  }

  logger.info(
    `getIncrementalDelta: case ${caseId} has ${deltaAlertIds.length} new alerts out of ${
      allCaseAlertIds.length
    } total (${tracker?.processedAlertIds.length ?? 0} previously processed)`
  );

  return {
    caseId,
    deltaAlertIds,
    totalAlertIds: allCaseAlertIds.length,
    previouslyProcessed: tracker?.processedAlertIds.length ?? 0,
    generationUuid,
    skipped: false,
  };
};

/**
 * After a successful incremental AD run, marks the delta alert IDs as processed.
 */
export const markAlertsProcessed = async ({
  caseId,
  deltaAlertIds,
  esClient,
  generationUuid,
  logger,
  spaceId,
}: {
  caseId: string;
  deltaAlertIds: string[];
  esClient: ElasticsearchClient;
  generationUuid: string;
  logger: Logger;
  spaceId: string;
}): Promise<void> => {
  await updateProcessedAlertIds({
    esClient,
    spaceId,
    caseId,
    newAlertIds: deltaAlertIds,
    generationUuid,
    logger,
  });
};
