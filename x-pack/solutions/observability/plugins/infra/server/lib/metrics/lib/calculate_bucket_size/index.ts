/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { MetricsAPITimerange } from '@kbn/metrics-data-access-plugin/common';
import { calculateAuto } from './calculate_auto';
import {
  getUnitValue,
  parseInterval,
  convertIntervalToUnit,
  ASCENDING_UNIT_ORDER,
} from './unit_to_seconds';
import { INTERVAL_STRING_RE, GTE_INTERVAL_RE } from './interval_regex';

const BUCKET_SIZE = 100;

const calculateBucketData = (intervalString: string) => {
  const intervalStringMatch = intervalString.match(INTERVAL_STRING_RE);

  if (!intervalStringMatch) {
    throw new Error('Unable to parse interval string');
  }

  const parsedInterval = parseInterval(intervalString);

  if (!parsedInterval) {
    throw new Error('Unable to parse interval string');
  }

  let bucketSize = Number(intervalStringMatch[1]) * getUnitValue(intervalStringMatch[2]);

  // don't go too small
  if (bucketSize < 1) {
    bucketSize = 1;
  }

  // Check decimal
  if (parsedInterval.value && parsedInterval.value % 1 !== 0) {
    if (parsedInterval.unit && parsedInterval.unit !== 'ms') {
      const { value, unit } = convertIntervalToUnit(
        intervalString,
        ASCENDING_UNIT_ORDER[ASCENDING_UNIT_ORDER.indexOf(parsedInterval.unit) - 1]
      );

      if (value && unit) {
        intervalString = value + unit;
      } else {
        intervalString = '1ms';
      }
    } else {
      intervalString = '1ms';
    }
  }

  return {
    bucketSize,
    intervalString,
  };
};

const calculateBucketSizeForAutoInterval = (timerange: MetricsAPITimerange): number | undefined => {
  const duration = moment.duration(timerange.to - timerange.from, 'ms');
  const bucketSizeDuration = calculateAuto.near(BUCKET_SIZE, duration);

  if (bucketSizeDuration) {
    return bucketSizeDuration.asSeconds();
  }
};

export const calculateBucketSize = (timerange: MetricsAPITimerange) => {
  const bucketSize = calculateBucketSizeForAutoInterval(timerange);
  let intervalString = `${bucketSize}s`;

  const gteAutoMatch = timerange.interval.match(GTE_INTERVAL_RE);

  if (gteAutoMatch) {
    const bucketData = calculateBucketData(gteAutoMatch[1]);
    if (bucketSize && bucketData.bucketSize >= bucketSize) {
      return bucketData;
    }
  }

  const matches = timerange.interval.match(INTERVAL_STRING_RE);
  if (matches) {
    intervalString = timerange.interval;
  }

  return calculateBucketData(intervalString);
};
