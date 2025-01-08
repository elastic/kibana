/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import {
  SubFeaturePrivilegeGroupConfig,
  SubFeaturePrivilegeGroupType,
} from '@kbn/features-plugin/common';
import { ALERTING_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { UPTIME_RULE_TYPE_IDS, SYNTHETICS_RULE_TYPE_IDS } from '@kbn/rule-data-utils';
import { KibanaFeatureScope } from '@kbn/features-plugin/common';
import { syntheticsMonitorType, syntheticsParamType } from '../common/types/saved_objects';
import {
  legacyPrivateLocationsSavedObjectName,
  privateLocationSavedObjectName,
} from '../common/saved_objects/private_locations';
import { PLUGIN } from '../common/constants/plugin';
import {
  syntheticsSettingsObjectType,
  uptimeSettingsObjectType,
} from './saved_objects/synthetics_settings';
import { syntheticsApiKeyObjectType } from './saved_objects/service_api_key';

export const PRIVATE_LOCATION_WRITE_API = 'private-location-write';

const ruleTypes = [...UPTIME_RULE_TYPE_IDS, ...SYNTHETICS_RULE_TYPE_IDS];

const alertingFeatures = ruleTypes.map((ruleTypeId) => ({
  ruleTypeId,
  consumers: [PLUGIN.ID, ALERTING_FEATURE_ID],
}));

const elasticManagedLocationsEnabledPrivilege: SubFeaturePrivilegeGroupConfig = {
  groupType: 'independent' as SubFeaturePrivilegeGroupType,
  privileges: [
    {
      id: 'elastic_managed_locations_enabled',
      name: i18n.translate('xpack.synthetics.features.elasticManagedLocations.label', {
        defaultMessage: 'Enabled',
      }),
      includeIn: 'all',
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['elasticManagedLocationsEnabled'],
    },
  ],
};

const canManagePrivateLocationsPrivilege: SubFeaturePrivilegeGroupConfig = {
  groupType: 'independent' as SubFeaturePrivilegeGroupType,
  privileges: [
    {
      id: 'can_manage_private_locations',
      name: i18n.translate('xpack.synthetics.features.canManagePrivateLocations', {
        defaultMessage: 'Can manage',
      }),
      includeIn: 'all',
      api: [PRIVATE_LOCATION_WRITE_API],
      savedObject: {
        all: [privateLocationSavedObjectName, legacyPrivateLocationsSavedObjectName],
        read: [],
      },
      ui: ['canManagePrivateLocations'],
    },
  ],
};

export const syntheticsFeature = {
  id: PLUGIN.ID,
  name: PLUGIN.NAME,
  order: 1000,
  category: DEFAULT_APP_CATEGORIES.observability,
  app: ['uptime', 'kibana', 'synthetics'],
  catalogue: ['uptime'],
  scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
  management: {
    insightsAndAlerting: ['triggersActions'],
  },
  alerting: alertingFeatures,
  privileges: {
    all: {
      app: ['uptime', 'kibana', 'synthetics'],
      catalogue: ['uptime'],
      api: ['uptime-read', 'uptime-write', 'lists-all', 'rac'],
      savedObject: {
        all: [
          syntheticsSettingsObjectType,
          syntheticsMonitorType,
          syntheticsApiKeyObjectType,
          syntheticsParamType,

          // uptime settings object is also registered here since feature is shared between synthetics and uptime
          uptimeSettingsObjectType,
        ],
        read: [privateLocationSavedObjectName, legacyPrivateLocationsSavedObjectName],
      },
      alerting: {
        rule: {
          all: alertingFeatures,
        },
        alert: {
          all: alertingFeatures,
        },
      },
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      ui: ['save', 'configureSettings', 'show', 'alerting:save'],
    },
    read: {
      app: ['uptime', 'kibana', 'synthetics'],
      catalogue: ['uptime'],
      api: ['uptime-read', 'lists-read', 'rac'],
      savedObject: {
        all: [],
        read: [
          syntheticsParamType,
          syntheticsSettingsObjectType,
          syntheticsMonitorType,
          syntheticsApiKeyObjectType,
          privateLocationSavedObjectName,
          legacyPrivateLocationsSavedObjectName,
          // uptime settings object is also registered here since feature is shared between synthetics and uptime
          uptimeSettingsObjectType,
        ],
      },
      alerting: {
        rule: {
          read: alertingFeatures,
        },
        alert: {
          read: alertingFeatures,
        },
      },
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      ui: ['show', 'alerting:save'],
    },
  },
  subFeatures: [
    {
      name: i18n.translate('xpack.synthetics.features.app.elastic', {
        defaultMessage: 'Elastic managed locations',
      }),
      description: i18n.translate('xpack.synthetics.features.app.elasticDescription', {
        defaultMessage:
          'This feature enables users to create monitors that execute tests from Elastic managed infrastructure around the globe. There is an additional charge to use Elastic Managed testing locations. See the Elastic Cloud Pricing https://www.elastic.co/pricing page for current prices.',
      }),
      privilegeGroups: [elasticManagedLocationsEnabledPrivilege],
    },
    {
      name: i18n.translate('xpack.synthetics.features.app.private', {
        defaultMessage: 'Private locations',
      }),
      description: i18n.translate('xpack.synthetics.features.app.private,description', {
        defaultMessage:
          'This feature allows you to manage your private locations, for example adding, or deleting them.',
      }),
      privilegeGroups: [canManagePrivateLocationsPrivilege],
    },
  ],
};
