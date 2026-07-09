/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RULE_TYPE, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import { DEFAULT_PREVIEW_INDEX } from '../../../../common/constants';
import {
  buildRulePreviewMetadataSearchRequest,
  getRulePreviewAttachmentDataTableId,
  getRulePreviewMetadata,
} from './utils';

describe('getRulePreviewAttachmentDataTableId', () => {
  it('generates a unique table id from the preview id', () => {
    expect(getRulePreviewAttachmentDataTableId('preview-1')).toBe(
      'rule-preview-attachment-preview-1'
    );
  });
});

describe('buildRulePreviewMetadataSearchRequest', () => {
  it('builds a request filtered by preview id in the correct space index', () => {
    expect(
      buildRulePreviewMetadataSearchRequest({ previewId: 'preview-1', spaceId: 'default' })
    ).toEqual({
      params: {
        index: `${DEFAULT_PREVIEW_INDEX}-default`,
        size: 0,
        track_total_hits: true,
        query: {
          bool: {
            filter: [
              {
                term: {
                  [ALERT_RULE_UUID]: 'preview-1',
                },
              },
            ],
          },
        },
        aggs: {
          minTimestamp: { min: { field: '@timestamp' } },
          maxTimestamp: { max: { field: '@timestamp' } },
          ruleTypes: { terms: { field: ALERT_RULE_TYPE, size: 1 } },
        },
      },
    });
  });
});

describe('getRulePreviewMetadata', () => {
  it('derives total, rule type, and padded timeframe from aggregations', () => {
    const metadata = getRulePreviewMetadata({
      hits: {
        total: { value: 1, relation: 'eq' },
        hits: [],
      },
      aggregations: {
        minTimestamp: { value: 1716800000000 },
        maxTimestamp: { value: 1716800600000 },
        ruleTypes: {
          buckets: [{ key: 'esql', doc_count: 1 }],
        },
      },
    } as never);

    expect(metadata?.ruleType).toBe('esql');
    expect(metadata?.total).toBe(1);
    expect(metadata?.timeframeStart.valueOf()).toBe(1716799999000);
    expect(metadata?.timeframeEnd.valueOf()).toBe(1716800601000);
  });

  it('returns undefined when there are no preview alerts', () => {
    expect(
      getRulePreviewMetadata({
        hits: { total: { value: 0, relation: 'eq' }, hits: [] },
        aggregations: {},
      } as never)
    ).toBeUndefined();
  });

  it('falls back to rule type "query" when the aggregated type is not recognised', () => {
    const metadata = getRulePreviewMetadata({
      hits: { total: { value: 5, relation: 'eq' }, hits: [] },
      aggregations: {
        minTimestamp: { value: 1000 },
        maxTimestamp: { value: 2000 },
        ruleTypes: { buckets: [{ key: 'unknown_type', doc_count: 5 }] },
      },
    } as never);

    expect(metadata?.ruleType).toBe('query');
  });
});
