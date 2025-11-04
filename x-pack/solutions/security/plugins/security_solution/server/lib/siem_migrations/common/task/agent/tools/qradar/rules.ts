/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DynamicStructuredTool, tool } from '@langchain/core/tools';
import * as z from '@kbn/zod';
import type { RuleMigrationsDataClient } from '../../../../../rules/data/rule_migrations_data_client';

export const getRulesByNameGetter =
  (migrationId: string, rulesClient: RuleMigrationsDataClient) =>
  async ({ names }: { names: string[] }) => {
    const response = await rulesClient.items.getByQuery(migrationId, {
      queryDSL: {
        terms: {
          'original_rule.title.keyword': names,
        },
      },
    });
    return response.data.map((item) => item.original_rule.query);
  };

export function getRulesTools(migrationId: string, rulesClient: RuleMigrationsDataClient) {
  return {
    getRulesByName: new DynamicStructuredTool({
      name: 'getRulesByName',
      description:
        'Retrieve and return rules by their names. Input should be a list of rule names.',
      schema: z.array(z.string()).describe('A list of rule names to retrieve.'),
      func: getRulesByNameGetter(migrationId, rulesClient),
      tags: ['rule-migration', 'qradar'],
    }),
  } as const;
}

export function getRulesByNameTool(migrationId: string, rulesClient: RuleMigrationsDataClient) {
  return tool(getRulesByNameGetter(migrationId, rulesClient), {
    name: 'getRulesByName',
    description: 'Retrieve and return rules by their names. Input should be a list of rule names.',
    schema: z.object({
      names: z.array(z.string()).describe('A list of rule names to retrieve'),
    }),
  });
}
