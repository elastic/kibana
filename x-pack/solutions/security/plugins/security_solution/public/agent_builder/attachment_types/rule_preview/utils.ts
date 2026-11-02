/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { IEsSearchRequest } from '@kbn/search-types';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import { ALERT_RULE_TYPE, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import moment from 'moment';
import { DEFAULT_PREVIEW_INDEX } from '../../../../common/constants';
import type { PreviewMetadataState } from './types';

interface RulePreviewMetadataAggregations {
  minTimestamp?: estypes.AggregationsMinAggregate;
  maxTimestamp?: estypes.AggregationsMaxAggregate;
  ruleTypes?: estypes.AggregationsStringTermsAggregate;
}

export type RulePreviewMetadataResponse = estypes.SearchResponse<
  unknown,
  RulePreviewMetadataAggregations
>;

const RULE_PREVIEW_TYPES: readonly Type[] = [
  'query',
  'saved_query',
  'threshold',
  'threat_match',
  'eql',
  'esql',
  'machine_learning',
  'new_terms',
];

const isRuleType = (value: string): value is Type => RULE_PREVIEW_TYPES.includes(value as Type);

export const getRulePreviewAttachmentDataTableId = (previewId: string): string =>
  `rule-preview-attachment-${previewId}`;

export const buildRulePreviewMetadataSearchRequest = ({
  previewId,
  spaceId,
}: {
  previewId: string;
  spaceId: string;
}): IEsSearchRequest => ({
  params: {
    index: `${DEFAULT_PREVIEW_INDEX}-${spaceId}`,
    size: 0,
    track_total_hits: true,
    query: {
      bool: {
        filter: [
          {
            term: {
              [ALERT_RULE_UUID]: previewId,
            },
          },
        ],
      },
    },
    aggs: {
      minTimestamp: {
        min: {
          field: '@timestamp',
        },
      },
      maxTimestamp: {
        max: {
          field: '@timestamp',
        },
      },
      ruleTypes: {
        terms: {
          field: ALERT_RULE_TYPE,
          size: 1,
        },
      },
    },
  },
});

export const getRulePreviewMetadata = (
  response: RulePreviewMetadataResponse
): PreviewMetadataState | undefined => {
  const total =
    typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value ?? 0;
  const minTimestamp = response.aggregations?.minTimestamp?.value;
  const maxTimestamp = response.aggregations?.maxTimestamp?.value;

  if (total === 0 || minTimestamp == null || maxTimestamp == null) {
    return undefined;
  }

  const ruleTypeBuckets = response.aggregations?.ruleTypes?.buckets;
  const ruleTypeKey = Array.isArray(ruleTypeBuckets) ? ruleTypeBuckets[0]?.key : undefined;
  const ruleType =
    typeof ruleTypeKey === 'string' && isRuleType(ruleTypeKey) ? ruleTypeKey : 'query';

  return {
    total,
    ruleType,
    timeframeStart: moment(minTimestamp).subtract(1, 'second'),
    timeframeEnd: moment(maxTimestamp).add(1, 'second'),
  };
};
