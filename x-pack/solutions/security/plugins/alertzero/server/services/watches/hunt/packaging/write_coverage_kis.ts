/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAiIndexDest } from '@kbn/context-engine-plugin/common/ai_index_dest';
import { HUNT_COVERAGE_AI_INDEX_ID } from '../../../../../common/step_types/package_report';
import { buildCoverageSubject } from './coverage_ki_id';
import type { CoverageSubject, CoverageWriteResult } from './types';

/**
 * The slice of the Elasticsearch client this writer uses, so the packaging step can hand it its
 * own scoped client without this module depending on the step's context.
 */
export interface EsCoverageClient {
  get: (params: {
    index: string;
    id: string;
  }) => Promise<{ _source?: { attributes?: { status?: string } } }>;
  index: (params: {
    index: string;
    id: string;
    document: Record<string, unknown>;
    refresh: 'wait_for';
  }) => Promise<unknown>;
}

const readErrorStatusCode = (error: unknown): number | undefined => {
  if (!error || typeof error !== 'object') {
    return undefined;
  }
  if ('statusCode' in error && typeof (error as { statusCode?: unknown }).statusCode === 'number') {
    return (error as { statusCode: number }).statusCode;
  }
  if (
    'meta' in error &&
    typeof (error as { meta?: { statusCode?: unknown } }).meta?.statusCode === 'number'
  ) {
    return (error as { meta: { statusCode: number } }).meta.statusCode;
  }
  return undefined;
};

/**
 * Writes coverage KIs via the scoped ES client. No-reset: an existing KI whose
 * attributes.status is not `pending` is skipped (`already_processed`) rather than
 * rewritten. Disabled / denied / storage failures are distinct skip reasons.
 *
 * The document is assembled here rather than through Context Engine's own writer because the
 * only caller-facing services it exposes are reads, and its `context-engine.createKi` step
 * replaces a KI of the same id, which would overwrite a processed item with `status: pending`.
 */
export const createCoverageWriter = ({
  spaceId,
  getEsClient,
  isContextEngineEnabled,
}: {
  spaceId: string;
  getEsClient: () => EsCoverageClient;
  /** Already bound to this run's request by the caller; see the step's own dependency. */
  isContextEngineEnabled: () => Promise<boolean>;
}): ((subjects: CoverageSubject[]) => Promise<CoverageWriteResult>) => {
  // Context Engine owns how an AI index id maps to a backing store, so ask it rather than
  // rebuilding the prefix here and drifting when it changes.
  const { value: backingIndex } = getAiIndexDest('index', HUNT_COVERAGE_AI_INDEX_ID);

  return async (subjects) => {
    const written: CoverageWriteResult['written'] = [];
    const skipped: CoverageWriteResult['skipped'] = [];

    const subjectLabel = (subject: CoverageSubject) =>
      buildCoverageSubject({ reportId: subject.reportId, techniqueId: subject.technique });

    const skipEvery = (reason: CoverageWriteResult['skipped'][number]['reason']) => {
      for (const subject of subjects) {
        skipped.push({ kiId: subject.kiId, subject: subjectLabel(subject), reason });
      }
      return { written, skipped };
    };

    // Reading the gate goes through the saved objects client, so it can fail on its own.
    // That must not sink the run: minting proposals does not depend on the Context Engine,
    // and this gate exists to protect the Context Engine's index, not to decide whether a
    // confirmed hit reaches an analyst. An unreadable setting is also not a disabled one --
    // the deployment's intent is unknown, which is reason enough not to write, but not
    // reason to claim the feature is off.
    let contextEngineEnabled: boolean;
    try {
      contextEngineEnabled = await isContextEngineEnabled();
    } catch {
      return skipEvery('storage_failure');
    }

    if (!contextEngineEnabled) {
      return skipEvery('disabled');
    }

    const esClient = getEsClient();

    for (const subject of subjects) {
      try {
        try {
          const existing = await esClient.get({ index: backingIndex, id: subject.kiId });
          const status = existing._source?.attributes?.status;
          if (status !== undefined && status !== 'pending') {
            skipped.push({
              kiId: subject.kiId,
              subject: subjectLabel(subject),
              reason: 'already_processed',
            });
            continue;
          }
        } catch (error) {
          const code = readErrorStatusCode(error);
          if (code === 403) {
            skipped.push({ kiId: subject.kiId, subject: subjectLabel(subject), reason: 'denied' });
            continue;
          }
          // Only a 404 licenses the write below: it is the one answer that says the item is
          // not there. Anything else -- including an error carrying no status code at all,
          // such as a connection reset or a timeout -- leaves the current status unknown, and
          // falling through would index `status: pending` over an item that may already have
          // been processed, which is the no-reset rule this function promises.
          if (code !== 404) {
            skipped.push({
              kiId: subject.kiId,
              subject: subjectLabel(subject),
              reason: 'storage_failure',
            });
            continue;
          }
        }

        const now = new Date().toISOString();
        await esClient.index({
          index: backingIndex,
          id: subject.kiId,
          document: {
            '@timestamp': now,
            id: subject.kiId,
            updated_at: now,
            type: 'security.coverage',
            title: subject.title,
            description: subject.description,
            content: subject.content,
            tags: ['consumer:detection', 'status:pending', 'watch:hunt'],
            attributes: {
              status: 'pending',
              technique: subject.technique,
              report_id: subject.reportId,
              investigation_id: subject.investigationConversationId,
              watch_id: 'hunt',
              producer: 'hunt.packageReport.v1',
              space_id: spaceId,
            },
          },
          refresh: 'wait_for',
        });
        written.push({ kiId: subject.kiId, subject: subjectLabel(subject) });
      } catch (error) {
        const code = readErrorStatusCode(error);
        skipped.push({
          kiId: subject.kiId,
          subject: subjectLabel(subject),
          reason: code === 403 ? 'denied' : 'storage_failure',
        });
      }
    }

    return { written, skipped };
  };
};
