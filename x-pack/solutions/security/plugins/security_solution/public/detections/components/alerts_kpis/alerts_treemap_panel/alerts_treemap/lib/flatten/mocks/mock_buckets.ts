/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RawBucket } from '../../../types';

export const bucketsWithStackByField1: RawBucket[] = [
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
  {
    key: 'Endpoint Security',
    doc_count: 19,
    maxRiskSubAggregation: { value: 47 },
    stackByField1: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        { key: 'Host-ao1a4wu7vn', doc_count: 11 },
        { key: 'Host-3fbljiq8rj', doc_count: 6 },
        { key: 'Host-k8iyfzraq9', doc_count: 1 },
        { key: 'Host-r4y6xi92ob', doc_count: 1 },
      ],
    },
  },
  {
    key: 'mimikatz process started',
    doc_count: 5,
    maxRiskSubAggregation: { value: 99 },
    stackByField1: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        { key: 'Host-k8iyfzraq9', doc_count: 3 },
        { key: 'Host-3fbljiq8rj', doc_count: 1 },
        { key: 'Host-r4y6xi92ob', doc_count: 1 },
      ],
    },
  },
  {
    key: 'Threshold rule',
    doc_count: 1,
    maxRiskSubAggregation: { value: 99 },
    stackByField1: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [{ key: 'Host-r4y6xi92ob', doc_count: 1 }],
    },
  },
];

export const bucketsWithoutStackByField1 = [
  { key: 'matches everything', doc_count: 34, maxRiskSubAggregation: { value: 21 } },
  { key: 'EQL process sequence', doc_count: 28, maxRiskSubAggregation: { value: 73 } },
  { key: 'Endpoint Security', doc_count: 19, maxRiskSubAggregation: { value: 47 } },
  { key: 'mimikatz process started', doc_count: 5, maxRiskSubAggregation: { value: 99 } },
  { key: 'Threshold rule', doc_count: 1, maxRiskSubAggregation: { value: 99 } },
];

export const maxRiskSubAggregations = {
  'matches everything': 21,
  'EQL process sequence': 73,
  'Endpoint Security': 47,
  'mimikatz process started': 99,
  'Threshold rule': 99,
};
