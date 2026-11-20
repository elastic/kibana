/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetchInstalledRuleIds } from './fetch_installed_rule_ids';

describe('fetchInstalledRuleIds', () => {
  const fetchInstalledRuleVersionsByIds = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    fetchInstalledRuleVersionsByIds.mockResolvedValue([]);
  });

  it('returns the rules that are installed', async () => {
    fetchInstalledRuleVersionsByIds.mockResolvedValue([{ rule_id: 'b' }]);

    const result = await fetchInstalledRuleIds({ fetchInstalledRuleVersionsByIds }, ['a', 'b']);

    expect(result).toEqual(new Set(['b']));
  });

  it('looks the rules up a few hundred at a time and combines the answers', async () => {
    const ruleIds = Array.from({ length: 600 }, (_, i) => `rule-${i}`);
    fetchInstalledRuleVersionsByIds
      .mockResolvedValueOnce([{ rule_id: 'rule-1' }])
      .mockResolvedValueOnce([{ rule_id: 'rule-300' }])
      .mockResolvedValueOnce([{ rule_id: 'rule-599' }]);

    const result = await fetchInstalledRuleIds({ fetchInstalledRuleVersionsByIds }, ruleIds);

    expect(fetchInstalledRuleVersionsByIds).toHaveBeenCalledTimes(3);
    expect(fetchInstalledRuleVersionsByIds.mock.calls[0][0].ruleIds).toHaveLength(250);
    expect(fetchInstalledRuleVersionsByIds.mock.calls[2][0].ruleIds).toHaveLength(100);
    expect(result).toEqual(new Set(['rule-1', 'rule-300', 'rule-599']));
  });

  it('does not look anything up when there are no rules', async () => {
    await expect(fetchInstalledRuleIds({ fetchInstalledRuleVersionsByIds }, [])).resolves.toEqual(
      new Set()
    );
    expect(fetchInstalledRuleVersionsByIds).not.toHaveBeenCalled();
  });
});
