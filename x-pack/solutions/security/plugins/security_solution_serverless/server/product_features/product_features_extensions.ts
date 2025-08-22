/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  MutableKibanaFeatureConfig,
  ProductFeaturesConfiguratorExtensions,
} from '@kbn/security-solution-features';
import { SECURITY_FEATURE_ID_V3 } from '@kbn/security-solution-features/constants';
import {
  ProductFeatureSecurityKey,
  SecuritySubFeatureId,
} from '@kbn/security-solution-features/keys';

export const productFeaturesExtensions: ProductFeaturesConfiguratorExtensions = {
  security: {
    allVersions: {
      [ProductFeatureSecurityKey.endpointExceptions]: {
        subFeatureIds: [SecuritySubFeatureId.endpointExceptions],
      },
    },
    version: {
      siem: {
        [ProductFeatureSecurityKey.endpointArtifactManagement]: {
          featureConfigModifiers: [updateGlobalArtifactManageReplacements],
        },
      },
      siemV2: {
        [ProductFeatureSecurityKey.endpointArtifactManagement]: {
          featureConfigModifiers: [updateGlobalArtifactManageReplacements],
        },
      },
    },
  },
};

// When endpointArtifactManagement PLI is enabled, the replacedBy to the siemV3 feature needs to
// account for the privileges of the additional sub-features that it introduces, migrating them correctly.
// This needs to be done here because the replacements of serverless and ESS are different.
export function updateGlobalArtifactManageReplacements(
  featureConfig: MutableKibanaFeatureConfig
): void {
  const replacedBy = featureConfig.privileges?.all?.replacedBy;
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
}
