/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import type { AttackDiscoverySchedule } from '@kbn/elastic-assistant-common';

import * as i18n from './translations';
import type { TableColumn } from './constants';

interface NameProps {
  schedule: AttackDiscoverySchedule;
  openScheduleDetails: (scheduleId: string) => void;
}

const Name = ({ schedule, openScheduleDetails }: NameProps) => {
  return (
    <EuiLink
      onClick={() => {
        openScheduleDetails(schedule.id);
      }}
      data-test-subj="scheduleName"
    >
      {schedule.name}
    </EuiLink>
  );
};

export const createNameColumn = ({
  openScheduleDetails,
}: {
  openScheduleDetails: (scheduleId: string) => void;
}): TableColumn => {
  return {
    field: 'name',
    name: i18n.COLUMN_NAME,
    render: (_, schedule: AttackDiscoverySchedule) => (
      <Name schedule={schedule} openScheduleDetails={openScheduleDetails} />
    ),
    truncateText: true,
    width: '60%',
    align: 'left',
  };
};
