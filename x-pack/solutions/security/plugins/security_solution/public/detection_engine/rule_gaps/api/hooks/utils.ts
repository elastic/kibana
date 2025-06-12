/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { GapRangeValue } from '../../constants';

export const getGapRange = (gapRange: GapRangeValue) => {
  const now = moment();
  let duration: moment.Duration;

  switch (gapRange) {
    case GapRangeValue.LAST_24_H:
      duration = moment.duration(24, 'hours');
      break;
    case GapRangeValue.LAST_3_D:
      duration = moment.duration(3, 'days');
      break;
    case GapRangeValue.LAST_7_D:
      duration = moment.duration(7, 'days');
      break;
  }

  const start = now.clone().subtract(duration).toISOString();
  const end = now.toISOString();

  return { start, end };
};
