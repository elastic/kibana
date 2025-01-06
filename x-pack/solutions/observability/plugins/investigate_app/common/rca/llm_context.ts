/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsFieldsResponse } from '@kbn/rule-registry-plugin/common';
import {
  ALERT_FLAPPING_HISTORY,
  ALERT_RULE_EXECUTION_TIMESTAMP,
  ALERT_RULE_EXECUTION_UUID,
  EVENT_ACTION,
  EVENT_KIND,
} from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import { omit } from 'lodash';

export function sanitizeAlert(alert: EcsFieldsResponse) {
  return omit(
    alert,
    ALERT_RULE_EXECUTION_TIMESTAMP,
    '_index',
    ALERT_FLAPPING_HISTORY,
    EVENT_ACTION,
    EVENT_KIND,
    ALERT_RULE_EXECUTION_UUID,
    '@timestamp'
  );
}

export function getRCAContext(alert: EcsFieldsResponse, serviceName: string) {
  return `The user is investigating an alert for the ${serviceName} service,
    and wants to find the root cause. Here is the alert:
  
    ${JSON.stringify(sanitizeAlert(alert))}`;
}
