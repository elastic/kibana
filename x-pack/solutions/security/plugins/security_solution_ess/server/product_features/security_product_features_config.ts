/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
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
import {
  ProductFeaturesPrivilegeId,
  ProductFeaturesPrivileges,
} from '@kbn/security-solution-features/privileges';
import { SECURITY_FEATURE_ID_V3 } from '@kbn/security-solution-features/constants';

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
    privileges: ProductFeaturesPrivileges[ProductFeaturesPrivilegeId.endpointExceptions],
  },

  [ProductFeatureSecurityKey.endpointArtifactManagement]: {
    subFeatureIds: [
      SecuritySubFeatureId.hostIsolationExceptionsBasic,
      SecuritySubFeatureId.trustedApplications,
      SecuritySubFeatureId.blocklist,
      SecuritySubFeatureId.eventFilters,
      SecuritySubFeatureId.globalArtifactManagement,
    ],

    baseFeatureConfigModifier: (baseFeatureConfig) => {
      if (
        !['siem', 'siemV2'].includes(baseFeatureConfig.id) ||
        !baseFeatureConfig.privileges?.all.replacedBy ||
        !('default' in baseFeatureConfig.privileges.all.replacedBy)
      ) {
        return baseFeatureConfig;
      }

      return {
        ...baseFeatureConfig,
        privileges: {
          ...baseFeatureConfig.privileges,

          all: {
            ...baseFeatureConfig.privileges.all,

            // overwriting siem:ALL role migration in siem and siemV2
            replacedBy: {
              default: baseFeatureConfig.privileges.all.replacedBy.default.map(
                (privilegesPreference) => {
                  if (privilegesPreference.feature === SECURITY_FEATURE_ID_V3) {
                    return {
                      feature: SECURITY_FEATURE_ID_V3,
                      privileges: [
                        // Enabling sub-features toggle to show that Global Artifact Management is now provided to the user.
                        'minimal_all',

                        // Writing global (not per-policy) Artifacts is gated with Global Artifact Management:ALL starting with siemV3.
                        // Users who have been able to write ANY Artifact before are now granted with this privilege to keep existing behavior.
                        // This migration is for Endpoint Exceptions artifact in ESS offering, as it included in Security:ALL privilege.
                        'global_artifact_management_all',
                      ],
                    };
                  }

                  return privilegesPreference;
                }
              ),

              minimal: baseFeatureConfig.privileges.all.replacedBy.minimal.map(
                (privilegesPreference) => {
                  if (privilegesPreference.feature === SECURITY_FEATURE_ID_V3) {
                    return {
                      feature: SECURITY_FEATURE_ID_V3,
                      privileges: [
                        'minimal_all',

                        // on ESS, Endpoint Exception ALL is included in siem:MINIMAL_ALL
                        'global_artifact_management_all',
                      ],
                    };
                  }

                  return privilegesPreference;
                }
              ),
            },
          },
        },
      };
    },
  },
};
