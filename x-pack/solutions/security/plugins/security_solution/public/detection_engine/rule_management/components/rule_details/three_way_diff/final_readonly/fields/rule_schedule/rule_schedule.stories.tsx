/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RuleScheduleReadOnly } from './rule_schedule';

export default {
  component: RuleScheduleReadOnly,
  title: 'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FieldReadOnly/rule_schedule',
};

export const Default = () => (
  <RuleScheduleReadOnly
    ruleSchedule={{
      interval: '5m',
      from: 'now-360s',
      to: 'now',
    }}
  />
);
