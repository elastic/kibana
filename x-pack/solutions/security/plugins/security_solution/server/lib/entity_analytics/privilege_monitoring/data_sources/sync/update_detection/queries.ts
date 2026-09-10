/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { memoize } from 'lodash';
import hash from 'object-hash';
import type {
  Matcher,
  MonitoringEntitySource,
} from '../../../../../../../common/api/entity_analytics';
import type { PrivilegeMonitoringDataClient } from '../../../engine/data_client';
import type { PrivMonBulkUser } from '../../../types';
import { makeOpsBuilder } from '../../bulk/upsert';
import { errorsMsg, getErrorFromBulkResponse } from '../utils';
import type { AfterKey } from '../types';

/**
 * Build painless script for matchers
 * If we create new matcher types in the future, I think we may need to abandon
 * using painless due to script complexity and do the checking in TS code instead.
 * @param matchers - matcher objects containing fields and values to match against
 * @returns Painless script object
 */
const buildMatcherScript = (matchers: Matcher[]): estypes.Script => {
  if (matchers.length === 0) {
    // if no matchers then everyone is privileged
    return {
      lang: 'painless',
      source: 'true',
    };
  }

  const source = matchers.map(valuesMatcherToPainless).join(' || ');

  return {
    lang: 'painless',
    source,
  };
};

/**
 * Convert values matcher to painless script, this is currently the only supported matcher type.
 * A values matcher looks for specific values in specified fields like:
 * { fields: ['user.roles'], values: ['admin', 'superuser'] }
 */
const valuesMatcherToPainless = (matcher: Matcher): string => {
  const valuesLiteral = matcher.values.map((value) => JSON.stringify(value)).join(', ');
  const fieldChecks = matcher.fields
    .map(
      (field) =>
        `(doc.containsKey('${field}') && doc['${field}'].size() > 0 && [${valuesLiteral}].contains(doc['${field}'].value))`
    )
    .join(' || ');
  return `(${fieldChecks})`;
};

/**
 * Extract unique matcher fields for _source includes
 */
const extractMatcherFields = (matchers: Matcher[]): string[] => {
  const fields = matchers.flatMap((matcher) => matcher.fields);
  return Array.from(new Set(fields));
};

/**
 * Building privileged search body for matchers
 */
export const buildPrivilegedSearchBody = (
  matchers: Matcher[],
  timeGte?: string,
  afterKey?: AfterKey,
  pageSize: number = 100
): Omit<estypes.SearchRequest, 'index'> => {
  // this will get called multiple times with the same matchers during pagination
  const script = memoize(buildMatcherScript, (v) => hash(v))(matchers);
  const hasTimeFilter = Boolean(timeGte);
  return {
    size: 0,
    query: buildQueryForTimeRange(timeGte),
    aggs: {
      privileged_user_status_since_last_run: {
        composite: {
          size: pageSize,
          sources: [{ username: { terms: { field: 'user.name' } } }],
          ...(afterKey ? { after: afterKey } : {}),
        },
        aggs: {
          latest_doc_for_user: {
            top_hits: {
              size: 1,
              sort: buildSortForTimeField(hasTimeFilter),
              script_fields: { 'user.is_privileged': { script } },
              _source: {
                includes: buildSourceIncludes(hasTimeFilter, matchers),
              },
            },
          },
        },
      },
    },
  };
};

export const applyPrivilegedUpdates = async ({
  dataClient,
  users,
  source,
}: {
  dataClient: PrivilegeMonitoringDataClient;
  users: PrivMonBulkUser[];
  source: MonitoringEntitySource;
}) => {
  if (users.length === 0) return;

  const chunkSize = 500;
  const esClient = dataClient.deps.clusterClient.asCurrentUser;
  const operationsBuilder = makeOpsBuilder(dataClient);
  try {
    for (let start = 0; start < users.length; start += chunkSize) {
      const chunk = users.slice(start, start + chunkSize);
      const operations = operationsBuilder(chunk, source);
      if (operations.length > 0) {
        const resp = await esClient.bulk({
          refresh: 'wait_for',
          body: operations,
        });
        const errors = getErrorFromBulkResponse(resp);
        dataClient.log('error', errorsMsg(errors));
      }
    }
  } catch (error) {
    dataClient.log('error', `Error applying privileged updates: ${error.message}`);
  }
};

const buildQueryForTimeRange = (timeGte?: string): estypes.QueryDslQueryContainer =>
  timeGte
    ? {
        range: { '@timestamp': { gte: timeGte, lte: 'now' } },
      }
    : { match_all: {} };

const buildSortForTimeField = (hasTimeField: boolean): estypes.Sort =>
  hasTimeField
    ? [
        {
          '@timestamp': {
            order: 'desc',
            unmapped_type: 'date',
          },
        },
      ]
    : [
        {
          _doc: { order: 'desc' },
        },
      ];

const buildSourceIncludes = (hasTimeField: boolean, matchers: Matcher[]): string[] => {
  const fields = [
    hasTimeField ? '@timestamp' : undefined,
    'user.name',
    ...extractMatcherFields(matchers),
  ];
  return fields.filter((field): field is string => Boolean(field));
};
