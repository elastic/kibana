/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';
import { useGlobalTime } from '../../../common/containers/use_global_time';

/**
 * This function computes the appropriate interval (length of time, in hours) of each bucket of the heatmap in a given timerange.
 * At most, we will compute 30 buckets, and the interval will be evenly distributed across those 30.
 * However, the lowest possible interval that will return is 3 (which equates to 3 hours), which means it is possible
 * for fewer buckets than 30.
 *
 * An optional `timeRangeOverride` can be supplied on surfaces that hide the
 * global date picker (e.g. the Entity Analytics home page) to compute the
 * interval over a fixed range instead of the global picker's range. Values
 * may be either absolute ISO strings or relative datemath expressions like
 * `"now-30d"`.
 *
 * @return a number representing the number of hours per interval.
 */
export const useIntervalForHeatmap = (timeRangeOverride?: { from: string; to: string }) => {
  const { from: globalFrom, to: globalTo } = useGlobalTime();

  const from = timeRangeOverride?.from ?? globalFrom;
  const to = timeRangeOverride?.to ?? globalTo;

  const resolveToMillis = (value: string): number => {
    const parsed = datemath.parse(value)?.valueOf();
    if (typeof parsed === 'number' && Number.isFinite(parsed)) {
      return parsed;
    }
    const native = new Date(value).getTime();
    return Number.isFinite(native) ? native : Date.now();
  };

  const millisecondsToHours = (millis: number) => {
    return Number((millis / (1000 * 60 * 60)).toFixed(0));
  };

  const maximumNumberOfBuckets = 30;
  const minimumNumberOfBucketInterval = 3;
  const hoursInRange = millisecondsToHours(resolveToMillis(to) - resolveToMillis(from));
  const bucketInterval = Number((hoursInRange / maximumNumberOfBuckets).toFixed(0));
  return bucketInterval < minimumNumberOfBucketInterval
    ? minimumNumberOfBucketInterval
    : bucketInterval;
};
