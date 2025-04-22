/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getEnabledEntityTypes, getEntityAnalyticsEntityTypes } from './utils';
import { EntityType } from './types';

describe('utils', () => {
  describe('getEntityAnalyticsEntityTypes', () => {
    it('should return all Entity Analytics entity types', () => {
      const entityTypes = getEntityAnalyticsEntityTypes();
      expect(entityTypes).toEqual([EntityType.user, EntityType.host, EntityType.service]);
    });
  });

  describe('getEnabledEntityTypes', () => {
    it('should return all entity types', () => {
      const entityTypes = getEnabledEntityTypes(true);
      expect(entityTypes).toEqual(Object.values(EntityType));
    });

    it('should not return generic', () => {
      const entityTypes = getEnabledEntityTypes(false);
      expect(entityTypes).toEqual([EntityType.user, EntityType.host, EntityType.service]);
    });
  });
});
