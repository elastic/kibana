/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { AlertSource } from './alert_clone';
import { LOAD_TEST_TAG } from './alert_clone';
import { isRecord } from '../../lib/type_guards';

/** Tag `generate.ts` puts on alerts whose source event is a benign false positive. */
export const GENERATOR_FALSE_POSITIVE_TAG = 'data-generator-fp';

export interface TemplatePool {
  truePositives: AlertSource[];
  falsePositives: AlertSource[];
}

const searchTemplates = async ({
  esClient,
  index,
  filter,
  mustNot,
  size,
}: {
  esClient: Client;
  index: string;
  filter: object[];
  mustNot: object[];
  size: number;
}): Promise<AlertSource[]> => {
  const response = await esClient.search<AlertSource>({
    index,
    size,
    sort: [{ '@timestamp': 'desc' }],
    query: { bool: { filter, must_not: mustNot } },
  });
  return response.hits.hits.flatMap(({ _source }) => (isRecord(_source) ? [_source] : []));
};

/**
 * Reads the alerts `generate.ts` produced and splits them by its ground-truth tag. Alerts this tool
 * created on an earlier run are excluded, so a pool never feeds on its own clones.
 */
export const loadTemplatePool = async ({
  esClient,
  alertsIndex,
  templateTag,
  maxPerLabel,
}: {
  esClient: Client;
  alertsIndex: string;
  templateTag: string;
  maxPerLabel: number;
}): Promise<TemplatePool> => {
  const owned = { term: { 'kibana.alert.rule.tags': templateTag } };
  const falsePositive = { term: { 'kibana.alert.rule.tags': GENERATOR_FALSE_POSITIVE_TAG } };
  const ownClone = { term: { 'kibana.alert.rule.tags': LOAD_TEST_TAG } };

  const [truePositives, falsePositives] = await Promise.all([
    searchTemplates({
      esClient,
      index: alertsIndex,
      filter: [owned],
      mustNot: [falsePositive, ownClone],
      size: maxPerLabel,
    }),
    searchTemplates({
      esClient,
      index: alertsIndex,
      filter: [owned, falsePositive],
      mustNot: [ownClone],
      size: maxPerLabel,
    }),
  ]);

  return { truePositives, falsePositives };
};
