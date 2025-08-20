/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type {
  OperatingSystem,
  TrustedDeviceConditionEntryField,
} from '@kbn/securitysolution-utils';
import type { PutTrustedDeviceUpdateRequestSchema } from '../schema/trusted_devices';
import type { EffectScope } from './trusted_apps';

export interface GetTrustedDevicesListResponse {
  per_page: number;
  page: number;
  total: number;
  data: TrustedDevice[];
}

export type PutTrustedDevicesRequestParams = TypeOf<
  typeof PutTrustedDeviceUpdateRequestSchema.params
>;

export enum TrustedDeviceOperatorFieldIds {
  is = 'is',
  matches = 'matches',
}

export interface TrustedDeviceConditionEntry<
  T extends TrustedDeviceConditionEntryField = TrustedDeviceConditionEntryField
> {
  field: T;
  type: 'match' | 'wildcard';
  operator: 'included';
  value: string;
}

interface TrustedDeviceConditionEntries {
  os: OperatingSystem.WINDOWS | OperatingSystem.MAC;
  entries: TrustedDeviceConditionEntry[];
}

export type NewTrustedDevice = {
  name: string;
  description?: string;
  effectScope: EffectScope;
} & TrustedDeviceConditionEntries;

export type TrustedDevice = NewTrustedDevice & {
  version: string;
  id: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
};
