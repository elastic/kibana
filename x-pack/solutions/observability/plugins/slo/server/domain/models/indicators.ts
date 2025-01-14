/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type apmTransactionDurationIndicatorSchema,
  type apmTransactionErrorRateIndicatorSchema,
  type indicatorSchema,
  type indicatorTypesSchema,
  type kqlCustomIndicatorSchema,
  type metricCustomIndicatorSchema,
} from '@kbn/slo-schema';
import type * as t from 'io-ts';

type APMTransactionErrorRateIndicator = t.TypeOf<typeof apmTransactionErrorRateIndicatorSchema>;
type APMTransactionDurationIndicator = t.TypeOf<typeof apmTransactionDurationIndicatorSchema>;
type KQLCustomIndicator = t.TypeOf<typeof kqlCustomIndicatorSchema>;
type MetricCustomIndicator = t.TypeOf<typeof metricCustomIndicatorSchema>;
type Indicator = t.TypeOf<typeof indicatorSchema>;
type IndicatorTypes = t.TypeOf<typeof indicatorTypesSchema>;

export type {
  Indicator,
  IndicatorTypes,
  APMTransactionErrorRateIndicator,
  APMTransactionDurationIndicator,
  KQLCustomIndicator,
  MetricCustomIndicator,
};
