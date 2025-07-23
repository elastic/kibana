/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import immer from 'immer';
import type {
  ProductFeatureKeys,
  ProductFeatureKibanaConfig,
  ProductFeaturesSecurityConfig,
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

export const getSecurityProductFeaturesConfigurator =
  (enabledProductFeatureKeys: ProductFeatureKeys) => (): ProductFeaturesSecurityConfig => {
    return createEnabledProductFeaturesConfigMap(
      securityProductFeaturesConfig,
      enabledProductFeatureKeys
    );
  };

/**
 * Maps the ProductFeatures keys to Kibana privileges that will be merged
 * into the base privileges config for the Security app.
 *
 * Privileges can be added in different ways:
 * - `privileges`: the privileges that will be added directly into the main Security feature.
 * - `subFeatureIds`: the ids of the sub-features that will be added into the Security subFeatures entry.
 * - `subFeaturesPrivileges`: the privileges that will be added into the existing Security subFeature with the privilege `id` specified.
 */
const securityProductFeaturesConfig: Record<
  ProductFeatureSecurityKey,
  ProductFeatureKibanaConfig<SecuritySubFeatureId>
> = {
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
    baseFeatureConfigModifier: (baseFeatureConfig) => {
      return immer(baseFeatureConfig, (draft) => {
        const replacedBy = draft.privileges?.all?.replacedBy;
        if (!replacedBy) {
          return;
        }

        const defaultReplacedBy = Array.isArray(replacedBy) ? replacedBy : replacedBy.default;
        if (defaultReplacedBy) {
          const v3Default = defaultReplacedBy.find(
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

        const minimalReplacedBy = Array.isArray(replacedBy) ? undefined : replacedBy.minimal;
        if (minimalReplacedBy) {
          const v3Minimal = minimalReplacedBy.find(
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
      });
    },
  },
};
