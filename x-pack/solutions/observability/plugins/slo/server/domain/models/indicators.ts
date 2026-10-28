/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  apmTransactionDurationIndicatorSchema,
  apmTransactionErrorRateIndicatorSchema,
  indicatorSchema,
  indicatorTypesSchema,
  kqlCustomIndicatorSchema,
  metricCustomIndicatorSchema,
} from '@kbn/slo-schema';
import type { z } from '@kbn/zod';

type APMTransactionErrorRateIndicator = z.output<typeof apmTransactionErrorRateIndicatorSchema>;
type APMTransactionDurationIndicator = z.output<typeof apmTransactionDurationIndicatorSchema>;
type KQLCustomIndicator = z.output<typeof kqlCustomIndicatorSchema>;
type MetricCustomIndicator = z.output<typeof metricCustomIndicatorSchema>;
type Indicator = z.output<typeof indicatorSchema>;
type IndicatorTypes = z.output<typeof indicatorTypesSchema>;

export type {
  Indicator,
  IndicatorTypes,
  APMTransactionErrorRateIndicator,
  APMTransactionDurationIndicator,
  KQLCustomIndicator,
  MetricCustomIndicator,
};
