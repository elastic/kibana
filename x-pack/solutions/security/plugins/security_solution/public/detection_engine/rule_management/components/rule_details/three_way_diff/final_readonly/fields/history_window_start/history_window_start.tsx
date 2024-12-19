/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import * as ruleDetailsI18n from '../../../../translations';
import type { HistoryWindowStart as HistoryWindowStartType } from '../../../../../../../../../common/api/detection_engine';
import { HistoryWindowSize } from '../../../../rule_definition_section';

interface HistoryWindowStartReadOnlyProps {
  historyWindowStart: HistoryWindowStartType;
}

export function HistoryWindowStartReadOnly({
  historyWindowStart,
}: HistoryWindowStartReadOnlyProps) {
  return (
    <EuiDescriptionList
      listItems={[
        {
          title: ruleDetailsI18n.HISTORY_WINDOW_SIZE_FIELD_LABEL,
          description: <HistoryWindowSize historyWindowStart={historyWindowStart} />,
        },
      ]}
    />
  );
}
