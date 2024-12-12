/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleTypeParams } from '@kbn/alerting-plugin/common';
import { Dependency } from '../../../common/types';

type DurationUnit = 'm' | 'h' | 'd' | 'w' | 'M';

interface Duration {
  value: number;
  unit: DurationUnit;
}

interface WindowSchema {
  id: string;
  burnRateThreshold: number;
  maxBurnRateThreshold: number;
  longWindow: Duration;
  shortWindow: Duration;
  actionGroup: string;
}

interface BurnRateRuleParams extends RuleTypeParams {
  sloId: string;
  windows: WindowSchema[];
  dependencies?: Dependency[];
}

interface ChartData {
  key: number;
  value: number | undefined;
}

export type { BurnRateRuleParams, ChartData, Duration, DurationUnit, WindowSchema, Dependency };
