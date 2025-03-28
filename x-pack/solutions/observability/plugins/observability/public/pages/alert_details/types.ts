/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactNode } from 'react';
import { TopAlert } from '../..';

export const NUM_OF_BUCKETS = 100;
export const NUM_OF_ALERTS = 1000;

export interface AlertDetailsSource {
  label: ReactNode | string;
  value: ReactNode | string | number;
}

export interface AlertDetailsAppSectionProps {
  setSources: React.Dispatch<React.SetStateAction<AlertDetailsSource[] | undefined>>;
}

export interface AlertInsightProps {
  alert: TopAlert;
}

export enum AlertInsightType {
  SameSource = 'same-source',
  SameRule = 'same-rule',
  OtherSources = 'other-sources',
  OtherRules = 'other-rules',
  TotalUniqueAlerts = 'total-unique-alerts',
}

export interface AlertInsight {
  type: AlertInsightType;
  alertsCount: number;
  title: string;
  tooltip: string;
}
