/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { UserRowData } from './types';
import type { VisualizationStackByOption } from '../esql_dashboard_panel/esql_dashboard_panel';

export const PAGE_SIZE = 10;
export const CURRENT_TIME = moment();

export const GRANTED_RIGHTS_DATA: UserRowData[] = [
  {
    user: 'admin-1',
    target: 'user-12345',
    right: 'Local Administrator',
    ip: '192.125.52.245',
    quantity: 30,
  },
  {
    user: 'bhusa-win1',
    target: 'jdoe_admin',
    right: 'Global Administrator',
    ip: '143.235.125.123',
    quantity: 25,
  },
  {
    user: 'james-os',
    target: 'm.smith_sec',
    right: 'Security Administrator',
    ip: '192.186.23.253',
    quantity: 15,
  },
  {
    user: 'admin-2',
    target: 'r.wilson',
    right: 'Domain Administrator',
    ip: '192.186.23.253',
    quantity: 16,
  },
  {
    user: 'es01',
    target: 'it_support01',
    right: 'Server Operator',
    ip: '192.186.23.253',
    quantity: 12,
  },
  {
    user: 'monina-mac',
    target: 'adm-xliu',
    right: 'Billing Administrator',
    ip: '192.186.23.253',
    quantity: 11,
  },
  {
    user: 'tin',
    target: 'jane199012',
    right: 'Local Administrator',
    ip: '143.235.125.123',
    quantity: 9,
  },
  {
    user: 'monina',
    target: 'andrew.li',
    right: 'Local Administrator',
    ip: '143.235.125.123',
    quantity: 8,
  },
];

export const GRANTED_RIGHTS_STACK_BY_OPTIONS: VisualizationStackByOption[] = [
  {
    text: 'Privileged User',
    value: 'privileged_user',
  },
  {
    text: 'Target user',
    value: 'target_user',
  },
  {
    text: 'Granted right',
    value: 'right',
  },
  {
    text: 'Source IP',
    value: 'ip',
  },
];
