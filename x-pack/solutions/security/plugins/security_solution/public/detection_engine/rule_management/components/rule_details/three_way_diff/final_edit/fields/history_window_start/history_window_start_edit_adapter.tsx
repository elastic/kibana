/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { HistoryWindowStartEdit } from '../../../../../../../rule_creation/components/history_window_start_edit';

export function HistoryWindowStartEditAdapter(): JSX.Element {
  return <HistoryWindowStartEdit path="historyWindowSize" />;
}
