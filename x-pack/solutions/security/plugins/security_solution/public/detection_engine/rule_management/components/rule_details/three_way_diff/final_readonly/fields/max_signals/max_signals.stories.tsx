/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MaxSignalsReadOnly } from './max_signals';

export default {
  component: MaxSignalsReadOnly,
  title: 'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FieldReadOnly/max_signals',
};

export const Default = () => <MaxSignalsReadOnly maxSignals={100} />;
