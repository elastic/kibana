/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getEntityAnalyticsEntityTypes } from './utils';
import { EntityType } from './types';

describe('utils', () => {
  describe('getAllEntityTypes', () => {
    it('should return all entity types', () => {
      const entityTypes = getEntityAnalyticsEntityTypes();
      expect(entityTypes).toEqual([EntityType.host, EntityType.user, EntityType.service]);
    });
  });
});
