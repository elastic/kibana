/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TASK_MANAGER_UNAVAILABLE_ERROR = i18n.translate(
  'xpack.securitySolution.api.riskEngine.taskManagerUnavailable',
  {
    defaultMessage:
      'Task Manager is unavailable, but is required by the risk engine. Please enable the taskManager plugin and try again.',
  }
);
