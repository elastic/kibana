/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformAssetAggregationToChartData } from './transform_asset_aggregation_to_chart_data';
import { ASSET_FIELDS } from '../../constants';

jest.mock('@kbn/i18n', () => ({
  i18n: {
    translate: (_id: string, { defaultMessage }: { defaultMessage: string }) => defaultMessage,
  },
}));

describe('transformAssetAggregationToChartData', () => {
  it('returns flattened subtype entries and other count', () => {
    const input = {
      entityType: {
        buckets: [
          {
            key: 'aws',
            doc_count: 5,
            entityId: { value: 5 },
            entitySubType: {
              buckets: [
                {
                  key: 'ec2',
                  doc_count: 10,
                  entityId: { value: 10 },
                },
              ],
              sum_other_doc_count: 3,
            },
          },
        ],
      },
    };

    const result = transformAssetAggregationToChartData(input);

    expect(result).toEqual([
      {
        [ASSET_FIELDS.ENTITY_TYPE]: 'aws',
        [ASSET_FIELDS.ENTITY_SUB_TYPE]: 'ec2',
        count: 10,
      },
      {
        [ASSET_FIELDS.ENTITY_TYPE]: 'aws',
        [ASSET_FIELDS.ENTITY_SUB_TYPE]: 'aws - Other',
        count: 3,
      },
    ]);
  });

  it('returns empty array if no buckets', () => {
    const result = transformAssetAggregationToChartData({ entityType: { buckets: [] } });
    expect(result).toEqual([]);
  });

  it('formats Uncategorized labels with entity type', () => {
    const input = {
      entityType: {
        buckets: [
          {
            key: 'Host',
            doc_count: 5,
            entityId: { value: 5 },
            entitySubType: {
              buckets: [
                {
                  key: 'Uncategorized',
                  doc_count: 3,
                  entityId: { value: 3 },
                },
                {
                  key: 'Linux',
                  doc_count: 2,
                  entityId: { value: 2 },
                },
              ],
              sum_other_doc_count: 0,
            },
          },
          {
            key: 'Identity',
            doc_count: 4,
            entityId: { value: 4 },
            entitySubType: {
              buckets: [
                {
                  key: 'Uncategorized',
                  doc_count: 2,
                  entityId: { value: 2 },
                },
              ],
              sum_other_doc_count: 0,
            },
          },
        ],
      },
    };

    const result = transformAssetAggregationToChartData(input);

    expect(result).toEqual([
      {
        [ASSET_FIELDS.ENTITY_TYPE]: 'Host',
        [ASSET_FIELDS.ENTITY_SUB_TYPE]: 'Host (uncategorized)',
        count: 3,
      },
      {
        [ASSET_FIELDS.ENTITY_TYPE]: 'Host',
        [ASSET_FIELDS.ENTITY_SUB_TYPE]: 'Linux',
        count: 2,
      },
      {
        [ASSET_FIELDS.ENTITY_TYPE]: 'Identity',
        [ASSET_FIELDS.ENTITY_SUB_TYPE]: 'Identity (uncategorized)',
        count: 2,
      },
    ]);
  });
});
