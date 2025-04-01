/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HostEntity, UserEntity } from '../../../../common/api/entity_analytics';
import type { CriticalityValues } from '../asset_criticality/constants';
import type { EntityAnalyticsConfig } from '../types';

export interface HostEntityRecord extends Omit<HostEntity, 'asset'> {
  asset?: {
    criticality: CriticalityValues;
  };
}

export interface UserEntityRecord extends Omit<UserEntity, 'asset'> {
  asset?: {
    criticality: CriticalityValues;
  };
}

/**
 * It represents the data stored in the entity store index.
 */
export type EntityRecord = HostEntityRecord | UserEntityRecord;

export type EntityStoreConfig = EntityAnalyticsConfig['entityStore'];
