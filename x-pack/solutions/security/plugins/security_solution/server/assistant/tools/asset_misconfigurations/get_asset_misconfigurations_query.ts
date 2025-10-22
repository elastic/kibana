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
  MISCONFIGURATION_STATUS,
} from '@kbn/cloud-security-posture-common';

export interface GetAssetMisconfigurationsQueryParams {
  resourceId: string;
}

export const getAssetMisconfigurationsQuery = ({
  resourceId,
}: GetAssetMisconfigurationsQueryParams): SearchRequest => ({
  index: CDR_MISCONFIGURATIONS_INDEX_PATTERN,
  size: 50, // 50 is adequate as usually per resource there are max 10 findings, though in case of 3p data it might be more
  sort: [{ '@timestamp': { order: 'desc' } }],
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
            'result.evaluation': MISCONFIGURATION_STATUS.FAILED,
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
