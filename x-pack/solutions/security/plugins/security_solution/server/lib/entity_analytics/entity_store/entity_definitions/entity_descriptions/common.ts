/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BaseECSEntityField,
  EntityType,
} from '../../../../../../common/api/entity_analytics/entity_store';
import type { FieldDescription } from '../../installation/types';

import { oldestValue, newestValue } from './field_utils';

export const getCommonFieldDescriptions = (ecsField: BaseECSEntityField): FieldDescription[] => {
  return [
    oldestValue({
      source: '_index',
      destination: 'entity.source',
    }),
    newestValue({ source: 'asset.criticality' }),
    newestValue({
      source: `${ecsField}.risk.calculated_level`,
    }),
    newestValue({
      source: `${ecsField}.risk.calculated_score`,
      mapping: {
        type: 'float',
      },
    }),
    newestValue({
      source: `${ecsField}.risk.calculated_score_norm`,
      mapping: {
        type: 'float',
      },
    }),
  ];
};

export const getNestedEntityFieldsDescriptions = (field: EntityType) => {
  return [
    newestValue({ source: `${field}.entity.name`, destination: 'entity.name' }),
    newestValue({ source: `${field}.entity.source`, destination: 'entity.source' }),
    newestValue({ source: `${field}.entity.type`, destination: 'entity.type' }),
    newestValue({ source: `${field}.entity.sub_type`, destination: 'entity.sub_type' }),
    newestValue({ source: `${field}.entity.url`, destination: 'entity.url' }),
    newestValue({
      source: `${field}.entity.attributes.StorageClass`,
      destination: 'entity.attributes.StorageClass',
    }),
    newestValue({
      source: `${field}.entity.attributes.MfaEnabled`,
      destination: 'entity.attributes.MfaEnabled',
    }),
    newestValue({
      source: `${field}.entity.attributes.Privileged`,
      destination: 'entity.attributes.Privileged',
    }),
    newestValue({
      source: `${field}.entity.attributes.GrantedPermissions`,
      destination: 'entity.attributes.GrantedPermissions',
    }),
    newestValue({
      source: `${field}.entity.attributes.KnownRedirect`,
      destination: 'entity.attributes.KnownRedirect',
    }),
    newestValue({
      source: `${field}.entity.attributes.Asset`,
      destination: 'entity.attributes.Asset',
    }),
    newestValue({
      source: `${field}.entity.attributes.Managed`,
      destination: 'entity.attributes.Managed',
    }),
    newestValue({
      source: `${field}.entity.attributes.OsCurrent`,
      destination: 'entity.attributes.OsCurrent',
    }),
    newestValue({
      source: `${field}.entity.attributes.OsPatchCurrent`,
      destination: 'entity.attributes.OsPatchCurrent',
    }),
    newestValue({
      source: `${field}.entity.attributes.OauthConsentRestriction`,
      destination: 'entity.attributes.OauthConsentRestriction',
    }),
    newestValue({
      source: `${field}.entity.lifecycle.FirstSeen`,
      destination: 'entity.lifecycle.FirstSeen',
    }),
    newestValue({
      source: `${field}.entity.lifecycle.LastActivity`,
      destination: 'entity.lifecycle.LastActivity',
    }),
    newestValue({
      source: `${field}.entity.lifecycle.IssuedAt`,
      destination: 'entity.lifecycle.IssuedAt',
    }),
    newestValue({
      source: `${field}.entity.lifecycle.LastPasswordChange`,
      destination: 'entity.lifecycle.LastPasswordChange',
    }),
    newestValue({
      source: `${field}.entity.behavior.UsedUsbDevice`,
      destination: 'entity.behavior.UsedUsbDevice',
    }),
    newestValue({
      source: `${field}.entity.behavior.BruteForceVictim`,
      destination: 'entity.behavior.BruteForceVictim',
    }),
    newestValue({
      source: `${field}.entity.behavior.NewCountryLogin`,
      destination: 'entity.behavior.NewCountryLogin',
    }),
  ];
};
