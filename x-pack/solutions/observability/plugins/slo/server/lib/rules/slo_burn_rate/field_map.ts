/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SLO_DATA_VIEW_ID_FIELD,
  SLO_ID_FIELD,
  SLO_INSTANCE_ID_FIELD,
  SLO_REVISION_FIELD,
} from '../../../../common/burn_rate_rule/field_names';

export const sloRuleFieldMap = {
  [SLO_ID_FIELD]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [SLO_REVISION_FIELD]: {
    type: 'long',
    array: false,
    required: false,
  },
  [SLO_INSTANCE_ID_FIELD]: {
    type: 'keyword',
    array: false,
    required: false,
  },
  [SLO_DATA_VIEW_ID_FIELD]: {
    type: 'keyword',
    array: false,
    required: false,
  },
};

export type SLORuleFieldMap = typeof sloRuleFieldMap;
