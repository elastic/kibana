/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AlertSuppressionReadOnly } from './alert_suppression';
import { ThreeWayDiffStorybookProviders } from '../../storybook/three_way_diff_storybook_providers';

export default {
  component: AlertSuppressionReadOnly,
  title:
    'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FieldReadOnly/alert_suppression',
};

export const OtherRuleTypes = () => (
  <ThreeWayDiffStorybookProviders>
    <AlertSuppressionReadOnly
      ruleType="query"
      alertSuppression={{
        group_by: ['host.name'],
        duration: { value: 5, unit: 'm' },
        missing_fields_strategy: 'suppress',
      }}
    />
  </ThreeWayDiffStorybookProviders>
);

export const Threshold = () => (
  <ThreeWayDiffStorybookProviders>
    <AlertSuppressionReadOnly
      ruleType="threshold"
      alertSuppression={{
        duration: { value: 5, unit: 'm' },
      }}
    />
  </ThreeWayDiffStorybookProviders>
);

export const EmptyValue = () => <AlertSuppressionReadOnly ruleType="query" />;
