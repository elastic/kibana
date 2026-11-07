/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import {
  HUNT_COVERAGE_AI_INDEX_DEST,
  HUNT_COVERAGE_AI_INDEX_ID,
} from '../../common/step_types/package_report';

/**
 * How many registry documents one space may hold for this id. `createKi` inserts
 * them with an auto-generated `_id`, so a burst of handoffs can leave more than one.
 */
const MAX_UNMANAGED_ENTRIES = 20;

interface InvestigationsAiIndex {
  managed: boolean;
  description?: string;
  feedback_analysis?: unknown;
  dest: { type: string; value: string };
  automations: readonly unknown[];
  sources: readonly unknown[];
  traces: readonly unknown[];
}

interface InvestigationsAiIndexService {
  get: (aiIndexId: string, spaceId: string) => Promise<InvestigationsAiIndex>;
  delete: (aiIndexId: string, spaceId: string) => Promise<void>;
}

const errorName = (error: unknown): string | undefined =>
  error instanceof Error ? error.name : undefined;

/**
 * An entry `context-engine.createKi` writes when the id is not registered yet:
 * the registered dest, and no sources, automations, traces, or description.
 * A configured index keeps the id; deleting it would drop the operator's setup.
 */
const isUnconfiguredStub = (index: InvestigationsAiIndex): boolean =>
  !index.managed &&
  !index.description &&
  index.feedback_analysis === undefined &&
  index.automations.length === 0 &&
  index.sources.length === 0 &&
  index.traces.length === 0 &&
  index.dest.type === HUNT_COVERAGE_AI_INDEX_DEST.type &&
  index.dest.value === HUNT_COVERAGE_AI_INDEX_DEST.value;

const adoptInSpace = async ({
  service,
  spaceId,
  logger,
}: {
  service: InvestigationsAiIndexService;
  spaceId: string;
  logger: Logger;
}): Promise<void> => {
  for (let removed = 0; removed < MAX_UNMANAGED_ENTRIES; removed++) {
    let current: InvestigationsAiIndex;
    try {
      current = await service.get(HUNT_COVERAGE_AI_INDEX_ID, spaceId);
    } catch (error) {
      if (errorName(error) === 'AiIndexNotFoundError') {
        return;
      }
      throw error;
    }

    // `get` materializes the managed registration once no unmanaged document is left.
    if (current.managed || !isUnconfiguredStub(current)) {
      if (!current.managed) {
        logger.warn(
          `AI index '${HUNT_COVERAGE_AI_INDEX_ID}' in space '${spaceId}' is a configured user-owned index, so the managed registration was left unused`
        );
      }
      return;
    }

    try {
      await service.delete(HUNT_COVERAGE_AI_INDEX_ID, spaceId);
    } catch (error) {
      const name = errorName(error);
      if (name === 'AiIndexNotFoundError' || name === 'AiIndexManagedError') {
        return;
      }
      throw error;
    }
    logger.info(
      `Removed an unconfigured '${HUNT_COVERAGE_AI_INDEX_ID}' AI index in space '${spaceId}' so the managed registration can replace it`
    );
  }

  logger.warn(
    `Stopped removing unconfigured '${HUNT_COVERAGE_AI_INDEX_ID}' AI indexes in space '${spaceId}' after ${MAX_UNMANAGED_ENTRIES}`
  );
};

/**
 * Drops empty `security-investigations` registry rows that predate the managed
 * registration. Context Engine will not overwrite a user-owned row, and `createKi`
 * can insert two of them, so the index stays "Needs setup" twice until they are gone.
 * The next `get` then creates the single managed entry.
 */
export const adoptInvestigationsAiIndex = async ({
  getAiIndexService,
  listSpaceIds,
  logger,
}: {
  getAiIndexService: () => InvestigationsAiIndexService;
  listSpaceIds: () => Promise<readonly string[]>;
  logger: Logger;
}): Promise<void> => {
  const service = getAiIndexService();
  const spaceIds = await listSpaceIds();
  for (const spaceId of spaceIds) {
    try {
      await adoptInSpace({ service, spaceId, logger });
    } catch (error) {
      logger.warn(
        `Failed to adopt AI index '${HUNT_COVERAGE_AI_INDEX_ID}' in space '${spaceId}': ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};
