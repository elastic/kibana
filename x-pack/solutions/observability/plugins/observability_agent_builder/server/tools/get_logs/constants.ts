/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AGENT_NAME,
  CONTAINER_ID,
  ERROR_EXC_MESSAGE,
  ERROR_EXC_TYPE,
  ERROR_MESSAGE,
  HOST_NAME,
  KUBERNETES_CONTAINER_NAME,
  KUBERNETES_NAMESPACE,
  KUBERNETES_NODE_NAME,
  KUBERNETES_POD_NAME,
  LOG_LEVEL,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRACE_ID,
} from '@kbn/apm-types';

export const OBSERVABILITY_GET_LOGS_TOOL_ID = 'observability.get_logs';

export const MAX_FIELD_VALUE_LENGTH = 500;

export const FACET_FIELDS = [
  LOG_LEVEL,
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  HOST_NAME,
  AGENT_NAME,
  ERROR_EXC_TYPE,
  KUBERNETES_NAMESPACE,
  KUBERNETES_NODE_NAME,
  KUBERNETES_POD_NAME,
  KUBERNETES_CONTAINER_NAME,
];

export const DEFAULT_SAMPLE_FIELDS = [
  'message',
  ERROR_MESSAGE,
  ERROR_EXC_MESSAGE,
  ERROR_EXC_TYPE,
  SERVICE_NAME,
  HOST_NAME,
  CONTAINER_ID,
  TRACE_ID,
  AGENT_NAME,
  KUBERNETES_CONTAINER_NAME,
  KUBERNETES_NODE_NAME,
  KUBERNETES_NAMESPACE,
  KUBERNETES_POD_NAME,
  LOG_LEVEL,
];
