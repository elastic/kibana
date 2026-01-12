/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tool } from '@langchain/core/tools';
import * as z from '@kbn/zod';
import type { RuleMigrationsDataClient } from '../../../../data/rule_migrations_data_client';

const NAME = 'getRulesByName' as const;

const DESCRIPTION =
  'Retrieves and returns rules by their names. Input should be a list of rule names';

const SCHEMA = z.object({
  names: z.array(z.string()).describe('A list of rule names to retrieve'),
});

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
    return { result: response.data.map((item) => item.original_rule.query) };
  };

export function getRulesByNameTool(migrationId: string, rulesClient: RuleMigrationsDataClient) {
  return {
    [NAME]: tool(getRulesByNameGetter(migrationId, rulesClient), {
      name: NAME,
      description: DESCRIPTION,
      schema: SCHEMA,
    }),
  };
}
