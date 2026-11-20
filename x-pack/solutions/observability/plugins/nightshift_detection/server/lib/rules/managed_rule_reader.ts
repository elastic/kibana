/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import type { RulesClientApi } from '@kbn/alerting-v2-plugin/server';
import type { ElasticsearchClient } from '@kbn/core/server';
import { inject, injectable } from 'inversify';
import { DetectionEngineSystemClient } from '../engine/es_client_tokens';
import { getStrategyTag, MANAGED_RULE_TAG } from './rule_identity';
import { DetectionRulesClient } from './rules_client_token';

/** Rules read per page; Alerting v2 caps a find at 500 per page. */
const FIND_PAGE_SIZE = 500;
/** Rows one read returns at most; a window holds about one row per rule run. */
const MAX_ROWS = 10_000;

/** A rule the engine manages, as far as reconciling and reading it needs. */
export interface ManagedRule {
  id: string;
  enabled: boolean;
  /** ISO timestamp of the rule's creation. */
  created_at: string;
  tags: string[];
}

/** A row a managed rule wrote to `.rule-events`: one row of its query's result. */
export interface RuleRow {
  rule_id: string;
  /** When the rule run was scheduled, in epoch milliseconds. */
  scheduled_timestamp: number;
  /** The columns of the row, as the rule's query returned them. */
  data: Record<string, unknown>;
}

/** Lists the rules the engine manages in the scope's space, and reads the rows they wrote. */
@injectable()
export class ManagedRuleReader {
  constructor(
    @inject(DetectionRulesClient) private readonly rulesClient: Pick<RulesClientApi, 'findRules'>,
    @inject(DetectionEngineSystemClient) private readonly esClient: ElasticsearchClient
  ) {}

  /** Every managed rule of the space, or only those of one strategy. */
  public async listManaged({ strategy }: { strategy?: string } = {}): Promise<ManagedRule[]> {
    const tag = strategy === undefined ? MANAGED_RULE_TAG : getStrategyTag(strategy);
    const rules: ManagedRule[] = [];

    // Page by page: the next page is asked for only once the previous one came back short of the total.
    for (let page = 1; ; page++) {
      const { items, total } = await this.rulesClient.findRules({
        filter: `metadata.tags: "${tag}"`,
        perPage: FIND_PAGE_SIZE,
        page,
      });
      rules.push(
        ...items.map(({ id, enabled, created_at: createdAt, metadata }) => ({
          id,
          enabled,
          created_at: createdAt,
          tags: metadata.tags ?? [],
        }))
      );

      if (items.length === 0 || rules.length >= total) {
        return rules;
      }
    }
  }

  /**
   * The rows the given rules wrote in `space_id` during `[from, to)` (epoch milliseconds), newest
   * run first. The range is on `@timestamp`, the time `.rule-events` indexed the row, not on when
   * the run was scheduled: a run that writes late is read by the next window instead of being lost.
   * Read with the engine's system client: `.rule-events` is not the account's to read, and the
   * filter keeps the read to the space and its own rules.
   */
  public async readRows({
    spaceId,
    ruleIds,
    from,
    to,
    abortSignal,
  }: {
    spaceId: string;
    ruleIds: string[];
    from: number;
    to: number;
    abortSignal?: AbortSignal;
  }): Promise<RuleRow[]> {
    if (ruleIds.length === 0) {
      return [];
    }

    const response = await this.esClient.search<{
      rule: { id: string };
      scheduled_timestamp: string;
      data?: Record<string, unknown>;
    }>(
      {
        index: ALERT_EVENTS_DATA_STREAM,
        size: MAX_ROWS,
        query: {
          bool: {
            filter: [
              { term: { type: 'signal' } },
              { term: { space_id: spaceId } },
              { terms: { 'rule.id': ruleIds } },
              {
                range: {
                  '@timestamp': { gte: from, lt: to, format: 'epoch_millis' },
                },
              },
            ],
          },
        },
        sort: [{ scheduled_timestamp: 'desc' }],
        _source: ['rule.id', 'scheduled_timestamp', 'data'],
      },
      { signal: abortSignal }
    );

    return response.hits.hits.flatMap(({ _source: source }) =>
      source
        ? [
            {
              rule_id: source.rule.id,
              scheduled_timestamp: Date.parse(source.scheduled_timestamp),
              data: source.data ?? {},
            },
          ]
        : []
    );
  }
}
