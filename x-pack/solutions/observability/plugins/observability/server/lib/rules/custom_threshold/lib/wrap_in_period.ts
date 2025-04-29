/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { CustomMetricExpressionParams } from '../../../../../common/custom_threshold_rule/types';

export const createLastPeriod = (
  lastPeriodEnd: number,
  { timeUnit, timeSize }: CustomMetricExpressionParams,
  timeFieldName: string
) => {
  const start = moment(lastPeriodEnd).subtract(timeSize, timeUnit).toISOString();
  return {
    lastPeriod: {
      filter: {
        range: {
          [timeFieldName]: {
            gte: start,
            lte: moment(lastPeriodEnd).toISOString(),
          },
        },
      },
    },
  };
};

export const wrapInCurrentPeriod = <Aggs extends {}>(
  timeframe: { start: number; end: number; timeFieldName: string },
  aggs: Aggs
) => {
  return {
    currentPeriod: {
      filters: {
        filters: {
          all: {
            range: {
              [timeframe.timeFieldName]: {
                gte: moment(timeframe.start).toISOString(),
                lte: moment(timeframe.end).toISOString(),
              },
            },
          },
        },
      },
      aggs,
    },
  };
};
