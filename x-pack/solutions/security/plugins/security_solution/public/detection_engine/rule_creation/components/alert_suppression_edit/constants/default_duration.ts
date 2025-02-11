/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertSuppressionDurationUnitEnum } from '../../../../../../common/api/detection_engine';
import {
  ALERT_SUPPRESSION_DURATION_VALUE_FIELD_NAME,
  ALERT_SUPPRESSION_DURATION_UNIT_FIELD_NAME,
} from './fields';

export const ALERT_SUPPRESSION_DEFAULT_DURATION = {
  [ALERT_SUPPRESSION_DURATION_VALUE_FIELD_NAME]: 5,
  [ALERT_SUPPRESSION_DURATION_UNIT_FIELD_NAME]: AlertSuppressionDurationUnitEnum.m,
};
