/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { updateGlobalArtifactManageReplacements } from './product_features_extensions';
import { SECURITY_FEATURE_ID_V3 } from '@kbn/security-solution-features/constants';
import type { MutableKibanaFeatureConfig } from '@kbn/security-solution-features';
import { cloneDeep } from 'lodash';

const baseFeatureConfig: MutableKibanaFeatureConfig = {
  id: 'siem',
  name: 'Security Feature',
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

describe('updateGlobalArtifactManageReplacements', () => {
  let featureConfig: MutableKibanaFeatureConfig;

  beforeEach(() => {
    featureConfig = cloneDeep(baseFeatureConfig);
  });

  it('should do nothing if replacedBy is not present', () => {
    const originalConfig = JSON.parse(JSON.stringify(featureConfig));

    updateGlobalArtifactManageReplacements(featureConfig as MutableKibanaFeatureConfig);

    expect(featureConfig).toEqual(originalConfig);
  });

  it('should modify privileges for SECURITY_FEATURE_ID_V3 in both default and minimal', () => {
    const testFeatureConfig = {
      ...featureConfig,
      privileges: {
        ...featureConfig.privileges,
        all: {
          ...featureConfig.privileges?.all,
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

    updateGlobalArtifactManageReplacements(testFeatureConfig as MutableKibanaFeatureConfig);

    const replacedBy = testFeatureConfig.privileges.all.replacedBy;

    // Default privileges modified
    const v3Default = replacedBy.default.find(
      ({ feature }: { feature: string }) => feature === SECURITY_FEATURE_ID_V3
    );
    expect(v3Default?.privileges).toEqual([
      'minimal_all',
      'global_artifact_management_all',
      'endpoint_exceptions_all',
    ]);

    // Ensure other features remain unchanged
    const otherFeature = replacedBy.default.find(
      ({ feature }: { feature: string }) => feature === 'other_feature'
    );
    expect(otherFeature?.privileges).toEqual(['all']);
  });

  it('should only modify existing SECURITY_FEATURE_ID_V3 entries', () => {
    const testFeatureConfig = {
      ...featureConfig,
      privileges: {
        ...featureConfig.privileges,
        all: {
          ...featureConfig.privileges?.all,
          replacedBy: {
            default: [{ feature: 'other_feature', privileges: ['all'] }],
            minimal: [{ feature: 'other_feature', privileges: ['all'] }],
          },
        },
      },
    };

    updateGlobalArtifactManageReplacements(testFeatureConfig as MutableKibanaFeatureConfig);

    const replacedBy = testFeatureConfig.privileges.all.replacedBy;

    // No SECURITY_FEATURE_ID_V3, so no changes
    expect(replacedBy.default[0].privileges).toEqual(['all']);
    expect(replacedBy.minimal[0].privileges).toEqual(['all']);
  });
});
