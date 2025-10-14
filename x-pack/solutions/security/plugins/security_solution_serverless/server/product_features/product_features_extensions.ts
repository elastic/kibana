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
import { ProductFeatureSecurityKey } from '@kbn/security-solution-features/keys';
import { SECURITY_FEATURE_ID } from '@kbn/security-solution-plugin/common';

export const productFeaturesExtensions: ProductFeaturesConfiguratorExtensions = {
  security: {
    allVersions: {},
    version: {
      siem: {
        [ProductFeatureSecurityKey.endpointArtifactManagement]: {
          featureConfigModifiers: [
            enableSecuritySubfeaturesToggle,
            addGlobalArtifactManagementToAll,
          ],
        },
        [ProductFeatureSecurityKey.endpointExceptions]: {
          featureConfigModifiers: [
            enableSecuritySubfeaturesToggle,
            addEndpointExceptionsToReadAndAll,
          ],
          // On Serverless, endpoint exception was a sub-feature privilege, but was included in security 'read' and 'all'.
          // Using `includeIn` here will provide backwards compatibility, without adding endpoint exceptions api privileges
          // to security 'minimal_read' and 'minimal_all'.
          subFeaturesPrivileges: [
            { id: 'endpoint_exceptions_all', includeIn: 'all' },
            { id: 'endpoint_exceptions_read', includeIn: 'read' },
          ],
        },
      },
      siemV2: {
        [ProductFeatureSecurityKey.endpointArtifactManagement]: {
          featureConfigModifiers: [
            enableSecuritySubfeaturesToggle,
            addGlobalArtifactManagementToAll,
          ],
        },
        [ProductFeatureSecurityKey.endpointExceptions]: {
          featureConfigModifiers: [
            enableSecuritySubfeaturesToggle,
            addEndpointExceptionsToReadAndAll,
          ],
          subFeaturesPrivileges: [
            { id: 'endpoint_exceptions_all', includeIn: 'all' },
            { id: 'endpoint_exceptions_read', includeIn: 'read' },
          ],
        },
      },
      siemV3: {
        [ProductFeatureSecurityKey.endpointExceptions]: {
          featureConfigModifiers: [
            enableSecuritySubfeaturesToggle,
            addEndpointExceptionsToReadAndAll,
          ],
          subFeaturesPrivileges: [
            { id: 'endpoint_exceptions_all', includeIn: 'all' },
            { id: 'endpoint_exceptions_read', includeIn: 'read' },
          ],
        },
      },
    },
  },
};

// When endpointArtifactManagement PLI is enabled, the replacedBy to the SIEM feature needs to
// account for the privileges of the additional sub-features that it introduces, migrating them correctly.
// This needs to be done here because some the replacements of serverless and ESS are different, other
// replacements are tied to endpointArtifactManagement PLI - hence PLI related privileges cannot be added to
// the shared base config in `kibana_features.ts`.
export function addGlobalArtifactManagementToAll(featureConfig: MutableKibanaFeatureConfig): void {
  const allReplacedBy = featureConfig.privileges?.all?.replacedBy;

  if (allReplacedBy && 'default' in allReplacedBy) {
    const siemAll = allReplacedBy.default.find(({ feature }) => feature === SECURITY_FEATURE_ID);

    // on ESS, Endpoint Exception ALL is included in siem:ALL, hence we're adding global artifact management to preserve behaviour
    siemAll?.privileges.push('global_artifact_management_all');
  }
}

// When Endpoint Exceptions sub-feature privilege is harmonized between ESS and Serverless (from siemV4),
// the privileges needed to be added to users with specific security privileges.
// On ESS, Endpoint exceptions were included in siem:MINIMAL_READ and siem:MINIMAL_ALL.
export function addEndpointExceptionsToReadAndAll(featureConfig: MutableKibanaFeatureConfig): void {
  const readReplacedBy = featureConfig.privileges?.read?.replacedBy;
  if (readReplacedBy && 'default' in readReplacedBy) {
    const siemRead = readReplacedBy.default.find(({ feature }) => feature === SECURITY_FEATURE_ID);

    siemRead?.privileges.push('endpoint_exceptions_read');
  }

  const allReplacedBy = featureConfig.privileges?.all?.replacedBy;
  if (allReplacedBy && 'default' in allReplacedBy) {
    const siemAll = allReplacedBy.default.find(({ feature }) => feature === SECURITY_FEATURE_ID);

    siemAll?.privileges.push('endpoint_exceptions_all');
  }
}

export function enableSecuritySubfeaturesToggle(featureConfig: MutableKibanaFeatureConfig): void {
  const readReplacedBy = featureConfig.privileges?.read?.replacedBy;
  if (readReplacedBy && 'default' in readReplacedBy) {
    const siemRead = readReplacedBy.default.find(({ feature }) => feature === SECURITY_FEATURE_ID);

    if (siemRead) {
      siemRead.privileges = siemRead.privileges.map((privilege) =>
        privilege === 'read' ? 'minimal_read' : privilege
      );
    }
  }

  const allReplacedBy = featureConfig.privileges?.all?.replacedBy;
  if (allReplacedBy && 'default' in allReplacedBy) {
    const siemAll = allReplacedBy.default.find(({ feature }) => feature === SECURITY_FEATURE_ID);

    if (siemAll) {
      siemAll.privileges = siemAll.privileges.map((privilege) =>
        privilege === 'all' ? 'minimal_all' : privilege
      );
    }
  }
}
