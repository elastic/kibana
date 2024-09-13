/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTERNAL_ALERTING_SNOOZE_RULE } from '@kbn/alerting-plugin/common';

export const internalAlertingSnoozeRule = (ruleId: string) =>
  INTERNAL_ALERTING_SNOOZE_RULE.replace('{id}', ruleId);
