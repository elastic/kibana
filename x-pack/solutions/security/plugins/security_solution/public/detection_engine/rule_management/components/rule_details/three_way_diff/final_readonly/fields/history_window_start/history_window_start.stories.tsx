/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { HistoryWindowStartReadOnly } from './history_window_start';

export default {
  component: HistoryWindowStartReadOnly,
  title:
    'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FieldReadOnly/history_window_start',
};

export const Default = () => <HistoryWindowStartReadOnly historyWindowStart="now-14d" />;
