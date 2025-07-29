/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { updateGlobalArtifactManagerPrivileges } from './security_product_features_config';
import { SECURITY_FEATURE_ID_V3 } from '@kbn/security-solution-features/constants';
import type { MutableKibanaFeatureConfig } from '@kbn/security-solution-features';
import { APP_ID } from '@kbn/security-solution-plugin/common';
import { cloneDeep } from 'lodash';

const baseFeatureConfig: MutableKibanaFeatureConfig = {
  id: '[setTestFeatureId]',
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

describe('updateGlobalArtifactManagerPrivileges', () => {
  describe.each(['siem', 'siemV2'])('when features id is %s', (featureId: string) => {
    let featureConfig: MutableKibanaFeatureConfig;

    beforeEach(() => {
      featureConfig = { ...cloneDeep(baseFeatureConfig), id: featureId };
    });

    it('should do nothing if replacedBy is not present', () => {
      const originalConfig = JSON.parse(JSON.stringify(featureConfig));

      updateGlobalArtifactManagerPrivileges(featureConfig as MutableKibanaFeatureConfig);

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

      updateGlobalArtifactManagerPrivileges(testFeatureConfig as MutableKibanaFeatureConfig);

      const replacedBy = testFeatureConfig.privileges.all.replacedBy;

      // Default privileges modified
      const v3Default = replacedBy.default.find(
        ({ feature }: { feature: string }) => feature === SECURITY_FEATURE_ID_V3
      );
      expect(v3Default?.privileges).toEqual(['minimal_all', 'global_artifact_management_all']);

      // Minimal privileges modified
      const v3Minimal = replacedBy.minimal.find(
        ({ feature }: { feature: string }) => feature === SECURITY_FEATURE_ID_V3
      );
      expect(v3Minimal?.privileges).toEqual(['minimal_all', 'global_artifact_management_all']);

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

      updateGlobalArtifactManagerPrivileges(testFeatureConfig as MutableKibanaFeatureConfig);

      const replacedBy = testFeatureConfig.privileges.all.replacedBy;

      // No SECURITY_FEATURE_ID_V3, so no changes
      expect(replacedBy.default[0].privileges).toEqual(['all']);
      expect(replacedBy.minimal[0].privileges).toEqual(['all']);
    });

    it('should add writeGlobalArtifacts api action', () => {
      const testFeatureConfig = {
        ...featureConfig,
        privileges: {
          ...featureConfig.privileges,
          all: {
            ...featureConfig.privileges?.all,
            replacedBy: { default: [{ feature: SECURITY_FEATURE_ID_V3, privileges: ['all'] }] },
          },
        },
      };

      updateGlobalArtifactManagerPrivileges(testFeatureConfig as MutableKibanaFeatureConfig);

      expect(featureConfig.privileges?.all.api).toContain(`${APP_ID}-writeGlobalArtifacts`);
    });
  });

  describe('when feature id is siemV3', () => {
    it('should not modify privileges', () => {
      const featureConfig = {
        ...baseFeatureConfig,
        id: 'siemV3',
        privileges: {
          ...baseFeatureConfig.privileges,
          all: {
            ...baseFeatureConfig.privileges?.all,
            replacedBy: {
              default: [{ feature: SECURITY_FEATURE_ID_V3, privileges: ['all'] }],
              minimal: [{ feature: SECURITY_FEATURE_ID_V3, privileges: ['all'] }],
            },
          },
        },
      };

      updateGlobalArtifactManagerPrivileges(featureConfig as MutableKibanaFeatureConfig);

      const replacedBy = featureConfig.privileges.all.replacedBy;

      // No changes to SECURITY_FEATURE_ID_V3
      expect(replacedBy.default[0].privileges).toEqual(['all']);
      expect(replacedBy.minimal[0].privileges).toEqual(['all']);
    });

    it('should not add writeGlobalArtifacts api action', () => {
      const featureConfig = { ...baseFeatureConfig, id: 'siemV3' };

      updateGlobalArtifactManagerPrivileges(featureConfig as MutableKibanaFeatureConfig);

      expect(featureConfig.privileges?.all.api).not.toContain(`${APP_ID}-writeGlobalArtifacts`);
    });
  });
});
