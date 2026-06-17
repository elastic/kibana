/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const LocationErrorStatType = t.type({
  location: t.string,
  count: t.number,
});

export type LocationErrorStat = t.TypeOf<typeof LocationErrorStatType>;

export const TopFailingMonitorType = t.type({
  configId: t.string,
  monitorName: t.string,
  downChecks: t.number,
  totalChecks: t.number,
  errorRate: t.number,
  downtimeMs: t.number,
});

export type TopFailingMonitor = t.TypeOf<typeof TopFailingMonitorType>;

export const FailingDomainType = t.type({
  domain: t.string,
  count: t.number,
});

export type FailingDomain = t.TypeOf<typeof FailingDomainType>;

export const TagErrorStatType = t.type({
  tag: t.string,
  downChecks: t.number,
  totalChecks: t.number,
  errorRate: t.number,
});

export type TagErrorStat = t.TypeOf<typeof TagErrorStatType>;

export const StatusCodeStatType = t.type({
  statusCode: t.number,
  count: t.number,
});

export type StatusCodeStat = t.TypeOf<typeof StatusCodeStatType>;

export const MonitorTypeStatType = t.type({
  monitorType: t.string,
  downChecks: t.number,
  totalChecks: t.number,
  errorRate: t.number,
});

export type MonitorTypeStat = t.TypeOf<typeof MonitorTypeStatType>;

export const EmergingTermType = t.type({
  term: t.string,
  score: t.number,
  foregroundCount: t.number,
  backgroundCount: t.number,
});

export type EmergingTerm = t.TypeOf<typeof EmergingTermType>;

export const ErrorInsightsType = t.type({
  failingDomains: t.array(FailingDomainType),
  tagStats: t.array(TagErrorStatType),
  statusCodes: t.array(StatusCodeStatType),
  monitorTypeStats: t.array(MonitorTypeStatType),
  emergingTerms: t.array(EmergingTermType),
});

export type ErrorInsights = t.TypeOf<typeof ErrorInsightsType>;

export const ErrorStatsType = t.type({
  totalChecks: t.number,
  downChecks: t.number,
  errorRate: t.number,
  affectedMonitors: t.number,
  totalMonitors: t.number,
  errorCount: t.number,
  avgDurationMs: t.number,
  previousErrorRate: t.number,
  errorRateDelta: t.number,
  locationStats: t.array(LocationErrorStatType),
  topFailingMonitors: t.array(TopFailingMonitorType),
  insights: ErrorInsightsType,
});

export type ErrorStats = t.TypeOf<typeof ErrorStatsType>;
