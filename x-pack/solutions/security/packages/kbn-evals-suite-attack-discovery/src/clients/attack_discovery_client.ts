/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout';
import type { ToolingLog } from '@kbn/tooling-log';
import pRetry from 'p-retry';
import type { AnonymizedAlert } from '../types';

const DEFAULT_ALERTS_INDEX_PATTERN = '.alerts-security.alerts-default*';
const DEFAULT_SIZE = 20;
const DEFAULT_TIME_RANGE = 'now-24h';

const formatAsPageContent = (source: Record<string, unknown>, fallbackId?: string): string => {
  const lines: string[] = [];

  const push = (k: string, v: unknown) => {
    if (v == null) return;
    if (typeof v === 'string' && v.length === 0) return;
    if (Array.isArray(v) && v.length === 0) return;
    lines.push(`${k},${Array.isArray(v) ? v.join(',') : String(v)}`);
  };

  const get = (path: string): unknown => {
    const parts = path.split('.');
    let cur: unknown = source;
    for (const p of parts) {
      if (cur == null || typeof cur !== 'object') return undefined;
      cur = (cur as Record<string, unknown>)[p];
    }
    return cur;
  };

  push('@timestamp', get('@timestamp'));
  push('_id', fallbackId);
  push('kibana.alert.original_time', get('kibana.alert.original_time'));
  push('kibana.alert.rule.name', get('kibana.alert.rule.name'));
  push('kibana.alert.severity', get('kibana.alert.severity'));
  push('kibana.alert.risk_score', get('kibana.alert.risk_score'));
  push('event.category', get('event.category'));
  push('event.kind', get('event.kind'));
  push('host.name', get('host.name'));
  push('user.name', get('user.name'));
  push('source.ip', get('source.ip'));
  push('destination.ip', get('destination.ip'));
  push('process.name', get('process.name'));
  push('process.command_line', get('process.command_line'));
  push('file.path', get('file.path'));
  push('message', get('message'));

  return lines.join('\n');
};

export class AttackDiscoveryClient {
  constructor(private readonly esClient: EsClient, private readonly log: ToolingLog) {}

  async searchAlertsAsContext({
    alertsIndexPattern = DEFAULT_ALERTS_INDEX_PATTERN,
    size = DEFAULT_SIZE,
    start = DEFAULT_TIME_RANGE,
    end = 'now',
    filter,
  }: {
    alertsIndexPattern?: string;
    size?: number;
    start?: string;
    end?: string;
    filter?: Record<string, unknown>;
  } = {}): Promise<AnonymizedAlert[]> {
    const run = async () => {
      const query = filter
        ? { bool: { filter: [{ range: { '@timestamp': { gte: start, lte: end } } }, filter] } }
        : { range: { '@timestamp': { gte: start, lte: end } } };

      const resp = await this.esClient.search<Record<string, unknown>>({
        index: alertsIndexPattern,
        size,
        sort: [{ '@timestamp': 'desc' }],
        query,
      });

      const hits = resp.hits.hits ?? [];
      return hits.map((h) => ({
        metadata: {},
        pageContent: formatAsPageContent(
          (h as { _source?: Record<string, unknown> })._source ?? {},
          (h as { _id?: string })._id
        ),
      }));
    };

    try {
      return await pRetry(run, {
        retries: 2,
        minTimeout: 2000,
        onFailedAttempt: (err) => {
          if (err.retriesLeft === 0) {
            this.log.error(
              new Error(`Failed to search alerts after ${err.attemptNumber} attempts`, {
                cause: err,
              })
            );
          } else {
            this.log.warning(
              new Error(`Alerts search failed on attempt ${err.attemptNumber}; retrying...`, {
                cause: err,
              })
            );
          }
        },
      });
    } catch (e) {
      this.log.error(
        new Error('searchAlertsAsContext: falling back to empty alert set', { cause: e as Error })
      );
      return [];
    }
  }
}
