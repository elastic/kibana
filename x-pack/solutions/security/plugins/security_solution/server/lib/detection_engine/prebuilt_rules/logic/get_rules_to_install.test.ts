/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRulesToInstall } from './get_rules_to_install';
import { getRuleMock } from '../../routes/__mocks__/request_responses';
import { getPrebuiltRuleMock, getPrebuiltRuleMockOfType } from '../mocks';
import { getQueryRuleParams } from '../../rule_schema/mocks';
import { rulesToMap } from './utils';
import { buildMlAuthz, buildRestrictedMlAuthz } from '../../../machine_learning/__mocks__/authz';

describe('get_rules_to_install', () => {
  const mockMlAuthz = buildMlAuthz();

  test('should return empty array if both rule sets are empty', async () => {
    const update = await getRulesToInstall([], rulesToMap([]), mockMlAuthz);
    expect(update).toEqual([]);
  });

  test('should return empty array if the two rule ids match', async () => {
    const ruleAsset = getPrebuiltRuleMock();
    ruleAsset.rule_id = 'rule-1';

    const installedRule = getRuleMock(getQueryRuleParams());
    installedRule.params.ruleId = 'rule-1';
    const update = await getRulesToInstall([ruleAsset], rulesToMap([installedRule]), mockMlAuthz);
    expect(update).toEqual([]);
  });

  test('should return the rule to install if the id of the two rules do not match', async () => {
    const ruleAsset = getPrebuiltRuleMock();
    ruleAsset.rule_id = 'rule-1';

    const installedRule = getRuleMock(getQueryRuleParams());
    installedRule.params.ruleId = 'rule-2';
    const update = await getRulesToInstall([ruleAsset], rulesToMap([installedRule]), mockMlAuthz);
    expect(update).toEqual([ruleAsset]);
  });

  test('should return two rules to install if both the ids of the two rules do not match', async () => {
    const ruleAsset1 = getPrebuiltRuleMock();
    ruleAsset1.rule_id = 'rule-1';

    const ruleAsset2 = getPrebuiltRuleMock();
    ruleAsset2.rule_id = 'rule-2';

    const installedRule = getRuleMock(getQueryRuleParams());
    installedRule.params.ruleId = 'rule-3';
    const update = await getRulesToInstall(
      [ruleAsset1, ruleAsset2],
      rulesToMap([installedRule]),
      mockMlAuthz
    );
    expect(update).toEqual([ruleAsset1, ruleAsset2]);
  });

  test('should return two rules of three to install if both the ids of the two rules do not match but the third does', async () => {
    const ruleAsset1 = getPrebuiltRuleMock();
    ruleAsset1.rule_id = 'rule-1';

    const ruleAsset2 = getPrebuiltRuleMock();
    ruleAsset2.rule_id = 'rule-2';

    const ruleAsset3 = getPrebuiltRuleMock();
    ruleAsset3.rule_id = 'rule-3';

    const installedRule = getRuleMock(getQueryRuleParams());
    installedRule.params.ruleId = 'rule-3';
    const update = await getRulesToInstall(
      [ruleAsset1, ruleAsset2, ruleAsset3],
      rulesToMap([installedRule]),
      mockMlAuthz
    );
    expect(update).toEqual([ruleAsset1, ruleAsset2]);
  });

  test('should exclude license-restricted rules from rules to install', async () => {
    const queryRuleAsset = getPrebuiltRuleMock();
    queryRuleAsset.rule_id = 'rule-query';

    const mlRuleAsset = getPrebuiltRuleMockOfType('machine_learning');

    const mlAuthzRestrictingMlRules = buildRestrictedMlAuthz();

    const update = await getRulesToInstall(
      [queryRuleAsset, mlRuleAsset],
      rulesToMap([]),
      mlAuthzRestrictingMlRules
    );
    expect(update).toEqual([queryRuleAsset]);
  });
});
