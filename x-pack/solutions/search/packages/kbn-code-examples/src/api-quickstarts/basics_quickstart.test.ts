/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { basicsQuickstartCommands } from './basics_quickstart';

describe('basics quickstart', () => {
  describe('with index name provided', () => {
    it('generates correct number of steps when creating an index', () => {
      const commands = basicsQuickstartCommands({ indexName: 'test-index', createIndex: true });
      // Find the number of steps, search for # Step <number>
      const steps = commands.match(/# Step \d+/g) || [];
      expect(steps).toHaveLength(10);
    });
    it('generates correct number of steps when index exists', () => {
      const commands = basicsQuickstartCommands({ indexName: 'test-index', createIndex: false });
      const steps = commands.match(/# Step \d+/g) || [];
      expect(steps).toHaveLength(9);
    });
  });

  describe('no index name provided', () => {
    const commands = basicsQuickstartCommands({ createIndex: true });
    it('should default to "books" as the index name', () => {
      expect(commands).toContain('PUT /books');
    });
  });
});
