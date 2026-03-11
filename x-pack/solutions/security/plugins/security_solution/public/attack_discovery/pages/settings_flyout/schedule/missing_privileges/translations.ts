/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const MISSING_UPDATE_SCHEDULE_PRIVILEGES_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.attackDiscovery.schedule.missingUpdateSchedulePrivilegesDescription',
  {
    defaultMessage:
      'You are missing the update Attack discovery privilege. Without that privilege you cannot create, edit, enable, disable, or delete schedules.',
  }
);
