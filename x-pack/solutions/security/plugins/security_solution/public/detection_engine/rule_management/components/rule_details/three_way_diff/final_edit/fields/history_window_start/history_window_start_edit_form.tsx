/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { type FormData } from '../../../../../../../../shared_imports';
import { HistoryWindowStartEditAdapter } from './history_window_start_edit_adapter';
import type { HistoryWindowStart } from '../../../../../../../../../common/api/detection_engine';
import {
  convertDurationToDateMath,
  convertDateMathToDuration,
} from '../../../../../../../../common/utils/date_math';
import { DEFAULT_HISTORY_WINDOW_SIZE } from '../../../../../../../../common/constants';
import { RuleFieldEditFormWrapper } from '../../../field_final_side';

export function HistoryWindowStartEditForm(): JSX.Element {
  return (
    <RuleFieldEditFormWrapper
      component={HistoryWindowStartEditAdapter}
      ruleFieldFormSchema={schema}
      deserializer={deserializer}
      serializer={serializer}
    />
  );
}

interface HistoryWindowFormData {
  historyWindowSize: HistoryWindowStart;
}

function deserializer(defaultValue: FormData): HistoryWindowFormData {
  return {
    historyWindowSize: defaultValue.history_window_start
      ? convertDateMathToDuration(defaultValue.history_window_start)
      : DEFAULT_HISTORY_WINDOW_SIZE,
  };
}

function serializer(formData: FormData): { history_window_start: HistoryWindowStart } {
  return {
    history_window_start: convertDurationToDateMath(formData.historyWindowSize),
  };
}

const schema = {};
