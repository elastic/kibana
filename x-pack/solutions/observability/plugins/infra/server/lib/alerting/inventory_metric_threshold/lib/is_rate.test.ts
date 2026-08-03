/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricsUIAggregation } from '@kbn/metrics-data-access-plugin/common';
import {
  isCustomMetricRate,
  isInterfaceRateAgg,
  isFilteredInterfaceRateAgg,
  isMetricRate,
  isRate,
  getInterfaceRateFields,
} from './is_rate';
import type { SnapshotCustomMetricInput } from '../../../../../common/http_api';

const customMaxMetricMock: SnapshotCustomMetricInput = {
  type: 'custom',
  aggregation: 'max',
  field: '',
  id: '',
};

const customRateMetricMock: SnapshotCustomMetricInput = {
  type: 'custom',
  aggregation: 'rate',
  field: '',
  id: '',
};

const metricMock: MetricsUIAggregation = {
  mock1: { derivative: {} },
  mock2: { max: null, mock: { field: '' } },
  mock3: {
    aggregations: {},
    terms: {},
    sum_bucket: {},
  },
};

// Mock for networkTrafficWithInterfaces pattern (direct interface rate)
const directInterfaceRateMock: MetricsUIAggregation = {
  rx_interfaces: {
    terms: { field: 'system.network.name' },
    aggregations: {
      rx_interface_max: { max: { field: 'system.network.in.bytes' } },
    },
  },
  rx_sum_of_interfaces: {
    sum_bucket: {
      buckets_path: 'rx_interfaces>rx_interface_max',
    },
  },
  rx_deriv: {
    derivative: {
      buckets_path: 'rx_sum_of_interfaces',
      gap_policy: 'skip',
      unit: '1s',
    },
  },
  rx: {
    bucket_script: {
      buckets_path: { value: 'rx_deriv[normalized_value]' },
      script: {
        source: 'params.value > 0.0 ? params.value : 0.0',
        lang: 'painless',
      },
      gap_policy: 'skip',
    },
  },
};

// Mock for networkTrafficWithInterfacesWithFilter pattern (filter-wrapped interface rate)
const filteredInterfaceRateMock: MetricsUIAggregation = {
  rxv2_dimension: {
    filter: {
      term: {
        direction: 'receive',
      },
    },
    aggs: {
      rxv2_interfaces: {
        terms: { field: 'device' },
        aggregations: {
          rxv2_interface_max: { max: { field: 'system.network.io' } },
        },
      },
      rxv2_sum_of_interfaces: {
        sum_bucket: {
          buckets_path: 'rxV2_interfaces>rxv2_interface_max',
        },
      },
    },
  },
  rxv2_deriv: {
    derivative: {
      buckets_path: 'rxV2_dimension>rxv2_sum_of_interfaces',
      gap_policy: 'skip',
      unit: '1s',
    },
  },
  rxV2: {
    bucket_script: {
      buckets_path: { value: 'rxV2_deriv[normalized_value]' },
      script: {
        source: 'params.value > 0.0 ? params.value : 0.0',
        lang: 'painless',
      },
      gap_policy: 'skip',
    },
  },
};

describe('isRate', () => {
  describe('isMetricRate', () => {
    it('should return false when metric is undefined', () => {
      expect(isMetricRate(undefined)).toEqual(false);
    });
    it('should return true when correct metric is passed', () => {
      expect(isMetricRate(metricMock)).toEqual(true);
    });
  });

  describe('isCustomMetricRate', () => {
    it("should return false when aggregation isn't 'rate'", () => {
      expect(isCustomMetricRate(customMaxMetricMock)).toEqual(false);
    });
    it("should return true when aggregation is equal to 'rate'", () => {
      expect(isCustomMetricRate(customRateMetricMock)).toEqual(true);
    });
  });

  describe('isInterfaceRateAgg', () => {
    it('should return false if metric is undefined', () => {
      expect(isInterfaceRateAgg(undefined)).toEqual(false);
    });
    it('should return true for direct interface rate pattern', () => {
      expect(isInterfaceRateAgg(directInterfaceRateMock)).toEqual(true);
    });
    it('should return true for filter-wrapped interface rate pattern', () => {
      expect(isInterfaceRateAgg(filteredInterfaceRateMock)).toEqual(true);
    });
    it('should return false for non-interface rate metrics', () => {
      expect(isInterfaceRateAgg({ simple_max: { max: { field: 'test' } } })).toEqual(false);
    });
  });

  describe('isFilteredInterfaceRateAgg', () => {
    it('should return false if metric is undefined', () => {
      expect(isFilteredInterfaceRateAgg(undefined)).toEqual(false);
    });
    it('should return false for direct interface rate pattern', () => {
      expect(isFilteredInterfaceRateAgg(directInterfaceRateMock)).toEqual(false);
    });
    it('should return true for filter-wrapped interface rate pattern', () => {
      expect(isFilteredInterfaceRateAgg(filteredInterfaceRateMock)).toEqual(true);
    });
    it('should return false for non-interface rate metrics', () => {
      expect(isFilteredInterfaceRateAgg({ simple_max: { max: { field: 'test' } } })).toEqual(false);
    });
  });

  describe('getInterfaceRateFields', () => {
    it('should return null if metric is undefined', () => {
      expect(getInterfaceRateFields(undefined, 'rx')).toEqual(null);
    });

    it('should return null for non-interface rate metrics', () => {
      expect(getInterfaceRateFields({ simple_max: { max: { field: 'test' } } }, 'test')).toEqual(
        null
      );
    });

    it('should extract fields from direct interface rate pattern', () => {
      const result = getInterfaceRateFields(directInterfaceRateMock, 'rx');
      expect(result).toEqual({
        field: 'system.network.in.bytes',
        interfaceField: 'system.network.name',
      });
      expect(result?.filter).toBeUndefined();
    });

    it('should extract fields and filter from filter-wrapped interface rate pattern', () => {
      const result = getInterfaceRateFields(filteredInterfaceRateMock, 'rxv2');
      expect(result).toEqual({
        field: 'system.network.io',
        interfaceField: 'device',
        filter: {
          term: {
            direction: 'receive',
          },
        },
      });
    });
  });

  describe('isRate', () => {
    it('should return false when incorrect metrics are provided', () => {
      expect(isRate({} as MetricsUIAggregation, {} as SnapshotCustomMetricInput)).toEqual(false);
    });

    it('should return true when proper metric are provided', () => {
      expect(isRate(metricMock, customRateMetricMock)).toEqual(true);
    });

    it('should return true for direct interface rate pattern', () => {
      expect(isRate(directInterfaceRateMock)).toEqual(true);
    });

    it('should return true for filter-wrapped interface rate pattern', () => {
      expect(isRate(filteredInterfaceRateMock)).toEqual(true);
    });
  });
});
