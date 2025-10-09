/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_STATE_NAMESPACE } from '@kbn/rule-data-utils';

export const SLO_ID_FIELD = 'slo.id';
export const SLO_REVISION_FIELD = 'slo.revision';
export const SLO_INSTANCE_ID_FIELD = 'slo.instanceId';
export const SLO_DATA_VIEW_ID_FIELD = 'slo.dataViewId';
export const ALERT_STATE_ALERT_STATE = `${ALERT_STATE_NAMESPACE}.alert_state` as const;

export const SLO_BURN_RATE_AAD_FIELDS = [
  SLO_ID_FIELD,
  SLO_REVISION_FIELD,
  SLO_INSTANCE_ID_FIELD,
  SLO_DATA_VIEW_ID_FIELD,
  ALERT_STATE_ALERT_STATE,
];
