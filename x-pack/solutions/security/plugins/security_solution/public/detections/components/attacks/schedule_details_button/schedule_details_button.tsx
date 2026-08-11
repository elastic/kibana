/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButtonIcon, EuiFlexItem, EuiToolTip } from '@elastic/eui';

import * as i18n from './translations';

export interface ScheduleDetailsButtonProps {
  onClick: () => void;
}

export const ScheduleDetailsButton = React.memo<ScheduleDetailsButtonProps>(({ onClick }) => {
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onClick();
    },
    [onClick]
  );

  return (
    <EuiFlexItem grow={false}>
      <EuiToolTip
        content={i18n.SCHEDULED_ATTACK_DISCOVERY}
        data-test-subj="scheduledTooltip"
        position="top"
      >
        <EuiButtonIcon
          aria-label={i18n.OPEN_SCHEDULE_DETAILS}
          data-test-subj="scheduleButton"
          iconType="calendar"
          onClick={handleClick}
          size="xs"
        />
      </EuiToolTip>
    </EuiFlexItem>
  );
});
ScheduleDetailsButton.displayName = 'ScheduleDetailsButton';
