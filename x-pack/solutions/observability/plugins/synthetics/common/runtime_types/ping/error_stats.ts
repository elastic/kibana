/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SchemaOutput } from '../schema_output';
import {
  LocationErrorStatType,
  TopFailingMonitorType,
  FailingDomainType,
  TagErrorStatType,
  StatusCodeStatType,
  MonitorTypeStatType,
  EmergingTermType,
  ErrorInsightsType,
  ErrorStatsType,
} from '../zod/ping';

export {
  LocationErrorStatType,
  TopFailingMonitorType,
  FailingDomainType,
  TagErrorStatType,
  StatusCodeStatType,
  MonitorTypeStatType,
  EmergingTermType,
  ErrorInsightsType,
  ErrorStatsType,
};

export type LocationErrorStat = SchemaOutput<typeof LocationErrorStatType>;
export type TopFailingMonitor = SchemaOutput<typeof TopFailingMonitorType>;
export type FailingDomain = SchemaOutput<typeof FailingDomainType>;
export type TagErrorStat = SchemaOutput<typeof TagErrorStatType>;
export type StatusCodeStat = SchemaOutput<typeof StatusCodeStatType>;
export type MonitorTypeStat = SchemaOutput<typeof MonitorTypeStatType>;
export type EmergingTerm = SchemaOutput<typeof EmergingTermType>;
export type ErrorInsights = SchemaOutput<typeof ErrorInsightsType>;
export type ErrorStats = SchemaOutput<typeof ErrorStatsType>;
