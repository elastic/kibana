/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiEmptyPrompt } from '@elastic/eui';

import { IconSparkles } from '../../../../../common/icons/sparkles';
import * as i18n from './translations';

export const NO_SCHEDULES_DATA_TEST_ID = 'emptyResultsNoSchedules';

interface NoSchedulesProps {
  /** Callback to open the schedules flyout */
  openSchedulesFlyout: () => void;
}

/**
 * Renders the empty state when there are no schedules configured.
 */
export const NoSchedules: React.FC<NoSchedulesProps> = React.memo(({ openSchedulesFlyout }) => {
  return (
    <EuiEmptyPrompt
      data-test-subj={NO_SCHEDULES_DATA_TEST_ID}
      icon={<IconSparkles />}
      title={<h2>{i18n.NO_SCHEDULES_TITLE}</h2>}
      body={<p>{i18n.NO_SCHEDULES_BODY}</p>}
      actions={
        <EuiButtonEmpty color="primary" size="m" iconType="calendar" onClick={openSchedulesFlyout}>
          {i18n.NO_SCHEDULES_ACTION}
        </EuiButtonEmpty>
      }
    />
  );
});
NoSchedules.displayName = 'NoSchedules';
