/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThreatIndicatorPathReadOnly } from './threat_indicator_path';

export default {
  component: ThreatIndicatorPathReadOnly,
  title:
    'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FieldReadOnly/threat_indicator_path',
};

export const Default = () => <ThreatIndicatorPathReadOnly threatIndicatorPath="threat.indicator" />;

export const NoValue = () => <ThreatIndicatorPathReadOnly />;
