/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  CDR_MISCONFIGURATIONS_INDEX_PATTERN,
  LATEST_FINDINGS_RETENTION_POLICY,
} from '@kbn/cloud-security-posture-common';

export interface GetAssetMisconfigurationsQueryParams {
  resourceId: string;
  size?: number;
}

export const getAssetMisconfigurationsQuery = ({
  resourceId,
  size = 50,
}: GetAssetMisconfigurationsQueryParams): SearchRequest => ({
  index: CDR_MISCONFIGURATIONS_INDEX_PATTERN,
  size,
  sort: [
    { 'rule.benchmark.name': { order: 'asc' } },
    { 'rule.section': { order: 'asc' } },
    { '@timestamp': { order: 'desc' } },
  ],
  _source: [
    'rule.name',
    'rule.description',
    'rule.section',
    'rule.tags',
    'rule.benchmark.name',
    'rule.benchmark.id',
    'rule.benchmark.rule_number',
    'rule.benchmark.version',
    'rule.benchmark.posture_type',
    'resource.name',
    'resource.type',
    'resource.sub_type',
    'result.evaluation',
    'result.evidence',
    '@timestamp',
  ],
  query: {
    bool: {
      filter: [
        {
          term: {
            'resource.id': resourceId,
          },
        },
        {
          term: {
            'result.evaluation': 'failed',
          },
        },
        {
          range: {
            '@timestamp': {
              gte: `now-${LATEST_FINDINGS_RETENTION_POLICY}`,
              lte: 'now',
            },
          },
        },
      ],
    },
  },
});
