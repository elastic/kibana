/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThreatIndexReadOnly } from './threat_index';

export default {
  component: ThreatIndexReadOnly,
  title: 'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FieldReadOnly/threat_index',
};

export const Default = () => <ThreatIndexReadOnly threatIndex={['logs-ti_*', 'logs-defend_*']} />;

export const EmptyArrayValue = () => <ThreatIndexReadOnly threatIndex={[]} />;
