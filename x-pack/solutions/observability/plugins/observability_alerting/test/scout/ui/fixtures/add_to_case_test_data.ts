/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiServicesFixture, EsClient, KibanaRole } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import {
  CUSTOM_THRESHOLD_RULE_TYPE_ID,
  OBS_THRESHOLD_ALERTS_INDEX_PATTERN,
} from './privilege_test_data';

export const ADD_TO_CASE_RULE_NAME = '[scout] Add to case rule';

/** Source index with one document per group, so the grouped rule raises one alert per group. */
export const ADD_TO_CASE_SOURCE_INDEX = 'scout-add-to-case-threshold';
export const ADD_TO_CASE_DATA_VIEW_ID = 'scout-add-to-case-threshold-dv';
const ADD_TO_CASE_GROUPS = ['host-a', 'host-b'] as const;

export const ADD_TO_CASE_ALERT_COUNT = ADD_TO_CASE_GROUPS.length;

const READER_ES_PRIVILEGES: KibanaRole['elasticsearch'] = {
  cluster: [],
  indices: [{ names: ['*'], privileges: ['read', 'view_index_metadata'] }],
};

/** Read access to classic alerts (no v2 alerts privilege) plus full Observability cases access. */
export const LOGS_READ_WITH_CASES_ROLE: KibanaRole = {
  elasticsearch: READER_ES_PRIVILEGES,
  kibana: [
    {
      base: [],
      feature: { logs: ['read'], observabilityCasesV3: ['all'] },
      spaces: ['*'],
    },
  ],
};

/** Read access to classic alerts without any cases privilege. */
export const LOGS_READ_WITHOUT_CASES_ROLE: KibanaRole = {
  elasticsearch: READER_ES_PRIVILEGES,
  kibana: [
    {
      base: [],
      feature: { logs: ['read'] },
      spaces: ['*'],
    },
  ],
};

export const createAddToCaseSourceIndex = async (esClient: EsClient): Promise<void> => {
  await esClient.indices.create(
    {
      index: ADD_TO_CASE_SOURCE_INDEX,
      mappings: {
        properties: { '@timestamp': { type: 'date' }, 'host.name': { type: 'keyword' } },
      },
    },
    { ignore: [400] }
  );
  await esClient.bulk({
    operations: ADD_TO_CASE_GROUPS.flatMap((host) => [
      { index: { _index: ADD_TO_CASE_SOURCE_INDEX } },
      { '@timestamp': new Date().toISOString(), 'host.name': host },
    ]),
    refresh: true,
  });
};

export const deleteAddToCaseSourceIndex = async (esClient: EsClient): Promise<void> => {
  await esClient.indices.delete({ index: ADD_TO_CASE_SOURCE_INDEX }, { ignore: [404] });
};

export const createAddToCaseRule = async ({
  apiServices,
  esClient,
}: {
  apiServices: ApiServicesFixture;
  esClient: EsClient;
}): Promise<string> => {
  const created = await apiServices.alerting.rules.create({
    name: ADD_TO_CASE_RULE_NAME,
    ruleTypeId: CUSTOM_THRESHOLD_RULE_TYPE_ID,
    consumer: 'logs',
    enabled: true,
    tags: [],
    schedule: { interval: '10s' },
    actions: [],
    params: {
      criteria: [
        {
          comparator: '>',
          threshold: [0],
          timeSize: 5,
          timeUnit: 'm',
          metrics: [{ name: 'A', aggType: 'count' }],
        },
      ],
      groupBy: ['host.name'],
      alertOnNoData: false,
      alertOnGroupDisappear: false,
      searchConfiguration: {
        query: { query: '', language: 'kuery' },
        index: ADD_TO_CASE_DATA_VIEW_ID,
      },
    },
  });
  const ruleId = created.data.id as string;
  await apiServices.alerting.rules.runSoon(ruleId);

  await expect
    .poll(
      async () =>
        (
          await esClient.count(
            {
              index: OBS_THRESHOLD_ALERTS_INDEX_PATTERN,
              query: { term: { 'kibana.alert.rule.uuid': ruleId } },
            },
            { ignore: [404] }
          )
        ).count,
      { timeout: 90_000, intervals: [1_000] }
    )
    .toBe(ADD_TO_CASE_ALERT_COUNT);
  return ruleId;
};

/**
 * Deletes the seeded alerts by rule name rather than rule id: a rule that is deleted while an
 * execution is in flight can still write an alert afterwards, which would then show up in the
 * table and be attached by a "select all" bulk action.
 */
export const deleteAddToCaseAlerts = async (esClient: EsClient): Promise<void> => {
  await esClient.deleteByQuery(
    {
      index: OBS_THRESHOLD_ALERTS_INDEX_PATTERN,
      refresh: true,
      conflicts: 'proceed',
      query: { term: { 'kibana.alert.rule.name': ADD_TO_CASE_RULE_NAME } },
    },
    { ignore: [404] }
  );
};
