/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { basicsQuickstartCommands } from './basics_quickstart';

describe('basics quickstart', () => {
  describe('with index name provided', () => {
    it('should generate the correct number of steps with an index name', () => {
      const commands = basicsQuickstartCommands({ indexName: 'test-index' });
      // Find the number of steps, search for # Step <number>
      const steps = commands.match(/# Step \d+/g) || [];
      expect(steps).toHaveLength(9);
    });
  });

  describe('no index name provided', () => {
    const commands = basicsQuickstartCommands();
    it('should generate the correct number of steps', () => {
      const steps = commands.match(/# Step \d+/g) || [];
      expect(steps).toHaveLength(10);
    });
    it('should default to "books" as the index name', () => {
      expect(commands).toContain('PUT /books');
    });
  });
});
