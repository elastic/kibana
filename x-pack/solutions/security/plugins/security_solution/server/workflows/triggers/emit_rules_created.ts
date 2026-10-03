/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { RuleResponse } from '../../../common/api/detection_engine';
import type { DetectionRulesCreatedSource } from '../../../common/workflows/triggers';
import {
  MAX_RULES_PER_TRIGGER,
  MAX_TAG_LENGTH,
  MAX_TAGS_PER_RULES_EVENT,
} from '../../../common/workflows/triggers';
import type { SecuritySolutionEventBus } from '../../events/event_bus';
import type { DetectionRulesCreatedPayload } from '../../events/types';

export interface CreatedRuleSummary {
  readonly id: string;
  readonly type: string;
  readonly tags?: readonly string[];
}

export const toCreatedRuleSummary = ({ id, type, tags }: RuleResponse): CreatedRuleSummary => ({
  id,
  type,
  tags,
});

interface EmitDetectionRulesCreatedParams {
  eventBus: SecuritySolutionEventBus;
  request: KibanaRequest;
  rules: readonly CreatedRuleSummary[];
  source: DetectionRulesCreatedSource;
  logger?: Logger;
}

// Tags are filter metadata only, so they are clamped to fit the trigger schema. Ids are never
// dropped: an event that fails schema validation is discarded and its rules would never be seen.
const toPayload = (
  chunk: readonly CreatedRuleSummary[],
  totalCount: number,
  source: DetectionRulesCreatedSource
): DetectionRulesCreatedPayload => {
  const tags = new Set<string>();
  for (const { tags: ruleTags = [] } of chunk) {
    for (const tag of ruleTags) {
      if (tags.size >= MAX_TAGS_PER_RULES_EVENT) break;
      tags.add(tag.slice(0, MAX_TAG_LENGTH));
    }
  }

  return {
    ids: chunk.map(({ id }) => id),
    types: [...new Set(chunk.map(({ type }) => type))],
    tags: [...tags],
    totalCount,
    source,
  };
};

/**
 * Emits `detectionRulesCreated` for the rules a request created. Requests larger than
 * MAX_RULES_PER_TRIGGER are split into several events rather than truncated. Never throws.
 */
export const emitDetectionRulesCreatedInChunks = ({
  eventBus,
  request,
  rules,
  source,
  logger,
}: EmitDetectionRulesCreatedParams): void => {
  if (rules.length === 0) return;

  const totalCount = rules.length;
  for (let start = 0; start < totalCount; start += MAX_RULES_PER_TRIGGER) {
    const chunk = rules.slice(start, start + MAX_RULES_PER_TRIGGER);
    try {
      eventBus.emitDetectionRulesCreated(request, toPayload(chunk, totalCount, source));
      logger?.debug(
        `[workflow-trigger] detectionRulesCreated fired: count=${chunk.length} total=${totalCount} source=${source}`
      );
    } catch (err) {
      logger?.warn(`Failed to emit detectionRulesCreated workflow trigger: ${err}`);
    }
  }
};
