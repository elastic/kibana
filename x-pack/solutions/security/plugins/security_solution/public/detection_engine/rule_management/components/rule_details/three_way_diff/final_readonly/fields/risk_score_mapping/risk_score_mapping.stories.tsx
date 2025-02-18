/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RiskScoreMappingReadOnly } from './risk_score_mapping';

export default {
  component: RiskScoreMappingReadOnly,
  title:
    'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FieldReadOnly/risk_score_mapping',
};

export const Default = () => (
  <RiskScoreMappingReadOnly
    riskScoreMapping={[{ field: 'event.risk_score', operator: 'equals', value: '' }]}
  />
);

export const EmptyArrayValue = () => <RiskScoreMappingReadOnly riskScoreMapping={[]} />;
