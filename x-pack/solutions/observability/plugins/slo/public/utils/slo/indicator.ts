/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Indicator } from '@kbn/slo-schema';
import {
  is,
  apmTransactionDurationIndicatorSchemaZod,
  apmTransactionErrorRateIndicatorSchemaZod,
} from '@kbn/slo-schema';

export const isApmIndicatorType = (indicator: Indicator): boolean =>
  is(apmTransactionDurationIndicatorSchemaZod, indicator) ||
  is(apmTransactionErrorRateIndicatorSchemaZod, indicator);
