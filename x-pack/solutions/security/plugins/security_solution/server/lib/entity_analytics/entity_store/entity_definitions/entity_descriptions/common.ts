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
    newestValue({ source: `${field}.entity.name` }),
    newestValue({ source: `${field}.entity.source` }),
    newestValue({ source: `${field}.entity.type` }),
    newestValue({ source: `${field}.entity.sub_type` }),
    newestValue({ source: `${field}.entity.url` }),

    newestValue({ source: `${field}.entity.url` }),
    newestValue({ source: `${field}.entity.attributes.Storage_class` }),
    newestValue({ source: `${field}.entity.attributes.Mfa_enabled` }),
    newestValue({ source: `${field}.entity.attributes.Privileged` }),
    newestValue({ source: `${field}.entity.attributes.Granted_permissions` }),
    newestValue({ source: `${field}.entity.attributes.Known_redirect` }),
    newestValue({ source: `${field}.entity.attributes.Asset` }),
    newestValue({ source: `${field}.entity.attributes.Managed` }),
    newestValue({ source: `${field}.entity.attributes.Os_current` }),
    newestValue({ source: `${field}.entity.attributes.Os_patch_current` }),
    newestValue({ source: `${field}.entity.attributes.Oauth_consent_restriction` }),
    newestValue({ source: `${field}.entity.lifecycle.First_seen` }),
    newestValue({ source: `${field}.entity.lifecycle.Last_activity` }),
    newestValue({ source: `${field}.entity.lifecycle.Issued_at` }),
    newestValue({ source: `${field}.entity.lifecycle.Last_password_change` }),
    newestValue({ source: `${field}.entity.behavior.Used_usb_device` }),
    newestValue({ source: `${field}.entity.behavior.Brute_force_victim` }),
    newestValue({ source: `${field}.entity.behavior.New_country_login` }),
  ];
};
