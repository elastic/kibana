/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import {
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
  ALERT_STATUS_UNTRACKED,
} from '@kbn/rule-data-utils';
import type { Filter } from '@kbn/es-query';
import { ALERT_STATUS_ALL } from './constants';

export type Maybe<T> = T | null | undefined;

export const alertWorkflowStatusRt = t.keyof({
  open: null,
  acknowledged: null,
  closed: null,
});
export type AlertWorkflowStatus = t.TypeOf<typeof alertWorkflowStatusRt>;

export interface ApmIndicesConfig {
  error: string;
  onboarding: string;
  span: string;
  transaction: string;
  metric: string;
}

export type AlertStatus =
  | typeof ALERT_STATUS_ACTIVE
  | typeof ALERT_STATUS_RECOVERED
  | typeof ALERT_STATUS_UNTRACKED
  | typeof ALERT_STATUS_ALL;

export interface AlertStatusFilter {
  status: AlertStatus;
  query: string;
  filter: Filter[];
  label: string;
}

export interface Group {
  field: string;
  value: string;
}

export interface TimeRange {
  from?: string;
  to?: string;
}

export interface EventNonEcsData {
  field: string;
  value?: Maybe<string[]>;
}

// Alert fields['kibana.alert.group] type
export type GroupBy = Group[];
