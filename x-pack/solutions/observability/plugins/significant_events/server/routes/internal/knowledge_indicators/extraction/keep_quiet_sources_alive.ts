/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pLimit from 'p-limit';
import type { Logger } from '@kbn/logging';
import { getSourceWriteConflictReason } from '../../../../lib/errors/source_write_conflict_error';
import type { KnowledgeIndicatorClient } from '../../../../lib/knowledge_indicators/knowledge_indicator_client/knowledge_indicator_client';
import { parseError } from '../../../../lib/streams/parse_error';
import type { SourceCandidate } from './classify_sources';

const MAX_CONCURRENT_KEEP_ALIVES = 5;

/** Refreshes the persistent indicators of sources that get no run, which retention would otherwise delete. */
export const keepQuietSourcesAlive = async ({
  sources,
  lastRefreshedBefore,
  kiClient,
  logger,
}: {
  sources: Array<Pick<SourceCandidate, 'sourceId'>>;
  lastRefreshedBefore: string;
  kiClient: Pick<KnowledgeIndicatorClient, 'keepAlivePersistentIndicators'>;
  logger: Logger;
}): Promise<void> => {
  const limit = pLimit(MAX_CONCURRENT_KEEP_ALIVES);
  await Promise.all(
    sources.map(({ sourceId }) =>
      limit(async () => {
        try {
          await kiClient.keepAlivePersistentIndicators(sourceId, { lastRefreshedBefore });
        } catch (error) {
          // The next sweep retries, long before retention acts.
          const message = `Could not keep alive the knowledge indicators of quiet source ${sourceId}: ${
            parseError(error).message
          }`;
          if (getSourceWriteConflictReason(error)) {
            logger.debug(message);
          } else {
            logger.warn(message);
          }
        }
      })
    )
  );
};
