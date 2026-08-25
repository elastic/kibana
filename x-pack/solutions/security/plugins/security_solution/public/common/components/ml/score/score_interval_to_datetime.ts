/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { Anomaly } from '../types';

export interface FromTo {
  from: string;
  to: string;
}

export const scoreIntervalToDateTime = (score: Anomaly, interval: string): FromTo => {
  if (interval === 'second' || interval === 'minute' || interval === 'hour') {
    return {
      from: moment(score.time).subtract(1, 'hour').toISOString(),
      to: moment(score.time).add(1, 'hour').toISOString(),
    };
  } else {
    // default should be a day
    return {
      from: moment(score.time).subtract(1, 'day').toISOString(),
      to: moment(score.time).add(1, 'day').toISOString(),
    };
  }
};
