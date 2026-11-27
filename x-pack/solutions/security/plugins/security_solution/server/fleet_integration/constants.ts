/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENDPOINT_POLICY_PRESET } from '../../common/endpoint/constants';

/**
 * Endpoint Security integration presets.
 * The default endpoint policy configuration can be overrided based on the preset.
 */

export const ENDPOINT_CONFIG_PRESET_NGAV = ENDPOINT_POLICY_PRESET.NGAV;
export const ENDPOINT_CONFIG_PRESET_EDR_ESSENTIAL = ENDPOINT_POLICY_PRESET.EDR_ESSENTIAL;
export const ENDPOINT_CONFIG_PRESET_EDR_COMPLETE = ENDPOINT_POLICY_PRESET.EDR_COMPLETE;
export const ENDPOINT_CONFIG_PRESET_DATA_COLLECTION = ENDPOINT_POLICY_PRESET.DATA_COLLECTION;

export const ENDPOINT_INTEGRATION_CONFIG_KEY = 'ENDPOINT_INTEGRATION_CONFIG';
