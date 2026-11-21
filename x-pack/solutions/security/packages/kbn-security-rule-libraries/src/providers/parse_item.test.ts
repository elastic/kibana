/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseItem } from './parse_item';

const attributes = {
  rule_id: 'abc',
  version: 1,
  name: 'Reverse shell',
  query: 'process where true\n',
};

describe('parseItem', () => {
  it('parses a json security-rule document', () => {
    const item = parseItem(
      'rules/linux/a.json',
      Buffer.from(JSON.stringify({ type: 'security-rule', attributes }))
    );
    expect(item).toEqual({ rule_id: 'abc', version: 1, path: 'rules/linux/a.json', attributes });
  });

  it('parses a yaml security-rule document', () => {
    const yaml = `type: security-rule
attributes:
  rule_id: abc
  version: 1
  name: Reverse shell
  query: |
    process where true
`;
    const item = parseItem('rules/linux/a.yml', Buffer.from(yaml));
    expect(item).toEqual({ rule_id: 'abc', version: 1, path: 'rules/linux/a.yml', attributes });
  });

  it('records the path inside the library when the source path has a prefix', () => {
    const item = parseItem(
      'main/v1.0.0/rules/linux/a.json',
      Buffer.from(JSON.stringify({ type: 'security-rule', attributes })),
      'rules/linux/a.json'
    );
    expect(item.path).toBe('rules/linux/a.json');
  });
});
