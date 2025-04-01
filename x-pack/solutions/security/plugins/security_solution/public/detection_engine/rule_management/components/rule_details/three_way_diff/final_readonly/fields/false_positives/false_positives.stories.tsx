/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FalsePositivesReadOnly } from './false_positives';

export default {
  component: FalsePositivesReadOnly,
  title: 'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FieldReadOnly/false_positives',
};

export const Default = () => (
  <FalsePositivesReadOnly
    falsePositives={[
      'WAF rules or rule groups may be deleted by a system or network administrator. Verify whether the user identity, user agent, and/or hostname should be making changes in your environment. Rule deletions by unfamiliar users or hosts should be investigated. If known behavior is causing false positives, it can be exempted from the rule.',
      'Uncommon user command activity can be due to an engineer logging onto a server instance in order to perform manual troubleshooting or reconfiguration.',
    ]}
  />
);

export const NoValue = () => <FalsePositivesReadOnly falsePositives={[]} />;
