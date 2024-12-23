/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import type { RuleConditionChartProps } from './rule_condition_chart';

const RuleConditionChartLazy = lazy(() => import('./rule_condition_chart'));

export function RuleConditionChart(props: RuleConditionChartProps) {
  return (
    <Suspense fallback={null}>
      <RuleConditionChartLazy {...props} />
    </Suspense>
  );
}
