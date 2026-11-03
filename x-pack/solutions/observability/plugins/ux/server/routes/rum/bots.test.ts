/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseBotUaTokens } from '../../../common/rum_app';
import { botExclusionFilters } from './bots';

describe('botExclusionFilters', () => {
  it('returns no filters when includeBots is true', () => {
    expect(botExclusionFilters('true')).toEqual([]);
  });

  it('excludes parsed tokens with case-insensitive wildcards', () => {
    const filters = botExclusionFilters(undefined, 'synthetics');
    expect(filters).toEqual([
      {
        bool: {
          must_not: [
            {
              bool: {
                should: [
                  {
                    bool: {
                      should: [
                        {
                          wildcard: {
                            'attributes.user_agent.original': {
                              value: '*synthetics*',
                              case_insensitive: true,
                            },
                          },
                        },
                        {
                          wildcard: {
                            'resource.attributes.user_agent.original': {
                              value: '*synthetics*',
                              case_insensitive: true,
                            },
                          },
                        },
                        {
                          wildcard: {
                            'user_agent.original': {
                              value: '*synthetics*',
                              case_insensitive: true,
                            },
                          },
                        },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
    ]);
  });

  it('uses the default token list when botUa is omitted', () => {
    const filters = botExclusionFilters(undefined);
    const encoded = JSON.stringify(filters);
    for (const token of parseBotUaTokens()) {
      expect(encoded).toContain(`*${token}*`);
    }
  });

  it('still excludes bots when includeBots is an unrelated value', () => {
    expect(botExclusionFilters('false')).toHaveLength(1);
    expect(botExclusionFilters('')).toHaveLength(1);
  });
});
