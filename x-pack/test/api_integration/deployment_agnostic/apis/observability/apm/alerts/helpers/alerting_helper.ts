/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';
import { ObservabilityApmAlert } from '@kbn/alerts-as-data-utils';

export const APM_ALERTS_INDEX = '.alerts-observability.apm.alerts-*';
export const APM_ACTION_VARIABLE_INDEX = 'apm-index-connector-test';
export type ApmAlertFields = ParsedTechnicalFields & ObservabilityApmAlert;
