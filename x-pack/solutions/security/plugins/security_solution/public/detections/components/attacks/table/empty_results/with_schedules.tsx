/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiEmptyPrompt, EuiIcon } from '@elastic/eui';

import * as i18n from './translations';

export const WITH_SCHEDULES_DATA_TEST_ID = 'emptyResultsWithSchedules';

interface WithSchedulesProps {
  /** Callback to open the schedules flyout */
  openSchedulesFlyout: () => void;
}

/**
 * Renders the empty state when there are schedules configured but no attacks found.
 */
export const WithSchedules: React.FC<WithSchedulesProps> = React.memo(({ openSchedulesFlyout }) => {
  return (
    <EuiEmptyPrompt
      data-test-subj={WITH_SCHEDULES_DATA_TEST_ID}
      icon={<EuiIcon type={'pageSelect'} />}
      title={<h2>{i18n.WITH_SCHEDULES_TITLE}</h2>}
      body={<p>{i18n.WITH_SCHEDULES_BODY}</p>}
      actions={
        <EuiButtonEmpty color="primary" size="m" iconType="calendar" onClick={openSchedulesFlyout}>
          {i18n.WITH_SCHEDULES_ACTION}
        </EuiButtonEmpty>
      }
    />
  );
});
WithSchedules.displayName = 'WithSchedules';
