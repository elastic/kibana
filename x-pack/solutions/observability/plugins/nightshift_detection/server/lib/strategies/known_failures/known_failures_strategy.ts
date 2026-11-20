/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectable } from 'inversify';
import type { DetectionStrategy } from '../detection_strategy';
import type { DesiredResources, DetectionStrategyDescriptor, ResourceContext } from '../types';
import { KNOWN_FAILURES_STRATEGY_ID } from './constants';
import { buildKnownFailureRule, getUnwatchableReason } from './known_failure_rule';
import { KnownFailuresGenerator } from './known_failures_generator';

/**
 * Known failures: a knowledge indicator describes a failure the space already knows, and the
 * strategy reports when that failure starts happening more. One Alerting v2 rule per indicator runs
 * change point detection over its per-minute count; the generator reads what those rules found.
 */
@injectable()
export class KnownFailuresStrategy implements DetectionStrategy {
  public readonly descriptor: DetectionStrategyDescriptor = {
    id: KNOWN_FAILURES_STRATEGY_ID,
    version: 1,
    name: 'Known failures',
    description:
      'Reports when a failure the knowledge indicators describe starts happening more often than before.',
    // The rules run every five minutes, so reading more often would only find the same rows.
    cadence_minutes: 5,
    settle_minutes: 1,
    daily_new_event_cap: 10,
  };

  public readonly generator = new KnownFailuresGenerator();

  /**
   * One rule per countable match knowledge indicator, on while its source is enabled. A STATS
   * indicator, or one that is more than `FROM` and `WHERE`, is reported as skipped.
   */
  public async resources({ knowledge, cpsEnabled }: ResourceContext): Promise<DesiredResources> {
    const knowledgeIndicators = await knowledge.listQueryKnowledgeIndicators();
    const result: DesiredResources = { resources: [], skipped: [] };

    knowledgeIndicators.forEach((knowledgeIndicator) => {
      const reason = getUnwatchableReason(knowledgeIndicator);
      if (reason) {
        result.skipped.push({ source_id: knowledgeIndicator.source_id, reason });
        return;
      }

      result.resources.push({
        kind: 'alerting_rule',
        source_id: knowledgeIndicator.source_id,
        enabled: knowledgeIndicator.source_enabled,
        data: buildKnownFailureRule({ knowledgeIndicator, cpsEnabled }),
      });
    });

    return result;
  }
}
