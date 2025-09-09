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

export const getEntityFieldsDescriptions = (rootField?: EntityType) => {
  const prefix = rootField ? `${rootField}.entity` : 'entity';

  return [
    newestValue({ source: `${prefix}.name`, destination: 'entity.name' }),
    newestValue({ source: `${prefix}.source`, destination: 'entity.source' }),
    newestValue({ source: `${prefix}.type`, destination: 'entity.type' }),
    newestValue({ source: `${prefix}.sub_type`, destination: 'entity.sub_type' }),
    newestValue({ source: `${prefix}.url`, destination: 'entity.url' }),
    newestValue({
      source: `${prefix}.attributes.StorageClass`,
      destination: 'entity.attributes.StorageClass',
    }),
    newestValue({
      source: `${prefix}.attributes.MfaEnabled`,
      destination: 'entity.attributes.MfaEnabled',
    }),
    newestValue({
      source: `${prefix}.attributes.Privileged`,
      destination: 'entity.attributes.Privileged',
    }),
    newestValue({
      source: `${prefix}.attributes.GrantedPermissions`,
      destination: 'entity.attributes.GrantedPermissions',
    }),
    newestValue({
      source: `${prefix}.attributes.KnownRedirect`,
      destination: 'entity.attributes.KnownRedirect',
    }),
    newestValue({
      source: `${prefix}.attributes.Asset`,
      destination: 'entity.attributes.Asset',
    }),
    newestValue({
      source: `${prefix}.attributes.Managed`,
      destination: 'entity.attributes.Managed',
    }),
    newestValue({
      source: `${prefix}.attributes.OsCurrent`,
      destination: 'entity.attributes.OsCurrent',
    }),
    newestValue({
      source: `${prefix}.attributes.OsPatchCurrent`,
      destination: 'entity.attributes.OsPatchCurrent',
    }),
    newestValue({
      source: `${prefix}.attributes.OauthConsentRestriction`,
      destination: 'entity.attributes.OauthConsentRestriction',
    }),
    newestValue({
      source: `${prefix}.lifecycle.FirstSeen`,
      destination: 'entity.lifecycle.FirstSeen',
    }),
    newestValue({
      source: `${prefix}.lifecycle.LastActivity`,
      destination: 'entity.lifecycle.LastActivity',
    }),
    newestValue({
      source: `${prefix}.lifecycle.IssuedAt`,
      destination: 'entity.lifecycle.IssuedAt',
    }),
    newestValue({
      source: `${prefix}.lifecycle.LastPasswordChange`,
      destination: 'entity.lifecycle.LastPasswordChange',
    }),
    newestValue({
      source: `${prefix}.behavior.UsedUsbDevice`,
      destination: 'entity.behavior.UsedUsbDevice',
    }),
    newestValue({
      source: `${prefix}.behavior.BruteForceVictim`,
      destination: 'entity.behavior.BruteForceVictim',
    }),
    newestValue({
      source: `${prefix}.behavior.NewCountryLogin`,
      destination: 'entity.behavior.NewCountryLogin',
    }),
  ];
};
