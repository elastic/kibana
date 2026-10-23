/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  apmTransactionDurationIndicatorSchemaZod,
  apmTransactionErrorRateIndicatorSchemaZod,
  indicatorSchemaZod,
  indicatorTypesSchemaZod,
  kqlCustomIndicatorSchemaZod,
  metricCustomIndicatorSchemaZod,
} from '@kbn/slo-schema';
import type { z } from '@kbn/zod';

type APMTransactionErrorRateIndicator = z.output<typeof apmTransactionErrorRateIndicatorSchemaZod>;
type APMTransactionDurationIndicator = z.output<typeof apmTransactionDurationIndicatorSchemaZod>;
type KQLCustomIndicator = z.output<typeof kqlCustomIndicatorSchemaZod>;
type MetricCustomIndicator = z.output<typeof metricCustomIndicatorSchemaZod>;
type Indicator = z.output<typeof indicatorSchemaZod>;
type IndicatorTypes = z.output<typeof indicatorTypesSchemaZod>;

export type {
  Indicator,
  IndicatorTypes,
  APMTransactionErrorRateIndicator,
  APMTransactionDurationIndicator,
  KQLCustomIndicator,
  MetricCustomIndicator,
};
