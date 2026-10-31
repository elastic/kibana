/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseBotUaTokens } from '../../../common/rum_app';

const BOT_UA_FIELDS = [
  'attributes.user_agent.original',
  'resource.attributes.user_agent.original',
  'user_agent.original',
] as const;

const escapeWildcard = (raw: string): string => raw.replace(/[\\*?]/g, '\\$&');

const tokenClause = (token: string) => ({
  bool: {
    should: BOT_UA_FIELDS.map((field) => ({
      wildcard: { [field]: { value: `*${escapeWildcard(token)}*`, case_insensitive: true } },
    })),
    minimum_should_match: 1,
  },
});

/** must_not clause excluding known bot user agents unless includeBots === 'true'. */
export const botExclusionFilters = (includeBots?: string, botUa?: string): object[] => {
  if (includeBots === 'true') {
    return [];
  }
  const tokens = parseBotUaTokens(botUa);
  return [
    {
      bool: {
        must_not: [
          {
            bool: {
              should: tokens.map(tokenClause),
              minimum_should_match: 1,
            },
          },
        ],
      },
    },
  ];
};
