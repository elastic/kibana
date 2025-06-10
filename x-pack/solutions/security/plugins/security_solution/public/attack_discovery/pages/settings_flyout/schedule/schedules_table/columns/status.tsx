/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { AttackDiscoverySchedule } from '@kbn/elastic-assistant-common';
import * as i18n from './translations';
import type { TableColumn } from './constants';
import { StatusBadge } from '../../common/status_badge';

export const createStatusColumn = (): TableColumn => {
  return {
    field: 'status',
    name: i18n.COLUMN_STATUS,
    render: (_, schedule: AttackDiscoverySchedule) => <StatusBadge schedule={schedule} />,
    truncateText: true,
    width: '100px',
  };
};
