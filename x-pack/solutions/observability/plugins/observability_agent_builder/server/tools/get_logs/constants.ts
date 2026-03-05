/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const OBSERVABILITY_GET_LOGS_TOOL_ID = 'observability.get_logs';

export const MAX_FIELD_VALUE_LENGTH = 500;

export const DEFAULT_KEEP_FIELDS = [
  'message',
  'error.message',
  'error.exception.message',
  'error.exception.type',
  'service.name',
  'container.name',
  'host.name',
  'container.id',
  'trace.id',
  'agent.name',
  'kubernetes.container.name',
  'kubernetes.node.name',
  'kubernetes.namespace',
  'kubernetes.pod.name',
  'log.level',
];
