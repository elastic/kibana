/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { KibanaFeatureConfig } from '@kbn/features-plugin/common';
import { endpointArtifactManagementFeatureConfigModifier } from './security_product_features_config';
import { SECURITY_FEATURE_ID_V3 } from '@kbn/security-solution-features/constants';

const baseFeatureConfig = {
  id: SECURITY_FEATURE_ID_V3,
  name: 'Security Feature V3',
  app: ['securitySolution'],
  category: { id: 'security', label: 'Security' },
  privileges: {
    all: {
      savedObject: {
        all: ['*'],
        read: ['*'],
      },
      ui: ['all'],
      api: [`${SECURITY_FEATURE_ID_V3}-all`],
    },
    read: {
      savedObject: {
        all: ['*'],
        read: ['*'],
      },
      ui: ['read'],
      api: [`${SECURITY_FEATURE_ID_V3}-read`],
    },
  },
};

describe('endpointArtifactManagementFeatureConfigModifier', () => {
  it('should modify privileges for SECURITY_FEATURE_ID_V3 in both default and minimal', () => {
    const featureConfig = {
      ...baseFeatureConfig,
      privileges: {
        ...baseFeatureConfig.privileges,
        all: {
          ...baseFeatureConfig.privileges.all,
          replacedBy: {
            default: [
              { feature: SECURITY_FEATURE_ID_V3, privileges: ['all'] },
              { feature: 'other_feature', privileges: ['all'] },
            ],
            minimal: [{ feature: SECURITY_FEATURE_ID_V3, privileges: ['all'] }],
          },
        },
      },
    };

    endpointArtifactManagementFeatureConfigModifier(featureConfig);

    const replacedBy = featureConfig.privileges.all.replacedBy;

    // Default privileges modified
    const v3Default = replacedBy.default.find(
      ({ feature }: { feature: string }) => feature === SECURITY_FEATURE_ID_V3
    );
    expect(v3Default?.privileges).toEqual([
      'minimal_all',
      'global_artifact_management_all',
      'endpoint_exceptions_all',
    ]);

    // Minimal privileges modified
    const v3Minimal = replacedBy.minimal.find(
      ({ feature }: { feature: string }) => feature === SECURITY_FEATURE_ID_V3
    );
    expect(v3Minimal?.privileges).toEqual(['all']);

    // Ensure other features remain unchanged
    const otherFeature = replacedBy.default.find(
      ({ feature }: { feature: string }) => feature === 'other_feature'
    );
    expect(otherFeature?.privileges).toEqual(['all']);
  });

  it('should do nothing if replacedBy is not present', () => {
    const originalConfig = JSON.parse(JSON.stringify(baseFeatureConfig));

    endpointArtifactManagementFeatureConfigModifier(baseFeatureConfig as KibanaFeatureConfig);

    expect(baseFeatureConfig).toEqual(originalConfig);
  });

  it('should only modify existing SECURITY_FEATURE_ID_V3 entries', () => {
    const featureConfig = {
      ...baseFeatureConfig,
      privileges: {
        ...baseFeatureConfig.privileges,
        all: {
          ...baseFeatureConfig.privileges.all,
          replacedBy: {
            default: [{ feature: 'other_feature', privileges: ['all'] }],
            minimal: [{ feature: 'other_feature', privileges: ['all'] }],
          },
        },
      },
    };

    endpointArtifactManagementFeatureConfigModifier(featureConfig);

    const replacedBy = featureConfig.privileges.all.replacedBy;

    // No SECURITY_FEATURE_ID_V3, so no changes
    expect(replacedBy.default[0].privileges).toEqual(['all']);
    expect(replacedBy.minimal[0].privileges).toEqual(['all']);
  });
});
