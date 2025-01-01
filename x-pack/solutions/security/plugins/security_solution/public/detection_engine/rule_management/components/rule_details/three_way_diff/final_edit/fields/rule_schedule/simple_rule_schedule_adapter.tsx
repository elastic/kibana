/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { UseField } from '../../../../../../../../shared_imports';
import { ScheduleItemField } from '../../../../../../../rule_creation/components/schedule_item_field';

export function SimpleRuleScheduleAdapter(): JSX.Element {
  return (
    <>
      <UseField
        path="interval"
        component={ScheduleItemField}
        componentProps={INTERVAL_COMPONENT_PROPS}
      />
      <UseField
        path="lookback"
        component={ScheduleItemField}
        componentProps={LOOKBACK_COMPONENT_PROPS}
      />
    </>
  );
}

const INTERVAL_COMPONENT_PROPS = {
  minValue: 1,
};

const LOOKBACK_COMPONENT_PROPS = {
  minValue: 1,
};
