/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EndpointPolicyPreset } from '../../common/endpoint/constants';

export interface PolicyCreateEndpointConfig {
  type: 'endpoint';
  endpointConfig: {
    preset: EndpointPolicyPreset;
  };
}

export interface PolicyCreateEventFilters {
  nonInteractiveSession?: boolean;
}

export interface PolicyCreateCloudConfig {
  type: 'cloud';
  eventFilters?: PolicyCreateEventFilters;
}

export type AnyPolicyCreateConfig = PolicyCreateEndpointConfig | PolicyCreateCloudConfig;
