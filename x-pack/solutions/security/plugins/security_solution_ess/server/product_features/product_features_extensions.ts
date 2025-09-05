/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SECURITY_FEATURE_ID_V3 } from '@kbn/security-solution-features/constants';
import { APP_ID } from '@kbn/security-solution-plugin/common';
import { ProductFeatureSecurityKey } from '@kbn/security-solution-features/keys';
import type {
  MutableKibanaFeatureConfig,
  ProductFeaturesConfiguratorExtensions,
} from '@kbn/security-solution-features';

export const productFeaturesExtensions: ProductFeaturesConfiguratorExtensions = {
  security: {
    allVersions: {
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
  if (!replacedBy) {
    return;
  }

  if ('default' in replacedBy) {
    const v3Default = replacedBy.default.find(({ feature }) => feature === SECURITY_FEATURE_ID_V3);
    if (v3Default) {
      // Override replaced privileges from `all` to `minimal_all` with additional sub-features privileges
      v3Default.privileges = [
        'minimal_all',
        'global_artifact_management_all', // Enabling sub-features toggle to show that Global Artifact Management is now provided to the user.
      ];
    }
  }

  if ('minimal' in replacedBy) {
    const v3Minimal = replacedBy.minimal.find(({ feature }) => feature === SECURITY_FEATURE_ID_V3);
    if (v3Minimal) {
      // Override replaced privileges from `all` to `minimal_all` with additional sub-features privileges
      v3Minimal.privileges = [
        'minimal_all',
        'global_artifact_management_all', // on ESS, Endpoint Exception ALL is included in siem:MINIMAL_ALL
      ];
    }
  }
}
