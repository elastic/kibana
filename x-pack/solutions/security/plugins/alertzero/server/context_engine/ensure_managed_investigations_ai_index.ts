/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ContextEnginePluginStart } from '@kbn/context-engine-plugin/server';
import {
  HUNT_COVERAGE_AI_INDEX_DEST,
  HUNT_COVERAGE_AI_INDEX_ID,
} from '../../common/step_types/package_report';

type AiIndexService = ReturnType<ContextEnginePluginStart['getAiIndexService']>;
type AiIndex = Awaited<ReturnType<AiIndexService['get']>>;

const errorName = (error: unknown): string | undefined =>
  error instanceof Error ? error.name : undefined;

/**
 * The row `context-engine.createKi` inserts when this id is not registered yet.
 * Two overlapping handoffs can both pass the existence check and leave two rows,
 * because those documents get an auto-generated `_id`.
 */
const isUnconfiguredStub = (index: AiIndex): boolean =>
  !index.managed &&
  !index.description &&
  index.feedback_analysis === undefined &&
  index.automations.length === 0 &&
  index.sources.length === 0 &&
  index.traces.length === 0 &&
  index.dest.type === HUNT_COVERAGE_AI_INDEX_DEST.type &&
  index.dest.value === HUNT_COVERAGE_AI_INDEX_DEST.value;

const ensureInSpace = async (
  aiIndexService: Pick<AiIndexService, 'list' | 'delete' | 'get'>,
  spaceId: string,
  logger: Logger
): Promise<void> => {
  const matches = (await aiIndexService.list(spaceId)).filter(
    (index) => index.id === HUNT_COVERAGE_AI_INDEX_ID
  );
  const stubs = matches.filter(isUnconfiguredStub);
  const configured = matches.filter((index) => !index.managed && !isUnconfiguredStub(index));
  if (configured.length > 0) {
    logger.warn(
      `AI index '${HUNT_COVERAGE_AI_INDEX_ID}' in space '${spaceId}' is a configured user-owned index, so the managed registration was left unused`
    );
    return;
  }

  for (let removed = 0; removed < stubs.length; removed++) {
    try {
      await aiIndexService.delete(HUNT_COVERAGE_AI_INDEX_ID, spaceId);
    } catch (error) {
      const name = errorName(error);
      if (name === 'AiIndexNotFoundError' || name === 'AiIndexManagedError') {
        break;
      }
      throw error;
    }
  }

  // `list` only materializes a managed id when no row exists yet. After the
  // stubs are gone, `get` creates the single managed entry.
  if (!matches.some((index) => index.managed)) {
    await aiIndexService.get(HUNT_COVERAGE_AI_INDEX_ID, spaceId);
  }
};

/**
 * Removes empty duplicate `security-investigations` rows so the managed
 * registration can take their place. A configured user-owned index is left as stored.
 */
export const ensureManagedInvestigationsAiIndex = async ({
  aiIndexService,
  listSpaceIds,
  logger,
}: {
  aiIndexService: Pick<AiIndexService, 'list' | 'delete' | 'get'>;
  listSpaceIds: () => Promise<readonly string[]>;
  logger: Logger;
}): Promise<void> => {
  const spaceIds = await listSpaceIds();
  for (const spaceId of spaceIds) {
    try {
      await ensureInSpace(aiIndexService, spaceId, logger);
    } catch (error) {
      logger.warn(
        `Failed to make AI index '${HUNT_COVERAGE_AI_INDEX_ID}' managed in space '${spaceId}': ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};
