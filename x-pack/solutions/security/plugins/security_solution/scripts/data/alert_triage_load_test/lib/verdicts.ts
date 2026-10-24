/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { isRecord } from '../../lib/type_guards';
import type { Verdict } from './report';

const VERDICT_TAG_PREFIX = 'az:';
const VERDICTS: readonly Verdict[] = ['true_positive', 'false_positive', 'inconclusive'];
const CHUNK_SIZE = 500;

/** Reads the verdict from an alert's workflow tags; the Worker writes it as `az:<verdict>`. */
export const verdictFromTags = (tags: unknown): Verdict | undefined => {
  if (!Array.isArray(tags)) return undefined;
  return VERDICTS.find((verdict) => tags.includes(`${VERDICT_TAG_PREFIX}${verdict}`));
};

/** Verdict the Worker tagged on each alert, by alert id. Alerts it has not reached are absent. */
export const fetchVerdicts = async ({
  esClient,
  alertsIndex,
  alertIds,
}: {
  esClient: Client;
  alertsIndex: string;
  alertIds: string[];
}): Promise<Record<string, Verdict | undefined>> => {
  const verdicts: Record<string, Verdict | undefined> = {};

  for (let from = 0; from < alertIds.length; from += CHUNK_SIZE) {
    const ids = alertIds.slice(from, from + CHUNK_SIZE);
    const response = await esClient.search<Record<string, unknown>>({
      index: alertsIndex,
      size: ids.length,
      _source: ['kibana.alert.workflow_tags'],
      query: { ids: { values: ids } },
    });
    for (const { _id, _source } of response.hits.hits) {
      if (_id && isRecord(_source)) {
        verdicts[_id] = verdictFromTags(_source['kibana.alert.workflow_tags']);
      }
    }
  }

  return verdicts;
};
