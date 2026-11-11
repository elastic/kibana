/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ApplicationUsageResponse,
  Breakdowns,
  DeviceName,
} from '../../../../common/types/usage';
import { firstBucketKey, getP75 } from '../../../lib/helpers/aggregations';
import type { UsageAggregations, DeviceBucket } from './search_response';

const toDeviceName = ({ key, key_as_string: keyAsString }: DeviceBucket): DeviceName => {
  return key === 1 || key === 'true' || keyAsString === 'true' ? 'mobile' : 'desktop';
};

const toBreakdowns = (logs?: UsageAggregations): Breakdowns => {
  const pageLoads = logs?.inEnvironment.pageLoads;
  const toItems = (buckets: Array<{ key: string | number; doc_count: number }> = []) => {
    return buckets.map(({ key, doc_count: count }) => {
      return { name: String(key), pageLoads: count };
    });
  };

  return {
    pageLoads: pageLoads?.doc_count ?? 0,
    browsers: toItems(pageLoads?.browsers.buckets),
    operatingSystems: toItems(pageLoads?.operatingSystems.buckets),
    devices: (pageLoads?.devices.buckets ?? []).map((bucket) => {
      return {
        name: toDeviceName(bucket),
        pageLoads: bucket.doc_count,
      };
    }),
  };
};

/**
 * What users load and do; missing aggregations (indices that do not exist) map to empty lists and
 * `null` percentiles.
 */
export const toUsage = (logs?: UsageAggregations): ApplicationUsageResponse => {
  const metrics = logs?.inEnvironment;
  return {
    topPages: (metrics?.pageLoads.topPages.buckets ?? []).map(
      ({ key, doc_count: pageLoads, loadTime }) => {
        return {
          url: String(key),
          pageLoads,
          loadTimeP75Ms: getP75(loadTime),
        };
      }
    ),
    breakdowns: toBreakdowns(logs),
    topClicks: (metrics?.clicks.selectors.buckets ?? []).map(
      ({ key, doc_count: count, tagName }) => {
        return {
          cssSelector: String(key),
          tagName: firstBucketKey(tagName),
          count,
        };
      }
    ),
    totalClicks: metrics?.clicks.doc_count ?? 0,
  };
};
