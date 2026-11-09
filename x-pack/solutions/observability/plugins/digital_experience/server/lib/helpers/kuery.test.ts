/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kueryToQuery } from './kuery';

describe('kueryToQuery', () => {
  it('has no query for no expression or a blank one', () => {
    expect(kueryToQuery(undefined)).toBeUndefined();
    expect(kueryToQuery('')).toBeUndefined();
    expect(kueryToQuery('   ')).toBeUndefined();
  });

  it('translates an expression to the query it stands for', () => {
    const query = kueryToQuery('user_agent.name: Chrome and not http.response.status_code >= 500');

    expect(query).toHaveProperty('bool');
    const serialized = JSON.stringify(query);
    expect(serialized).toContain('{"match":{"user_agent.name":"Chrome"}}');
    expect(serialized).toContain('"must_not"');
    expect(serialized).toContain('{"range":{"http.response.status_code":{"gte":"500"}}}');
  });

  it('answers a field named by a pattern with a 400, as no field has that name', () => {
    expect(() => kueryToQuery('browser.*: "Chrome"')).toThrow(
      expect.objectContaining({
        isBoom: true,
        output: expect.objectContaining({ statusCode: 400 }),
        message: expect.stringContaining('browser.* has a wildcard'),
      })
    );
    expect(() => kueryToQuery('browser.name: Chrome and os.*: iOS')).toThrow(
      expect.objectContaining({ message: expect.stringContaining('os.* has a wildcard') })
    );
  });

  it('takes a wildcard in a value, and a field that exists or is looked for by pattern', () => {
    expect(JSON.stringify(kueryToQuery('browser.name: Chr*'))).toContain('browser.name');
    expect(kueryToQuery('browser.*: *')).toBeDefined();
    expect(kueryToQuery('not browser.name: Chrome')).toBeDefined();
  });

  it('answers an expression that does not parse with a 400 that says why', () => {
    expect(() => kueryToQuery('user_agent.name: (Chrome')).toThrow(
      expect.objectContaining({
        isBoom: true,
        output: expect.objectContaining({ statusCode: 400 }),
        message: expect.stringContaining('The KQL query is not valid'),
      })
    );
  });
});
