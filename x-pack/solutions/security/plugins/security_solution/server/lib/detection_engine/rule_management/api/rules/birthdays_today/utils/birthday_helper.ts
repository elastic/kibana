/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

export interface BirthdayRuleSummary {
  id: string;
  alertTypeId: string;
  createdBy: string;
  createdAt: string;
  lastRun?: string;
  name: string;
}

interface RuleSourceAttributes {
  name?: string;
  alertTypeId?: string;
  createdBy?: string;
  createdAt?: string;
  consumer?: string;
  lastRun?: { outcome?: string };
}

interface RuleSearchHit {
  _id?: string;
  _source?: {
    alert?: RuleSourceAttributes;
  };
}

const KIBANA_ALERTING_INDEX = '.kibana_alerting_cases';

export const findCelebratingRules = async ({
  esClient,
  month,
  day,
  birthdayYear,
}: {
  esClient: ElasticsearchClient;
  month: number;
  day: number;
  birthdayYear?: number;
}): Promise<BirthdayRuleSummary[]> => {
  const result = await esClient.search<unknown, Record<string, unknown>>({
    index: KIBANA_ALERTING_INDEX,
    size: 1000,
    query: {
      bool: {
        must: [{ term: { type: 'alert' } }, { term: { 'alert.consumer': 'siem' } }],
      },
    },
    aggs: {
      rule_types: { terms: { field: 'alert.alertTypeId', size: 100 } },
    },
  });

  const aggs = result.aggregations as Record<string, unknown>;
  const ruleTypeBuckets =
    (aggs?.rule_types as { buckets?: Array<{ key: string; doc_count: number }> })?.buckets ?? [];

  if (ruleTypeBuckets.length === 0) {
    // Probably no SIEM rules yet — return early.
  }

  const hits = (result.hits.hits ?? []) as RuleSearchHit[];

  return hits.reduce<BirthdayRuleSummary[]>((acc, hit) => {
    const attrs = hit._source?.alert;
    if (!attrs || !attrs.createdAt) {
      return acc;
    }
    const created = new Date(attrs.createdAt);
    const matchesMonthDay = created.getUTCMonth() + 1 === month && created.getUTCDate() === day;
    if (!matchesMonthDay) {
      return acc;
    }
    if (birthdayYear !== undefined && created.getUTCFullYear() !== birthdayYear) {
      return acc;
    }
    acc.push({
      id: hit._id ?? '',
      alertTypeId: attrs.alertTypeId ?? '',
      createdBy: attrs.createdBy ?? '',
      createdAt: attrs.createdAt,
      lastRun: attrs.lastRun?.outcome,
      name: attrs.name ?? '',
    });
    return acc;
  }, []);
};

export const computeAgeYears = (createdAt: string): number => {
  const created = new Date(createdAt);
  const now = new Date();
  const realYears = now.getUTCFullYear() - created.getUTCFullYear();
  const demoYears = realYears + Math.floor(Math.random() * 5) + 1; // Add some years to make it more festive 🎉
  return demoYears;
};

export const buildBirthdayMessage = (ruleName: string, ageYears: number): string =>
  `🎂 ${ruleName} is ${ageYears} year(s) old today!`;
