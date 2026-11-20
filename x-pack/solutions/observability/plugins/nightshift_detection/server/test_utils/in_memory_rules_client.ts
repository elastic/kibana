/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import { ALERTING_ERROR_CODES, type RulesClientApi } from '@kbn/alerting-v2-plugin/server';
import type { BulkCreateRulesParams, BulkResponse } from '@kbn/alerting-v2-schemas';

interface StoredRule {
  id: string;
  enabled: boolean;
  tags: string[];
  query: string;
}

/**
 * The rule operations the reconciler and the managed rule reader use, kept in memory so a second
 * run sees what the first one did.
 */
export class InMemoryRulesClient {
  public readonly rules = new Map<string, StoredRule>();
  /** Every create call, to count how often a rule was asked for. */
  public readonly createCalls: string[][] = [];

  constructor(
    private readonly options: {
      /** Ids whose create call fails as a whole, with the message given. */
      failCreateOf?: Map<string, string>;
      /** Creates refused for the schedule budget once this many rules are enabled. */
      maxEnabledRules?: number;
    } = {}
  ) {}

  public findRules: RulesClientApi['findRules'] = async ({
    filter = '',
    page = 1,
    perPage = 20,
  } = {}) => {
    const tag = /metadata\.tags: "(.*)"/.exec(filter)?.[1];
    const matching = [...this.rules.values()].filter(({ tags }) => !tag || tags.includes(tag));
    const items = matching.slice((page - 1) * perPage, page * perPage).map((rule) => ({
      id: rule.id,
      enabled: rule.enabled,
      created_at: '2026-11-20T00:00:00.000Z',
      metadata: { name: rule.id, tags: rule.tags },
    }));

    return { items, total: matching.length, page, per_page: perPage } as unknown as Awaited<
      ReturnType<RulesClientApi['findRules']>
    >;
  };

  public bulkCreateRules = async ({ items }: BulkCreateRulesParams) => {
    const ids = items.map(({ id }) => id ?? '');
    this.createCalls.push(ids);

    const failure = ids.map((id) => this.options.failCreateOf?.get(id)).find(Boolean);
    if (failure) {
      throw new Error(failure);
    }

    const enabledAfter =
      [...this.rules.values()].filter(({ enabled }) => enabled).length +
      items.filter(({ enabled }) => enabled !== false).length;
    if (this.options.maxEnabledRules !== undefined && enabledAfter > this.options.maxEnabledRules) {
      throw badRequest('Too many schedules', {
        code: ALERTING_ERROR_CODES.MAX_SCHEDULES_PER_MINUTE_EXCEEDED,
      });
    }

    const created: Array<{ id: string }> = [];
    const errors: Array<{ index: number; id: string; error: { code: string; message: string } }> =
      [];
    items.forEach((item, index) => {
      const id = item.id ?? '';
      if (this.rules.has(id)) {
        errors.push({
          index,
          id,
          error: { code: ALERTING_ERROR_CODES.RULE_ALREADY_EXISTS, message: 'exists' },
        });
        return;
      }
      this.rules.set(id, {
        id,
        enabled: item.enabled !== false,
        tags: item.metadata.tags ?? [],
        query: item.query.base,
      });
      created.push({ id });
    });

    return { items: created, errors } as unknown as Awaited<
      ReturnType<RulesClientApi['bulkCreateRules']>
    >;
  };

  public bulkDeleteRules = async ({ ids }: { ids: string[] }): Promise<BulkResponse> =>
    this.applyToEach({ ids, apply: (id) => this.rules.delete(id) });

  public bulkEnableRules = async ({ ids }: { ids: string[] }): Promise<BulkResponse> =>
    this.applyToEach({ ids, apply: (id) => this.setEnabled({ id, enabled: true }) });

  public bulkDisableRules = async ({ ids }: { ids: string[] }): Promise<BulkResponse> =>
    this.applyToEach({ ids, apply: (id) => this.setEnabled({ id, enabled: false }) });

  private setEnabled({ id, enabled }: { id: string; enabled: boolean }): boolean {
    const rule = this.rules.get(id);
    if (rule) {
      rule.enabled = enabled;
    }
    return rule !== undefined;
  }

  private applyToEach({
    ids,
    apply,
  }: {
    ids: string[];
    apply: (id: string) => boolean;
  }): BulkResponse {
    const missing = ids.filter((id) => !apply(id));
    return {
      affected_count: ids.length - missing.length,
      errors: missing.map((id) => ({
        id,
        error: { code: ALERTING_ERROR_CODES.RULE_NOT_FOUND, message: 'not found' },
      })),
    } as unknown as BulkResponse;
  }
}
