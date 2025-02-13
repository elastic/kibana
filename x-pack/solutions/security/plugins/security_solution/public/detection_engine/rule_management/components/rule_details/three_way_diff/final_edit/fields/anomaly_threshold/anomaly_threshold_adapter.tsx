/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AnomalyThresholdEdit } from '../../../../../../../rule_creation/components/anomaly_threshold_edit';

export function AnomalyThresholdAdapter(): JSX.Element {
  return <AnomalyThresholdEdit path="anomaly_threshold" />;
}
