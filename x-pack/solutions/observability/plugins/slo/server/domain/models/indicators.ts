/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  apmTransactionDurationIndicatorSchema,
  apmTransactionErrorRateIndicatorSchema,
  esqlCustomIndicatorSchema,
  indicatorSchema,
  indicatorTypesSchema,
  kqlCustomIndicatorSchema,
  metricCustomIndicatorSchema,
} from '@kbn/slo-schema';
import type * as t from 'io-ts';

type APMTransactionErrorRateIndicator = t.TypeOf<typeof apmTransactionErrorRateIndicatorSchema>;
type APMTransactionDurationIndicator = t.TypeOf<typeof apmTransactionDurationIndicatorSchema>;
type KQLCustomIndicator = t.TypeOf<typeof kqlCustomIndicatorSchema>;
type MetricCustomIndicator = t.TypeOf<typeof metricCustomIndicatorSchema>;
type EsqlCustomIndicator = t.TypeOf<typeof esqlCustomIndicatorSchema>;
type Indicator = t.TypeOf<typeof indicatorSchema>;
type IndicatorTypes = t.TypeOf<typeof indicatorTypesSchema>;

const ESQL_INDICATOR_TYPE = 'sli.esql.custom' as const;

const isEsqlIndicatorType = (indicatorType: string): boolean =>
  indicatorType === ESQL_INDICATOR_TYPE;

export { ESQL_INDICATOR_TYPE, isEsqlIndicatorType };

export type {
  Indicator,
  IndicatorTypes,
  APMTransactionErrorRateIndicator,
  APMTransactionDurationIndicator,
  KQLCustomIndicator,
  MetricCustomIndicator,
  EsqlCustomIndicator,
};
