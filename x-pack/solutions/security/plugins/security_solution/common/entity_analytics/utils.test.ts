/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAllEntityTypes, getDisabledEntityTypes } from './utils';
import { EntityType } from './types';
import type { ExperimentalFeatures } from '../experimental_features';
import { mockGlobalState } from '../../public/common/mock';

const mockedExperimentalFeatures = mockGlobalState.app.enableExperimental;

describe('utils', () => {
  describe('getAllEntityTypes', () => {
    it('should return all entity types', () => {
      const entityTypes = getAllEntityTypes();
      expect(entityTypes).toEqual(Object.values(EntityType));
    });
  });

  describe('getDisabledEntityTypes', () => {
    it('should return disabled entity types when serviceEntityStoreEnabled is false', () => {
      const experimentalFeatures: ExperimentalFeatures = {
        ...mockedExperimentalFeatures,
        serviceEntityStoreEnabled: false,
        assetInventoryStoreEnabled: true,
      };
      const disabledEntityTypes = getDisabledEntityTypes(experimentalFeatures);
      expect(disabledEntityTypes).toEqual([EntityType.service]);
    });

    it('should return disabled entity types when assetInventoryStoreEnabled is false', () => {
      const experimentalFeatures: ExperimentalFeatures = {
        ...mockedExperimentalFeatures,
        serviceEntityStoreEnabled: true,
        assetInventoryStoreEnabled: false,
      };
      const disabledEntityTypes = getDisabledEntityTypes(experimentalFeatures);
      expect(disabledEntityTypes).toEqual([EntityType.universal]);
    });

    it('should return both disabled entity types when both features are false', () => {
      const experimentalFeatures: ExperimentalFeatures = {
        ...mockedExperimentalFeatures,
        serviceEntityStoreEnabled: false,
        assetInventoryStoreEnabled: false,
      };
      const disabledEntityTypes = getDisabledEntityTypes(experimentalFeatures);
      expect(disabledEntityTypes).toEqual([EntityType.service, EntityType.universal]);
    });

    it('should return no disabled entity types when both features are true', () => {
      const experimentalFeatures: ExperimentalFeatures = {
        ...mockedExperimentalFeatures,
        serviceEntityStoreEnabled: true,
        assetInventoryStoreEnabled: true,
      };
      const disabledEntityTypes = getDisabledEntityTypes(experimentalFeatures);
      expect(disabledEntityTypes).toEqual([]);
    });
  });
});
