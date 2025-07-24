/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  ProductFeatureKeys,
  SecurityProductFeaturesConfigMap,
} from '@kbn/security-solution-features';
import {
  ProductFeatureSecurityKey,
  SecuritySubFeatureId,
} from '@kbn/security-solution-features/keys';
import {
  securityDefaultProductFeaturesConfig,
  createEnabledProductFeaturesConfigMap,
} from '@kbn/security-solution-features/config';
import { SECURITY_FEATURE_ID_V3 } from '@kbn/security-solution-features/constants';
import { APP_ID } from '@kbn/security-solution-plugin/common';
import type { SecurityProductFeaturesConfig } from '@kbn/security-solution-features/src/security/types';

export const getSecurityProductFeaturesConfigurator =
  (enabledProductFeatureKeys: ProductFeatureKeys) => (): SecurityProductFeaturesConfigMap => {
    return createEnabledProductFeaturesConfigMap(
      securityEssProductFeaturesConfig,
      enabledProductFeatureKeys
    );
  };

const securityEssProductFeaturesConfig: SecurityProductFeaturesConfig = {
  ...securityDefaultProductFeaturesConfig,

  [ProductFeatureSecurityKey.endpointExceptions]: {
    privileges: {
      all: {
        ui: ['showEndpointExceptions', 'crudEndpointExceptions'],
        api: [`${APP_ID}-showEndpointExceptions`, `${APP_ID}-crudEndpointExceptions`],
      },
      read: {
        ui: ['showEndpointExceptions'],
        api: [`${APP_ID}-showEndpointExceptions`],
      },
    },
  },

  [ProductFeatureSecurityKey.endpointArtifactManagement]: {
    privileges: {
      all: { api: [`${APP_ID}-writeGlobalArtifacts`] },
    },

    subFeatureIds: [
      SecuritySubFeatureId.hostIsolationExceptionsBasic,
      SecuritySubFeatureId.trustedApplications,
      SecuritySubFeatureId.blocklist,
      SecuritySubFeatureId.eventFilters,
      SecuritySubFeatureId.globalArtifactManagement,
    ],

    // When endpointArtifactManagement PLI is enabled, the replacedBy for the siemV3 feature needs to
    // account for the privileges of the sub-features that are introduced by it.
    featureConfigModifier: (baseFeatureConfig) => {
      const replacedBy = baseFeatureConfig.privileges?.all?.replacedBy;
      if (!replacedBy) {
        return;
      }

      if ('default' in replacedBy) {
        const v3Default = replacedBy.default.find(
          ({ feature }) => feature === SECURITY_FEATURE_ID_V3 // Only for features that are replaced by siemV3 (siem and siemV2)
        );
        if (v3Default) {
          // Override replaced privileges from `all` to `minimal_all` with additional sub-features privileges
          v3Default.privileges = [
            'minimal_all',
            'global_artifact_management_all', // Enabling sub-features toggle to show that Global Artifact Management is now provided to the user.
          ];
        }
      }

      if ('minimal' in replacedBy) {
        const v3Minimal = replacedBy.minimal.find(
          ({ feature }) => feature === SECURITY_FEATURE_ID_V3 // Only for features that are replaced by siemV3 (siem and siemV2)
        );
        if (v3Minimal) {
          // Override replaced privileges from `all` to `minimal_all` with additional sub-features privileges
          v3Minimal.privileges = [
            'minimal_all',
            'global_artifact_management_all', // on ESS, Endpoint Exception ALL is included in siem:MINIMAL_ALL
          ];
        }
      }
    },
  },
};
