/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RuleNameOverrideReadOnly } from './rule_name_override';

export default {
  component: RuleNameOverrideReadOnly,
  title:
    'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FieldReadOnly/rule_name_override',
};

export const Default = () => (
  <RuleNameOverrideReadOnly ruleNameOverride={{ field_name: 'event.action' }} />
);

export const EmptyStringValue = () => (
  <RuleNameOverrideReadOnly ruleNameOverride={{ field_name: '' }} />
);

export const NoValue = () => <RuleNameOverrideReadOnly />;
