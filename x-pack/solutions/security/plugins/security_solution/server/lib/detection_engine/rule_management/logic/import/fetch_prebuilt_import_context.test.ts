/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';
import { getImportRulesSchemaMock } from '../../../../../../common/api/detection_engine/rule_management/mocks';
import { getRuleMock } from '../../../routes/__mocks__/request_responses';
import { getQueryRuleParams } from '../../../rule_schema/mocks';
import { createPrebuiltRuleAssetsClient as createPrebuiltRuleAssetsClientMock } from '../../../prebuilt_rules/logic/rule_assets/__mocks__/prebuilt_rule_assets_client';
import { fetchPrebuiltImportContext } from './fetch_prebuilt_import_context';

describe('fetchPrebuiltImportContext', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;
  let ruleAssetsClient: ReturnType<typeof createPrebuiltRuleAssetsClientMock>;

  const noAssets = () => {
    ruleAssetsClient.fetchLatestVersions.mockResolvedValue([]);
    ruleAssetsClient.fetchDeprecatedRules.mockResolvedValue([]);
    ruleAssetsClient.fetchAssetsByVersion.mockResolvedValue({ assets: [], errors: [] });
  };

  const noInstalled = () => {
    rulesClient.find.mockResolvedValue({ data: [], page: 1, perPage: 100, total: 0 });
  };

  const withInstalled = (ruleId: string) => {
    rulesClient.find.mockResolvedValue({
      data: [getRuleMock({ ...getQueryRuleParams(), ruleId })],
      page: 1,
      perPage: 100,
      total: 1,
    });
  };

  const importRule = (ruleId: string) => ({ ...getImportRulesSchemaMock(), rule_id: ruleId });

  beforeEach(() => {
    rulesClient = rulesClientMock.create();
    ruleAssetsClient = createPrebuiltRuleAssetsClientMock();
    noAssets();
    noInstalled();
  });

  it('skips ES lookups entirely for an empty rules array', async () => {
    const ctx = await fetchPrebuiltImportContext({
      rules: [],
      rulesClient,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ruleAssetsClient: ruleAssetsClient as any,
    });

    expect(rulesClient.find).not.toHaveBeenCalled();
    expect(ctx).toEqual({
      matchingAssetsByRuleId: {},
      availableRuleAssetIds: new Set(),
      installedRulesById: {},
    });
  });

  it('KQL filter wraps and OR-joins rule_ids', async () => {
    await fetchPrebuiltImportContext({
      rules: [importRule('id-a'), importRule('id-b')],
      rulesClient,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ruleAssetsClient: ruleAssetsClient as any,
    });

    const opts = rulesClient.find.mock.calls[0][0]?.options ?? {};
    expect(opts.filter).toContain('alert.attributes.params.ruleId: ("id-a" OR "id-b")');
  });

  describe.each([
    ['embedded double-quote', 'foo"bar'],
    ['embedded backslash', 'foo\\bar'],
    ['parentheses', 'foo(bar)baz'],
    ['asterisk', 'foo*bar'],
    ['angle brackets', 'a<b>c'],
    ['and keyword', 'foo and bar'],
    ['or keyword', 'foo or bar'],
    ['not keyword', 'foo not bar'],
    ['a mix of everything', 'a"b\\c(d)*e<f>g and h'],
  ])('adversarial rule_id: %s (%p)', (_desc, ruleId) => {
    it('escapes `\\` and `"` in the KQL filter and returns a matching installed rule', async () => {
      withInstalled(ruleId);

      const ctx = await fetchPrebuiltImportContext({
        rules: [importRule(ruleId)],
        rulesClient,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ruleAssetsClient: ruleAssetsClient as any,
      });

      expect(rulesClient.find).toHaveBeenCalledTimes(1);
      const opts = rulesClient.find.mock.calls[0][0]?.options ?? {};
      const filter = opts.filter ?? '';

      const expectedLiteral = `"${ruleId.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
      expect(filter).toContain(`alert.attributes.params.ruleId: (${expectedLiteral})`);

      // The quoted literal starts at exactly one `"`, so the number of raw
      // unescaped quotes inside it must be 2 (open + close). More would mean
      // the value broke out of the literal.
      const unescapedQuotes = filter.match(/(^|[^\\])"/g) ?? [];
      expect(unescapedQuotes.length).toBeGreaterThanOrEqual(2);

      expect(ctx.installedRulesById[ruleId]?.rule_id).toBe(ruleId);
    });
  });
});
