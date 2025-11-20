/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Essential fields to return for security alerts to reduce context window usage.
 * These fields contain the most relevant information for security analysis.
 */
export const ESSENTIAL_ALERT_FIELDS = [
  '@timestamp',
  'kibana.alert.uuid',
  'kibana.alert.risk_score',
  'kibana.alert.severity',
  'kibana.alert.start',
  'kibana.alert.workflow_status',
  'kibana.alert.reason',
  'kibana.alert.rule.name',
  'kibana.alert.rule.rule_id',
  'kibana.alert.rule.description',
  'kibana.alert.rule.category',
  'message',
  'host.name',
  'host.ip',
  'user.name',
  'user.domain',
  'source.ip',
  'destination.ip',
  'event.category',
  'event.action',
  'event.type',
  'event.code',
  'process.name',
  'process.executable',
  'process.command_line',
  'process.pid',
] as const;

