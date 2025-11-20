/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  addEndpointExceptionsToMinimalReadAndMinimalAll,
  addEndpointExceptionsToReadAndAll,
  addGlobalArtifactManagementToAll,
  addGlobalArtifactManagementToMinimalAll,
  enableSecuritySubfeaturesToggle,
} from './product_features_extensions';
import { SECURITY_FEATURE_ID } from '@kbn/security-solution-plugin/common';
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
      api: [`${SECURITY_FEATURE_ID}-all`],
    },
    read: {
      savedObject: {
        all: ['*'],
        read: ['*'],
      },
      ui: ['read'],
      api: [`${SECURITY_FEATURE_ID}-read`],
    },
  },
};

describe('ESS product feature extensions - feature config modifiers', () => {
  let configWithoutReplacedBy: MutableKibanaFeatureConfig;
  let configWithReplacedBy: MutableKibanaFeatureConfig;

  beforeEach(() => {
    configWithoutReplacedBy = cloneDeep(baseFeatureConfig);
    configWithReplacedBy = cloneDeep({
      ...configWithoutReplacedBy,
      privileges: {
        ...configWithoutReplacedBy.privileges,
        all: {
          ...configWithoutReplacedBy.privileges?.all,
          replacedBy: {
            default: [
              { feature: SECURITY_FEATURE_ID, privileges: ['all'] },
              { feature: 'other_feature', privileges: ['all'] },
            ],
            minimal: [
              { feature: SECURITY_FEATURE_ID, privileges: ['minimal_all'] },
              { feature: 'other_feature', privileges: ['minimal_all'] },
            ],
          },
        },
        read: {
          ...configWithoutReplacedBy.privileges?.read,
          replacedBy: {
            default: [
              { feature: SECURITY_FEATURE_ID, privileges: ['read'] },
              { feature: 'other_feature', privileges: ['read'] },
            ],
            minimal: [
              { feature: SECURITY_FEATURE_ID, privileges: ['minimal_read'] },
              { feature: 'other_feature', privileges: ['minimal_read'] },
            ],
          },
        },
      },
    }) as MutableKibanaFeatureConfig;
  });

  describe('addGlobalArtifactManagementToMinimalAll', () => {
    it('should do nothing if replacedBy is not present', () => {
      const testConfig = cloneDeep(configWithoutReplacedBy);

      addGlobalArtifactManagementToMinimalAll(testConfig);

      expect(testConfig).toEqual(configWithoutReplacedBy);
    });

    it('should add global artifact management privilege to siem.minimal_all', () => {
      const testConfig = cloneDeep(configWithReplacedBy);

      addGlobalArtifactManagementToMinimalAll(testConfig);

      expect(testConfig.privileges?.all.replacedBy).toEqual({
        default: [
          { feature: SECURITY_FEATURE_ID, privileges: ['all'] },
          { feature: 'other_feature', privileges: ['all'] },
        ],
        minimal: [
          {
            feature: SECURITY_FEATURE_ID,
            privileges: [
              'minimal_all',
              'global_artifact_management_all', // <- global artifact management is added
            ],
          },
          { feature: 'other_feature', privileges: ['minimal_all'] },
        ],
      });
      expect(testConfig.privileges?.read.replacedBy).toEqual(
        configWithReplacedBy.privileges?.read.replacedBy
      );
    });
  });

  describe('addGlobalArtifactManagementToAll', () => {
    it('should do nothing if replacedBy is not present', () => {
      const testConfig = cloneDeep(configWithoutReplacedBy);

      addGlobalArtifactManagementToAll(testConfig);

      expect(testConfig).toEqual(configWithoutReplacedBy);
    });

    it('should add global artifact management privilege to siem.all', () => {
      const testConfig = cloneDeep(configWithReplacedBy);

      addGlobalArtifactManagementToAll(testConfig);

      expect(testConfig.privileges?.all.replacedBy).toEqual({
        default: [
          {
            feature: SECURITY_FEATURE_ID,
            privileges: [
              'all',
              'global_artifact_management_all', // <- global artifact management is added
            ],
          },
          { feature: 'other_feature', privileges: ['all'] },
        ],
        minimal: [
          { feature: SECURITY_FEATURE_ID, privileges: ['minimal_all'] },
          { feature: 'other_feature', privileges: ['minimal_all'] },
        ],
      });
      expect(testConfig.privileges?.read.replacedBy).toEqual(
        configWithReplacedBy.privileges?.read.replacedBy
      );
    });
  });

  describe('addEndpointExceptionsToMinimalReadAndMinimalAll', () => {
    it('should do nothing if replacedBy is not present', () => {
      const testConfig = cloneDeep(configWithoutReplacedBy);

      addEndpointExceptionsToMinimalReadAndMinimalAll(testConfig);

      expect(testConfig).toEqual(configWithoutReplacedBy);
    });

    it('should add endpoint exceptions privilege to siem.minimal_all and siem.minimal_read', () => {
      const testConfig = cloneDeep(configWithReplacedBy);

      addEndpointExceptionsToMinimalReadAndMinimalAll(testConfig);

      expect(testConfig.privileges?.all.replacedBy).toEqual({
        default: [
          { feature: SECURITY_FEATURE_ID, privileges: ['all'] },
          { feature: 'other_feature', privileges: ['all'] },
        ],
        minimal: [
          {
            feature: SECURITY_FEATURE_ID,
            privileges: ['minimal_all', 'endpoint_exceptions_all'], // <- endpoint exception is added
          },
          { feature: 'other_feature', privileges: ['minimal_all'] },
        ],
      });
      expect(testConfig.privileges?.read.replacedBy).toEqual({
        default: [
          { feature: SECURITY_FEATURE_ID, privileges: ['read'] },
          { feature: 'other_feature', privileges: ['read'] },
        ],
        minimal: [
          {
            feature: SECURITY_FEATURE_ID,
            privileges: ['minimal_read', 'endpoint_exceptions_read'], // <- endpoint exception is added
          },
          { feature: 'other_feature', privileges: ['minimal_read'] },
        ],
      });
    });
  });

  describe('addEndpointExceptionsToReadAndAll', () => {
    it('should do nothing if replacedBy is not present', () => {
      const testConfig = cloneDeep(configWithoutReplacedBy);

      addEndpointExceptionsToReadAndAll(testConfig);

      expect(testConfig).toEqual(configWithoutReplacedBy);
    });

    it('should add endpoint exceptions privilege to siem.all and siem.read', () => {
      const testConfig = cloneDeep(configWithReplacedBy);

      addEndpointExceptionsToReadAndAll(testConfig);

      expect(testConfig.privileges?.all.replacedBy).toEqual({
        default: [
          {
            feature: SECURITY_FEATURE_ID,
            privileges: [
              'all',
              'endpoint_exceptions_all', // <- endpoint exception is added
            ],
          },
          { feature: 'other_feature', privileges: ['all'] },
        ],
        minimal: [
          {
            feature: SECURITY_FEATURE_ID,
            privileges: ['minimal_all'],
          },
          { feature: 'other_feature', privileges: ['minimal_all'] },
        ],
      });
      expect(testConfig.privileges?.read.replacedBy).toEqual({
        default: [
          {
            feature: SECURITY_FEATURE_ID,
            privileges: ['read', 'endpoint_exceptions_read'], // <- endpoint exception is added
          },
          { feature: 'other_feature', privileges: ['read'] },
        ],
        minimal: [
          { feature: SECURITY_FEATURE_ID, privileges: ['minimal_read'] },
          { feature: 'other_feature', privileges: ['minimal_read'] },
        ],
      });
    });
  });

  describe('enableSecuritySubfeaturesToggle', () => {
    it('should do nothing if replacedBy is not present', () => {
      const testConfig = cloneDeep(configWithoutReplacedBy);

      enableSecuritySubfeaturesToggle(testConfig);

      expect(testConfig).toEqual(configWithoutReplacedBy);
    });

    it('should change `all` and `read` to `minimal_all` and `minimal_read`', () => {
      const testConfig = cloneDeep(configWithReplacedBy);

      enableSecuritySubfeaturesToggle(testConfig);

      expect(testConfig.privileges?.all.replacedBy).toEqual({
        default: [
          { feature: SECURITY_FEATURE_ID, privileges: ['minimal_all'] }, // <- changed to 'minimal'
          { feature: 'other_feature', privileges: ['all'] },
        ],
        minimal: [
          { feature: SECURITY_FEATURE_ID, privileges: ['minimal_all'] },
          { feature: 'other_feature', privileges: ['minimal_all'] },
        ],
      });
      expect(testConfig.privileges?.read.replacedBy).toEqual({
        default: [
          { feature: SECURITY_FEATURE_ID, privileges: ['minimal_read'] }, // <- changed to 'minimal'
          { feature: 'other_feature', privileges: ['read'] },
        ],
        minimal: [
          { feature: SECURITY_FEATURE_ID, privileges: ['minimal_read'] },
          { feature: 'other_feature', privileges: ['minimal_read'] },
        ],
      });
    });
  });
});
