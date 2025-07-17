/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiToolTip } from '@elastic/eui';
import React, { useCallback } from 'react';

import { SCHEDULE_TAB_ID } from '../../settings_flyout/constants';
import * as i18n from './translations';

interface Props {
  isLoading: boolean;
  openFlyout: (tabId: string) => void;
}

const ScheduleComponent: React.FC<Props> = ({ isLoading, openFlyout }) => {
  const onClick = useCallback(
    () => openFlyout(SCHEDULE_TAB_ID), // Open the schedule tab in the flyout
    [openFlyout]
  );

  return (
    <EuiToolTip content={i18n.SCHEDULE_TOOLTIP} data-test-subj="scheduleTooltip" position="bottom">
      <EuiButton
        color="primary"
        data-test-subj="schedule"
        fill
        iconType="calendar"
        isDisabled={isLoading}
        onClick={onClick}
      >
        {i18n.SCHEDULE}
      </EuiButton>
    </EuiToolTip>
  );
};

ScheduleComponent.displayName = 'Schedule';

export const Schedule = React.memo(ScheduleComponent);
