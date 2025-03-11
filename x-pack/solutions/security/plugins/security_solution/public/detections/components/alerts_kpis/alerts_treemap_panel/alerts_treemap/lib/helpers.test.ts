/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PartitionElementEvent } from '@elastic/charts';
import { omit } from 'lodash/fp';

import { bucketsWithStackByField1, maxRiskSubAggregations } from './flatten/mocks/mock_buckets';
import {
  getGroupByFieldsOnClick,
  getMaxRiskSubAggregations,
  getUpToMaxBuckets,
  hasOptionalStackByField,
} from './helpers';

describe('helpers', () => {
  describe('getUpToMaxBuckets', () => {
    it('returns the expected buckets when maxItems is smaller than the collection of buckets', () => {
      expect(getUpToMaxBuckets({ buckets: bucketsWithStackByField1, maxItems: 2 })).toEqual([
        {
          key: 'matches everything',
          doc_count: 34,
          maxRiskSubAggregation: { value: 21 },
          stackByField1: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: 'Host-k8iyfzraq9', doc_count: 12 },
              { key: 'Host-ao1a4wu7vn', doc_count: 10 },
              { key: 'Host-3fbljiq8rj', doc_count: 7 },
              { key: 'Host-r4y6xi92ob', doc_count: 5 },
            ],
          },
        },
        {
          key: 'EQL process sequence',
          doc_count: 28,
          maxRiskSubAggregation: { value: 73 },
          stackByField1: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: 'Host-k8iyfzraq9', doc_count: 10 },
              { key: 'Host-ao1a4wu7vn', doc_count: 7 },
              { key: 'Host-3fbljiq8rj', doc_count: 5 },
              { key: 'Host-r4y6xi92ob', doc_count: 3 },
            ],
          },
        },
      ]);
    });

    it('returns the expected buckets when maxItems is the same length as the collection of buckets', () => {
      expect(
        getUpToMaxBuckets({
          buckets: bucketsWithStackByField1,
          maxItems: bucketsWithStackByField1.length,
        })
      ).toEqual(bucketsWithStackByField1);
    });

    it('returns the expected buckets when maxItems is greater than length as the collection of buckets', () => {
      expect(
        getUpToMaxBuckets({
          buckets: bucketsWithStackByField1,
          maxItems: bucketsWithStackByField1.length + 50,
        })
      ).toEqual(bucketsWithStackByField1);
    });

    it('returns an empty array when maxItems is zero', () => {
      expect(
        getUpToMaxBuckets({
          buckets: bucketsWithStackByField1,
          maxItems: 0,
        })
      ).toEqual([]);
    });

    it('returns an empty array when buckets is undefined', () => {
      expect(
        getUpToMaxBuckets({
          buckets: undefined,
          maxItems: 50,
        })
      ).toEqual([]);
    });
  });

  describe('getMaxRiskSubAggregations', () => {
    it('returns the expected sub aggregations when all the buckets have a `maxRiskSubAggregation`', () => {
      expect(getMaxRiskSubAggregations(bucketsWithStackByField1)).toEqual(maxRiskSubAggregations);
    });

    it('returns the expected sub aggregations when only some the buckets have a `maxRiskSubAggregation`', () => {
      const hasMissingMaxRiskSubAggregation = bucketsWithStackByField1.map((x) =>
        x.key === 'EQL process sequence' ? omit('maxRiskSubAggregation', x) : x
      );

      expect(getMaxRiskSubAggregations(hasMissingMaxRiskSubAggregation)).toEqual({
        'matches everything': 21,
        'EQL process sequence': undefined,
        'Endpoint Security': 47,
        'mimikatz process started': 99,
        'Threshold rule': 99,
      });
    });
  });

  describe('getGroupByFieldsOnClick', () => {
    it('returns the expected group by fields when the event has two fields', () => {
      const event: PartitionElementEvent[] = [
        [
          [
            {
              smAccessorValue: '',
              groupByRollup: 'mimikatz process started',
              value: 5,
              depth: 1,
              sortIndex: 3,
              path: [
                { index: 0, value: '__null_small_multiples_key__' },
                { index: 0, value: '__root_key__' },
                { index: 3, value: 'mimikatz process started' },
              ],
            },
            {
              smAccessorValue: '',
              groupByRollup: 'Host-k8iyfzraq9',
              value: 3,
              depth: 2,
              sortIndex: 0,
              path: [
                { index: 0, value: '__null_small_multiples_key__' },
                { index: 0, value: '__root_key__' },
                { index: 3, value: 'mimikatz process started' },
                { index: 0, value: 'Host-k8iyfzraq9' },
              ],
            },
          ],
          { specId: 'spec_1', key: 'spec{spec_1}' },
        ],
      ];

      expect(getGroupByFieldsOnClick(event)).toEqual({
        groupByField0: 'mimikatz process started',
        groupByField1: 'Host-k8iyfzraq9',
      });
    });

    it('returns the expected group by fields when the event has one field', () => {
      const event: PartitionElementEvent[] = [
        [
          [
            {
              smAccessorValue: '',
              groupByRollup: 'matches everything',
              value: 34,
              depth: 1,
              sortIndex: 0,
              path: [
                { index: 0, value: '__null_small_multiples_key__' },
                { index: 0, value: '__root_key__' },
                { index: 0, value: 'matches everything' },
              ],
            },
          ],
          { specId: 'spec_1', key: 'spec{spec_1}' },
        ],
      ];

      expect(getGroupByFieldsOnClick(event)).toEqual({
        groupByField0: 'matches everything',
        groupByField1: '',
      });
    });

    it('returns the expected group by fields groupByRollup is null', () => {
      const event: PartitionElementEvent[] = [
        [
          [
            {
              smAccessorValue: '',
              groupByRollup: null,
              value: 5,
              depth: 1,
              sortIndex: 3,
              path: [
                { index: 0, value: '__null_small_multiples_key__' },
                { index: 0, value: '__root_key__' },
                { index: 3, value: 'mimikatz process started' },
              ],
            },
            {
              smAccessorValue: '',
              groupByRollup: 'Host-k8iyfzraq9',
              value: 3,
              depth: 2,
              sortIndex: 0,
              path: [
                { index: 0, value: '__null_small_multiples_key__' },
                { index: 0, value: '__root_key__' },
                { index: 3, value: 'mimikatz process started' },
                { index: 0, value: 'Host-k8iyfzraq9' },
              ],
            },
          ],
          { specId: 'spec_1', key: 'spec{spec_1}' },
        ],
      ];

      expect(getGroupByFieldsOnClick(event)).toEqual({
        groupByField0: '',
        groupByField1: 'Host-k8iyfzraq9',
      });
    });
  });

  describe('hasOptionalStackByField', () => {
    it('returns true for a valid field', () => {
      expect(hasOptionalStackByField('host.name')).toBe(true);
    });

    it('returns false when stackByField1 is undefined', () => {
      expect(hasOptionalStackByField(undefined)).toBe(false);
    });

    it('returns false when stackByField1 is just whitespace', () => {
      expect(hasOptionalStackByField('     ')).toBe(false);
    });
  });
});
