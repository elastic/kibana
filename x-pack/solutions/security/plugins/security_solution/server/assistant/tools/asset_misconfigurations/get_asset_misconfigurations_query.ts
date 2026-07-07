/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import type { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/bulk_crud_anonymization_fields_route.gen';
import {
  CDR_MISCONFIGURATIONS_INDEX_PATTERN,
  LATEST_FINDINGS_RETENTION_POLICY,
  MISCONFIGURATION_STATUS,
} from '@kbn/cloud-security-posture-common';

export interface GetAssetMisconfigurationsQueryParams {
  anonymizationFields: AnonymizationFieldResponse[];
  resourceId: string;
}

const MISCONFIGURATION_FIELDS = [
  'rule.name',
  'rule.description',
  'rule.section',
  'rule.tags',
  'rule.benchmark.name',
  'rule.benchmark.id',
  'rule.benchmark.rule_number',
  'rule.benchmark.version',
  'resource.name',
  'resource.type',
  'resource.sub_type',
  'result.evaluation',
  '@timestamp',
];

export const getAssetMisconfigurationsQuery = ({
  anonymizationFields,
  resourceId,
}: GetAssetMisconfigurationsQueryParams): SearchRequest => {
  const fields = anonymizationFields
    .filter((field) => field.allowed && MISCONFIGURATION_FIELDS.includes(field.field))
    .map((field) => ({
      field: field.field,
      include_unmapped: true,
    }));

  return {
    index: CDR_MISCONFIGURATIONS_INDEX_PATTERN,
    size: 50, // 50 is adequate as usually per resource there are max 10 findings, though in case of 3p data it might be more
    sort: [{ '@timestamp': { order: 'desc' as const } }],
    fields,
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
  };
};
