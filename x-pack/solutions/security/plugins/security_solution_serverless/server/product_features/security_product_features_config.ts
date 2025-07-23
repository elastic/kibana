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
  securityDefaultProductFeaturesConfig,
  createEnabledProductFeaturesConfigMap,
} from '@kbn/security-solution-features/config';
import {
  ProductFeatureSecurityKey,
  SecuritySubFeatureId,
} from '@kbn/security-solution-features/keys';
import { SECURITY_FEATURE_ID_V3 } from '@kbn/security-solution-features/constants';
import { APP_ID } from '@kbn/security-solution-plugin/common';
import type { ExperimentalFeatures } from '../../common/experimental_features';

export const getSecurityProductFeaturesConfigurator =
  (
    enabledProductFeatureKeys: ProductFeatureKeys,
    _: ExperimentalFeatures // currently un-used, but left here as a convenience for possible future use
  ) =>
  (): ProductFeaturesSecurityConfig => {
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
    subFeatureIds: [SecuritySubFeatureId.endpointExceptions],
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
        if (!replacedBy || !('default' in replacedBy)) {
          return;
        }
        // only "default" is overwritten, "minimal" is not as it does not includes Endpoint Exceptions ALL.
        const v3Default = replacedBy.default.find(
          ({ feature }) => feature === SECURITY_FEATURE_ID_V3 // Only for features that are replaced by siemV3 (siem and siemV2)
        );
        if (v3Default) {
          // Override replaced privileges from `all` to `minimal_all` with additional sub-features privileges
          v3Default.privileges = [
            'minimal_all',
            // Writing global (not per-policy) Artifacts is gated with Global Artifact Management:ALL starting with siemV3.
            // Users who have been able to write ANY Artifact before are now granted with this privilege to keep existing behavior.
            // This migration is for Endpoint Exceptions artifact in Serverless offering, as it included in Security:ALL privilege.
            'global_artifact_management_all',
            // As we are switching from `all` to `minimal_all`, Endpoint Exceptions is needed to be added, as it was included in `all`,
            // but not in `minimal_all`.
            'endpoint_exceptions_all',
          ];
        }
      });
    },
  },
};
