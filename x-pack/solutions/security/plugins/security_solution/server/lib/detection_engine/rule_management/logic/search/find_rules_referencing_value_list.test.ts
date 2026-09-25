/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';

import { findRules } from './find_rules';
import {
  findRulesReferencingValueList,
  threatIndexEntryMatches,
} from './find_rules_referencing_value_list';

jest.mock('./find_rules', () => ({ findRules: jest.fn() }));

const ITEMS = '.items-default';
const ALIAS = '.items-default-corporate-ips';
const LIST_ID = 'corporate-ips';

const indicatorRule = (id: string, threatIndex: string[], threatQuery: string) => ({
  id,
  name: id,
  params: { threatIndex, threatQuery },
});

describe('threatIndexEntryMatches', () => {
  it.each([
    [ITEMS, ITEMS, true],
    ['.items-*', ITEMS, true],
    ['.items-*', ALIAS, true],
    ['.items-default*', ITEMS, true],
    ['.items-default-*', ITEMS, false],
    ['.items-default-*', ALIAS, true],
    ['*', ITEMS, true],
    ['.items-other', ITEMS, false],
    ['-.items-*', ITEMS, false],
    ['.items-def.ult', ITEMS, false],
  ])('%s names %s: %s', (entry, index, expected) => {
    expect(threatIndexEntryMatches(entry, index)).toBe(expected);
  });
});

describe('findRulesReferencingValueList', () => {
  const rulesClient = {} as RulesClient;
  const mockedFindRules = findRules as jest.Mock;

  const scan = async (
    rules: Array<ReturnType<typeof indicatorRule>>,
    accessNames: string[] = []
  ) => {
    // the first search is for exception rules, the second for indicator match rules
    mockedFindRules.mockResolvedValueOnce({ data: [] }).mockResolvedValueOnce({ data: rules });
    return findRulesReferencingValueList({
      accessNames,
      exceptionListIds: ['exc-container'],
      itemsIndex: ITEMS,
      listId: LIST_ID,
      rulesClient,
    });
  };

  beforeEach(() => jest.clearAllMocks());

  it('reports a rule that reads the shared stream through a wildcard and names the list as referenced', async () => {
    const result = await scan([indicatorRule('r1', ['.items-*'], `list_id: "${LIST_ID}"`)]);
    expect(result.level).toBe('referenced');
    expect(result.rules).toEqual([expect.objectContaining({ id: 'r1', reason: 'threat_index' })]);
  });

  it('reports a rule that reads the shared stream through a wildcard without naming the list as maybe', async () => {
    const result = await scan([indicatorRule('r2', ['.items-*'], 'list_id: "another"')]);
    expect(result.level).toBe('maybe');
    expect(result.rules).toEqual([
      expect.objectContaining({ id: 'r2', reason: 'threat_index_maybe' }),
    ]);
  });

  it('reports a rule whose pattern matches the list alias as referenced', async () => {
    const result = await scan([indicatorRule('r3', ['.items-default-*'], '*:*')], [ALIAS]);
    expect(result.level).toBe('referenced');
  });

  it('ignores a rule whose threat index names something else', async () => {
    const result = await scan([indicatorRule('r4', ['threat-intel-*'], `list_id: "${LIST_ID}"`)]);
    expect(result.level).toBe('none');
    expect(result.rules).toBeUndefined();
  });

  it('keeps the exact name working as before', async () => {
    const result = await scan([indicatorRule('r5', [ITEMS], `list_id: "${LIST_ID}"`)]);
    expect(result.level).toBe('referenced');
  });
});
