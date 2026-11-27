/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deepFreeze } from '@kbn/std';
import { ENDPOINT_POLICY_PRESET } from '../../../../../../../common/endpoint/constants';
import {
  DATA_COLLECTION,
  EDR_COMPLETE,
  EDR_ESSENTIAL,
  EDR_NOTE,
  NGAV,
  NGAV_NOTE,
} from './translations';

export const ENDPOINT_INTEGRATION_CONFIG_KEY = 'ENDPOINT_INTEGRATION_CONFIG';

export const endpointPresetsMapping = deepFreeze({
  [ENDPOINT_POLICY_PRESET.NGAV]: {
    label: NGAV,
    note: NGAV_NOTE,
  },
  [ENDPOINT_POLICY_PRESET.EDR_ESSENTIAL]: {
    label: EDR_ESSENTIAL,
    note: EDR_NOTE,
  },
  [ENDPOINT_POLICY_PRESET.EDR_COMPLETE]: {
    label: EDR_COMPLETE,
    note: EDR_NOTE,
  },
  [ENDPOINT_POLICY_PRESET.DATA_COLLECTION]: {
    label: DATA_COLLECTION,
    note: null,
  },
});
