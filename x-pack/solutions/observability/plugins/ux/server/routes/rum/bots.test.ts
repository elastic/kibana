/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BOT_UA_TOKENS } from '../../../common/rum_app';
import { botExclusionFilters } from './bots';

describe('botExclusionFilters', () => {
  it('returns no filters when includeBots is true', () => {
    expect(botExclusionFilters('true')).toEqual([]);
  });

  it('excludes known bot user agents by default', () => {
    const filters = botExclusionFilters(undefined);
    expect(filters).toHaveLength(1);
    const clause = filters[0] as {
      bool: { must_not: Array<{ query_string: { query: string; fields: string[] } }> };
    };
    const queryString = clause.bool.must_not[0].query_string;
    for (const token of BOT_UA_TOKENS) {
      expect(queryString.query).toContain(`*${token}*`);
    }
    expect(queryString.fields).toEqual(
      expect.arrayContaining([
        'attributes.user_agent.original',
        'resource.attributes.user_agent.original',
        'user_agent.original',
      ])
    );
  });

  it('still excludes bots when includeBots is an unrelated value', () => {
    expect(botExclusionFilters('false')).toHaveLength(1);
    expect(botExclusionFilters('')).toHaveLength(1);
  });
});
