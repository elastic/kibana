/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityType } from '../definitions/entity_schema';
import { getEuidPainlessEvaluation } from './painless';

describe('getEuidPainlessEvaluation', () => {
  describe('snapshots per entity type', () => {
    Object.values(EntityType.Values).forEach((entityType) => {
      it(`generates the expected Painless script for ${entityType}`, () => {
        const script = getEuidPainlessEvaluation(entityType);
        expect(script).toMatchSnapshot();
      });
    });
  });
});
