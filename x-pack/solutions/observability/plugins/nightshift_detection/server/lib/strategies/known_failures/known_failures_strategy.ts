/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectable } from 'inversify';
import type { DetectionStrategy } from '../detection_strategy';
import type { DesiredResources, DetectionStrategyDescriptor, ResourceContext } from '../types';
import { KNOWN_FAILURES_SETTINGS, KNOWN_FAILURES_STRATEGY_ID } from './constants';
import { buildKnownFailureRule, getUnwatchableReason } from './known_failure_rule';
import { KnownFailuresGenerator } from './known_failures_generator';

/**
 * Known failures: a knowledge indicator describes a failure the space already knows, and the
 * strategy reports when that failure starts happening more. One Alerting v2 rule per indicator
 * measures its per-minute count, normal level and latest change point; the generator judges them.
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
    cadence_minutes: KNOWN_FAILURES_SETTINGS.rule_every_minutes,
    settle_minutes: 1,
    daily_new_event_cap: 10,
  };

  public readonly generator = new KnownFailuresGenerator();

  /**
   * One rule per countable match knowledge indicator, on while its source is enabled. A STATS
   * indicator, or one that is more than `FROM` and `WHERE` (`KEEP`, `DROP` and `SORT` aside), is only
   * noted: skipping its source
   * would freeze the source's other rules, so an edited indicator's old rule would never go.
   */
  public async resources({
    sources,
    knowledge,
    cpsEnabled,
  }: ResourceContext): Promise<DesiredResources> {
    const queries = await knowledge.listQueries({ sourceIds: sources.map(({ id }) => id) });
    const enabledSourceIds = new Set(sources.filter(({ enabled }) => enabled).map(({ id }) => id));
    const result: Required<DesiredResources> = { resources: [], skipped: [], notes: [] };

    queries.forEach((link) => {
      const { query, source_id: sourceId } = link;
      const reason = getUnwatchableReason(link);
      if (reason) {
        result.notes.push(`${sourceId}: ${reason}`);
        return;
      }

      result.resources.push({
        kind: 'alerting_rule',
        source_id: sourceId,
        enabled: enabledSourceIds.has(sourceId),
        data: buildKnownFailureRule({ query, cpsEnabled }),
      });
    });

    return result;
  }
}
