/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const legacySyntheticsMonitorTypeSingle = 'synthetics-monitor';
export const legacyMonitorAttributes = `${legacySyntheticsMonitorTypeSingle}.attributes`;

export const syntheticsMonitorSavedObjectType = 'synthetics-monitor-multi-space';
export const syntheticsMonitorAttributes = `${syntheticsMonitorSavedObjectType}.attributes`;

export const syntheticsParamType = 'synthetics-param';

export const syntheticsMonitorSOTypes = [
  syntheticsMonitorSavedObjectType,
  legacySyntheticsMonitorTypeSingle,
];
