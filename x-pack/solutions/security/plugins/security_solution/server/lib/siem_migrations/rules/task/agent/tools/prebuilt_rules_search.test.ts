/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRuleMigrationsDataClientMock } from '../../../data/__mocks__/mocks';
import { getPrebuiltRulesSearchTool } from './prebuilt_rules_search';

describe('getPrebuiltRulesSearchTool', () => {
  it('searches prebuilt rules and returns a compact payload', async () => {
    const rulesClient = createRuleMigrationsDataClientMock();
    (rulesClient.prebuiltRules.search as jest.Mock).mockResolvedValue([
      {
        rule_id: 'rule-1',
        name: 'Suspicious MS Office Child Process',
        description: 'Detects suspicious child processes of MS Office',
        elser_embedding: 'name - description',
      },
    ]);

    const { searchPrebuiltRules } = getPrebuiltRulesSearchTool({ rulesClient });
    const result = await searchPrebuiltRules.invoke({
      query: 'office macro child process',
      technique_ids: 'T1204',
    });

    expect(rulesClient.prebuiltRules.search).toHaveBeenCalledWith(
      'office macro child process',
      'T1204'
    );
    expect(result).toEqual({
      source: 'prebuiltRulesSearch',
      query: 'office macro child process',
      count: 1,
      hasUsefulResults: true,
      results: [
        {
          rule_id: 'rule-1',
          name: 'Suspicious MS Office Child Process',
          description: 'Detects suspicious child processes of MS Office',
        },
      ],
    });
  });

  it('defaults technique_ids to an empty string', async () => {
    const rulesClient = createRuleMigrationsDataClientMock();
    (rulesClient.prebuiltRules.search as jest.Mock).mockResolvedValue([]);

    const { searchPrebuiltRules } = getPrebuiltRulesSearchTool({ rulesClient });
    const result = await searchPrebuiltRules.invoke({
      query: 'linux account creation',
    });

    expect(rulesClient.prebuiltRules.search).toHaveBeenCalledWith('linux account creation', '');
    expect(result.hasUsefulResults).toBe(false);
    expect(result.count).toBe(0);
    expect(result.results).toEqual([]);
  });
});
