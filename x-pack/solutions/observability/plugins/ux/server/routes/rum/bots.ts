/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BOT_UA_TOKENS } from '../../../common/rum_app';

const BOT_UA_FIELDS = [
  'attributes.user_agent.original',
  'resource.attributes.user_agent.original',
  'user_agent.original',
];

/** must_not clause excluding known bot user agents unless includeBots === 'true'. */
export const botExclusionFilters = (includeBots?: string): object[] =>
  includeBots === 'true'
    ? []
    : [
        {
          bool: {
            must_not: [
              {
                query_string: {
                  query: BOT_UA_TOKENS.map((token) => `*${token}*`).join(' OR '),
                  fields: BOT_UA_FIELDS,
                  lenient: true,
                  analyze_wildcard: true,
                },
              },
            ],
          },
        },
      ];
