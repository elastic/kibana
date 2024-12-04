/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_RECURSION_DEPTH, RuleResourceRetriever } from './rule_resource_retriever'; // Adjust path as needed
import type { OriginalRule } from '../../../../../../common/siem_migrations/model/rule_migration.gen';
import { MockRuleMigrationsDataClient } from '../../data/__mocks__/mocks';

const mockRuleResourceIdentifier = jest.fn();
const mockGetRuleResourceIdentifier = jest.fn((_: unknown) => mockRuleResourceIdentifier);
jest.mock('../../../../../../common/siem_migrations/rules/resources', () => ({
  getRuleResourceIdentifier: (params: unknown) => mockGetRuleResourceIdentifier(params),
}));

jest.mock('../../data/rule_migrations_data_service');

describe('RuleResourceRetriever', () => {
  let retriever: RuleResourceRetriever;
  const mockRuleMigrationsDataClient = new MockRuleMigrationsDataClient();
  const migrationId = 'test-migration-id';
  const ruleQuery = 'rule-query';
  const originalRule = { query: ruleQuery } as OriginalRule;

  beforeEach(() => {
    retriever = new RuleResourceRetriever(migrationId, mockRuleMigrationsDataClient);
    mockRuleResourceIdentifier.mockReturnValue({ list: [], macro: [] });

    mockRuleMigrationsDataClient.resources.get.mockImplementation(
      async (_: string, type: string, names: string[]) =>
        names.map((name) => ({ type, name, content: `${name}-content` }))
    );

    mockRuleResourceIdentifier.mockImplementation((query) => {
      if (query === ruleQuery) {
        return { list: ['list1', 'list2'], macro: ['macro1'] };
      }
      return { list: [], macro: [] };
    });

    jest.clearAllMocks();
  });

  describe('getResources', () => {
    it('should call resource identification', async () => {
      await retriever.getResources(originalRule);

      expect(mockGetRuleResourceIdentifier).toHaveBeenCalledWith(originalRule);
      expect(mockRuleResourceIdentifier).toHaveBeenCalledWith(ruleQuery);
      expect(mockRuleResourceIdentifier).toHaveBeenCalledWith('macro1-content');
    });

    it('should retrieve resources', async () => {
      const resources = await retriever.getResources(originalRule);

      expect(mockRuleMigrationsDataClient.resources.get).toHaveBeenCalledWith(migrationId, 'list', [
        'list1',
        'list2',
      ]);
      expect(mockRuleMigrationsDataClient.resources.get).toHaveBeenCalledWith(
        migrationId,
        'macro',
        ['macro1']
      );

      expect(resources).toEqual({
        list: [
          { type: 'list', name: 'list1', content: 'list1-content' },
          { type: 'list', name: 'list2', content: 'list2-content' },
        ],
        macro: [{ type: 'macro', name: 'macro1', content: 'macro1-content' }],
      });
    });

    it('should retrieve nested resources', async () => {
      mockRuleResourceIdentifier.mockImplementation((query) => {
        if (query === ruleQuery) {
          return { list: ['list1', 'list2'], macro: ['macro1'] };
        }
        if (query === 'macro1-content') {
          return { list: ['list3'], macro: [] };
        }
        return { list: [], macro: [] };
      });

      const resources = await retriever.getResources(originalRule);

      expect(mockRuleMigrationsDataClient.resources.get).toHaveBeenCalledWith(migrationId, 'list', [
        'list1',
        'list2',
      ]);
      expect(mockRuleMigrationsDataClient.resources.get).toHaveBeenCalledWith(
        migrationId,
        'macro',
        ['macro1']
      );
      expect(mockRuleMigrationsDataClient.resources.get).toHaveBeenCalledWith(migrationId, 'list', [
        'list3',
      ]);

      expect(resources).toEqual({
        list: [
          { type: 'list', name: 'list1', content: 'list1-content' },
          { type: 'list', name: 'list2', content: 'list2-content' },
          { type: 'list', name: 'list3', content: 'list3-content' },
        ],
        macro: [{ type: 'macro', name: 'macro1', content: 'macro1-content' }],
      });
    });

    it('should handle missing macros', async () => {
      mockRuleMigrationsDataClient.resources.get.mockImplementation(
        async (_: string, type: string, names: string[]) => {
          if (type === 'macro') {
            return [];
          }
          return names.map((name) => ({ type, name, content: `${name}-content` }));
        }
      );

      const resources = await retriever.getResources(originalRule);

      expect(resources).toEqual({
        list: [
          { type: 'list', name: 'list1', content: 'list1-content' },
          { type: 'list', name: 'list2', content: 'list2-content' },
        ],
      });
    });

    it('should handle missing lists', async () => {
      mockRuleMigrationsDataClient.resources.get.mockImplementation(
        async (_: string, type: string, names: string[]) => {
          if (type === 'list') {
            return [];
          }
          return names.map((name) => ({ type, name, content: `${name}-content` }));
        }
      );

      const resources = await retriever.getResources(originalRule);

      expect(resources).toEqual({
        macro: [{ type: 'macro', name: 'macro1', content: 'macro1-content' }],
      });
    });

    it('should not include resources with missing content', async () => {
      mockRuleMigrationsDataClient.resources.get.mockImplementation(
        async (_: string, type: string, names: string[]) => {
          return names.map((name) => {
            if (name === 'list1') {
              return { type, name, content: '' };
            }
            return { type, name, content: `${name}-content` };
          });
        }
      );

      const resources = await retriever.getResources(originalRule);

      expect(resources).toEqual({
        list: [{ type: 'list', name: 'list2', content: 'list2-content' }],
        macro: [{ type: 'macro', name: 'macro1', content: 'macro1-content' }],
      });
    });

    it('should stop recursion after reaching MAX_RECURSION_DEPTH', async () => {
      mockRuleResourceIdentifier.mockImplementation(() => {
        return { list: [], macro: ['infinite-macro'] };
      });

      const resources = await retriever.getResources(originalRule);

      expect(resources.macro?.length).toEqual(MAX_RECURSION_DEPTH);
    });
  });
});
