/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import type { Watch, WatchSchedule } from '@kbn/pnd-common';
import * as i18n from '../translations';

interface SchedulePanelProps {
  watch: Watch;
  onScheduleChange: (schedule: WatchSchedule) => void;
}

export const SchedulePanel: React.FC<SchedulePanelProps> = ({ watch }) => {
  const schedule = watch.schedule;
  const items = [
    { title: i18n.SCHEDULE_TITLE, description: String(schedule.mode) },
    {
      title: i18n.SCHEDULE_SUBTITLE,
      description: `${schedule.from}:00–${schedule.to}:00`,
    },
    { title: i18n.COL_STATUS, description: String(schedule.cadence) },
  ];

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="pndSchedulePanel">
      <EuiDescriptionList type="column" listItems={items} />
      <EuiSpacer size="s" />
      <EuiText size="xs" color="subdued">
        <p>{i18n.SCHEDULE_PROJECTION_NOTE}</p>
      </EuiText>
    </EuiPanel>
  );
};
