/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DetectionAlert } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { ALERT_LAST_DETECTED, ALERT_START, ALERT_INTENDED_TIMESTAMP } from '@kbn/rule-data-utils';

export const removeRandomValuedPropertiesFromAlert = (alert: DetectionAlert | undefined) => {
  if (!alert) {
    return undefined;
  }
  const {
    'kibana.version': version,
    'kibana.alert.rule.execution.uuid': execUuid,
    'kibana.alert.rule.execution.timestamp': execTimestamp,
    'kibana.alert.rule.uuid': uuid,
    '@timestamp': timestamp,
    'kibana.alert.rule.created_at': createdAt,
    'kibana.alert.rule.updated_at': updatedAt,
    'kibana.alert.uuid': alertUuid,
    'kibana.alert.url': alertURL,
    [ALERT_START]: alertStart,
    [ALERT_LAST_DETECTED]: lastDetected,
    [ALERT_INTENDED_TIMESTAMP]: intendedTimestamp,
    ...restOfAlert
  } = alert;
  return restOfAlert;
};
