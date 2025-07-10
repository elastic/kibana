/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
  ALERT_STATUS_UNTRACKED,
} from '@kbn/rule-data-utils';

export const ALERT_STATUSES = [ALERT_STATUS_ACTIVE, ALERT_STATUS_RECOVERED, ALERT_STATUS_UNTRACKED];
