/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EQL_RULE_TYPE_ID,
  ESQL_RULE_TYPE_ID,
  INDICATOR_RULE_TYPE_ID,
  ML_RULE_TYPE_ID,
  NEW_TERMS_RULE_TYPE_ID,
  QUERY_RULE_TYPE_ID,
  SAVED_QUERY_RULE_TYPE_ID,
  THRESHOLD_RULE_TYPE_ID,
} from '@kbn/securitysolution-rules';
import { ProductFeatureSecurityKey, SecuritySubFeatureId } from '../product_features_keys';
import { APP_ID, LEGACY_NOTIFICATIONS_ID, SERVER_APP_ID } from '../constants';
import type { DefaultSecurityProductFeaturesConfig } from './types';

const SECURITY_RULE_TYPES = [
  LEGACY_NOTIFICATIONS_ID,
  ESQL_RULE_TYPE_ID,
  EQL_RULE_TYPE_ID,
  INDICATOR_RULE_TYPE_ID,
  ML_RULE_TYPE_ID,
  QUERY_RULE_TYPE_ID,
  SAVED_QUERY_RULE_TYPE_ID,
  THRESHOLD_RULE_TYPE_ID,
  NEW_TERMS_RULE_TYPE_ID,
];

const alertingFeatures = SECURITY_RULE_TYPES.map((ruleTypeId) => ({
  ruleTypeId,
  consumers: [SERVER_APP_ID],
}));
/**
 * App features privileges configuration for the Security Solution Kibana Feature app.
 * These are the configs that are shared between both offering types (ess and serverless).
 * They can be extended on each offering plugin to register privileges using different way on each offering type.
 *
 * Privileges can be added in different ways:
 * - `privileges`: the privileges that will be added directly into the main Security feature.
 * - `subFeatureIds`: the ids of the sub-features that will be added into the Security subFeatures entry.
 * - `subFeaturesPrivileges`: the privileges that will be added into the existing Security subFeature with the privilege `id` specified.
 */

export const securityDefaultProductFeaturesConfig: DefaultSecurityProductFeaturesConfig = {
  [ProductFeatureSecurityKey.advancedInsights]: {
    privileges: {
      all: {
        ui: ['entity-analytics'],
        api: [`${APP_ID}-entity-analytics`],
      },
      read: {
        ui: ['entity-analytics'],
        api: [`${APP_ID}-entity-analytics`],
      },
    },
  },

  [ProductFeatureSecurityKey.externalDetections]: {
    privileges: {
      all: {
        ui: ['external_detections'],
        api: [],
      },
      read: {
        ui: ['external_detections'],
        api: [],
      },
    },
  },
  [ProductFeatureSecurityKey.detections]: {
    management: {
      insightsAndAlerting: ['triggersActions'],
    },
    alerting: alertingFeatures,
    privileges: {
      all: {
        ui: ['detections'],
        api: [
          'cloud-security-posture-all',
          'cloud-security-posture-read',
          'cloud-defend-all',
          'cloud-defend-read',
          'bulkGetUserProfiles',
        ],
        alerting: {
          rule: { all: alertingFeatures },
          alert: { all: alertingFeatures },
        },
        management: {
          insightsAndAlerting: ['triggersActions'],
        },
      },
      read: {
        ui: ['detections'],
        api: ['cloud-security-posture-read', 'cloud-defend-read', 'bulkGetUserProfiles'],
        alerting: {
          rule: {
            read: alertingFeatures,
          },
          alert: {
            all: alertingFeatures,
          },
        },
        management: {
          insightsAndAlerting: ['triggersActions'],
        },
      },
    },
  },

  [ProductFeatureSecurityKey.investigationGuide]: {
    privileges: {
      all: {
        ui: ['investigation-guide'],
      },
      read: {
        ui: ['investigation-guide'],
      },
    },
  },
  [ProductFeatureSecurityKey.configurations]: {
    privileges: {
      all: {
        ui: ['configurations'],
        api: [],
      },
      read: {
        ui: [],
        api: [],
      },
    },
  },
  [ProductFeatureSecurityKey.investigationGuideInteractions]: {
    privileges: {
      all: {
        ui: ['investigation-guide-interactions'],
      },
      read: {
        ui: ['investigation-guide-interactions'],
      },
    },
  },

  [ProductFeatureSecurityKey.threatIntelligence]: {
    privileges: {
      all: {
        ui: ['threat-intelligence'],
        api: [`${APP_ID}-threat-intelligence`],
      },
      read: {
        ui: ['threat-intelligence'],
        api: [`${APP_ID}-threat-intelligence`],
      },
    },
  },

  [ProductFeatureSecurityKey.endpointHostManagement]: {
    subFeatureIds: [SecuritySubFeatureId.endpointList],
  },

  [ProductFeatureSecurityKey.endpointPolicyManagement]: {
    subFeatureIds: [SecuritySubFeatureId.policyManagement],
  },

  // Adds no additional kibana feature controls
  [ProductFeatureSecurityKey.endpointPolicyProtections]: {},

  [ProductFeatureSecurityKey.endpointArtifactManagement]: {
    subFeatureIds: [
      SecuritySubFeatureId.hostIsolationExceptionsBasic,
      SecuritySubFeatureId.trustedApplications,
      SecuritySubFeatureId.blocklist,
      SecuritySubFeatureId.eventFilters,
      SecuritySubFeatureId.globalArtifactManagement,
    ],
  },

  // Endpoint Complete Tier:
  // Allows access to create/update HIEs
  [ProductFeatureSecurityKey.endpointHostIsolationExceptions]: {
    subFeaturesPrivileges: [
      {
        id: 'host_isolation_exceptions_all',
        api: [`${APP_ID}-accessHostIsolationExceptions`, `${APP_ID}-writeHostIsolationExceptions`],
        ui: ['accessHostIsolationExceptions', 'writeHostIsolationExceptions'],
      },
      {
        id: 'host_isolation_exceptions_read',
        api: [`${APP_ID}-accessHostIsolationExceptions`],
        ui: ['accessHostIsolationExceptions'],
      },
    ],
  },

  [ProductFeatureSecurityKey.endpointResponseActions]: {
    subFeatureIds: [
      SecuritySubFeatureId.responseActionsHistory,
      SecuritySubFeatureId.hostIsolation,
      SecuritySubFeatureId.processOperations,
      SecuritySubFeatureId.fileOperations,
      SecuritySubFeatureId.executeAction,
      SecuritySubFeatureId.scanAction,
    ],
    subFeaturesPrivileges: [
      {
        id: 'host_isolation_all',
        api: [`${APP_ID}-writeHostIsolation`],
        ui: ['writeHostIsolation'],
      },
    ],
  },

  [ProductFeatureSecurityKey.securityWorkflowInsights]: {
    subFeatureIds: [SecuritySubFeatureId.workflowInsights],
  },
  // Product features without RBAC
  // Endpoint/Osquery PLIs
  [ProductFeatureSecurityKey.osqueryAutomatedResponseActions]: {},
  [ProductFeatureSecurityKey.endpointProtectionUpdates]: {},
  [ProductFeatureSecurityKey.endpointAgentTamperProtection]: {},
  [ProductFeatureSecurityKey.endpointCustomNotification]: {},
  [ProductFeatureSecurityKey.externalRuleActions]: {},
  [ProductFeatureSecurityKey.cloudSecurityPosture]: {},

  // Security PLIs
  [ProductFeatureSecurityKey.automaticImport]: {},
  [ProductFeatureSecurityKey.prebuiltRuleCustomization]: {},
};
