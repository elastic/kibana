/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LISTS_PRIVILEGES_FETCH_FAILURE = i18n.translate(
  'xpack.securitySolution.containers.detectionEngine.alerts.readListsPrivileges.errorDescription',
  {
    defaultMessage: 'Failed to retrieve lists privileges',
  }
);

export const DETECTION_ENGINE_PRIVILEGES_FETCH_FAILURE = i18n.translate(
  'xpack.securitySolution.containers.detectionEngine.alerts.detectionEnginePrivileges.errorFetching',
  {
    defaultMessage: 'Failed to retrieve detection engine privileges',
  }
);
