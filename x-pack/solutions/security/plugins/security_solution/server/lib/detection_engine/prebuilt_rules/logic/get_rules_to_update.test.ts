/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filterInstalledRules, getRulesToUpdate } from './get_rules_to_update';
import { getRuleMock } from '../../routes/__mocks__/request_responses';
import { getPrebuiltRuleMock, getPrebuiltRuleMockOfType } from '../mocks';
import { getQueryRuleParams } from '../../rule_schema/mocks';
import { rulesToMap } from './utils';
import { buildRestrictedMlAuthz, buildMlAuthz } from '../../../machine_learning/__mocks__/authz';

describe('get_rules_to_update', () => {
  const mockMlAuthz = buildMlAuthz();

  test('should return empty array if both rule sets are empty', async () => {
    const update = await getRulesToUpdate([], rulesToMap([]), mockMlAuthz);
    expect(update).toEqual([]);
  });

  test('should return empty array if the rule_id of the two rules do not match', async () => {
    const ruleAsset = getPrebuiltRuleMock();
    ruleAsset.rule_id = 'rule-1';
    ruleAsset.version = 2;

    const installedRule = getRuleMock(getQueryRuleParams());
    installedRule.params.ruleId = 'rule-2';
    installedRule.params.version = 1;
    const update = await getRulesToUpdate([ruleAsset], rulesToMap([installedRule]), mockMlAuthz);
    expect(update).toEqual([]);
  });

  test('should return empty array if the version of file system rule is less than the installed version', async () => {
    const ruleAsset = getPrebuiltRuleMock();
    ruleAsset.rule_id = 'rule-1';
    ruleAsset.version = 1;

    const installedRule = getRuleMock(getQueryRuleParams());
    installedRule.params.ruleId = 'rule-1';
    installedRule.params.version = 2;
    const update = await getRulesToUpdate([ruleAsset], rulesToMap([installedRule]), mockMlAuthz);
    expect(update).toEqual([]);
  });

  test('should return empty array if the version of file system rule is the same as the installed version', async () => {
    const ruleAsset = getPrebuiltRuleMock();
    ruleAsset.rule_id = 'rule-1';
    ruleAsset.version = 1;

    const installedRule = getRuleMock(getQueryRuleParams());
    installedRule.params.ruleId = 'rule-1';
    installedRule.params.version = 1;
    const update = await getRulesToUpdate([ruleAsset], rulesToMap([installedRule]), mockMlAuthz);
    expect(update).toEqual([]);
  });

  test('should return the rule to update if the version of file system rule is greater than the installed version', async () => {
    const ruleAsset = getPrebuiltRuleMock();
    ruleAsset.rule_id = 'rule-1';
    ruleAsset.version = 2;

    const installedRule = getRuleMock(getQueryRuleParams());
    installedRule.params.ruleId = 'rule-1';
    installedRule.params.version = 1;
    installedRule.params.exceptionsList = [];

    const update = await getRulesToUpdate([ruleAsset], rulesToMap([installedRule]), mockMlAuthz);
    expect(update).toEqual([ruleAsset]);
  });

  test('should return 1 rule out of 2 to update if the version of file system rule is greater than the installed version of just one', async () => {
    const ruleAsset = getPrebuiltRuleMock();
    ruleAsset.rule_id = 'rule-1';
    ruleAsset.version = 2;

    const installedRule1 = getRuleMock(getQueryRuleParams());
    installedRule1.params.ruleId = 'rule-1';
    installedRule1.params.version = 1;
    installedRule1.params.exceptionsList = [];

    const installedRule2 = getRuleMock(getQueryRuleParams());
    installedRule2.params.ruleId = 'rule-2';
    installedRule2.params.version = 1;
    installedRule2.params.exceptionsList = [];

    const update = await getRulesToUpdate(
      [ruleAsset],
      rulesToMap([installedRule1, installedRule2]),
      mockMlAuthz
    );
    expect(update).toEqual([ruleAsset]);
  });

  test('should return 2 rules out of 2 to update if the version of file system rule is greater than the installed version of both', async () => {
    const ruleAsset1 = getPrebuiltRuleMock();
    ruleAsset1.rule_id = 'rule-1';
    ruleAsset1.version = 2;

    const ruleAsset2 = getPrebuiltRuleMock();
    ruleAsset2.rule_id = 'rule-2';
    ruleAsset2.version = 2;

    const installedRule1 = getRuleMock(getQueryRuleParams());
    installedRule1.params.ruleId = 'rule-1';
    installedRule1.params.version = 1;
    installedRule1.params.exceptionsList = [];

    const installedRule2 = getRuleMock(getQueryRuleParams());
    installedRule2.params.ruleId = 'rule-2';
    installedRule2.params.version = 1;
    installedRule2.params.exceptionsList = [];

    const update = await getRulesToUpdate(
      [ruleAsset1, ruleAsset2],
      rulesToMap([installedRule1, installedRule2]),
      mockMlAuthz
    );
    expect(update).toEqual([ruleAsset1, ruleAsset2]);
  });

  test('should exclude license-restricted rules from rules to update', async () => {
    const queryRuleAsset = getPrebuiltRuleMock();
    queryRuleAsset.rule_id = 'rule-query';
    queryRuleAsset.version = 2;

    const mlRuleAsset = getPrebuiltRuleMockOfType('machine_learning');
    mlRuleAsset.version = 2;

    const installedQueryRule = getRuleMock(getQueryRuleParams());
    installedQueryRule.params.ruleId = 'rule-query';
    installedQueryRule.params.version = 1;
    installedQueryRule.params.exceptionsList = [];

    const installedMlRule = getRuleMock(getQueryRuleParams());
    installedMlRule.params.ruleId = mlRuleAsset.rule_id;
    installedMlRule.params.version = 1;
    installedMlRule.params.exceptionsList = [];

    const mlAuthzRestrictingMlRules = buildRestrictedMlAuthz();

    const update = await getRulesToUpdate(
      [queryRuleAsset, mlRuleAsset],
      rulesToMap([installedQueryRule, installedMlRule]),
      mlAuthzRestrictingMlRules
    );
    expect(update).toEqual([queryRuleAsset]);
  });
});

describe('filterInstalledRules', () => {
  test('should return "false" if the id of the two rules do not match', () => {
    const ruleAsset = getPrebuiltRuleMock();
    ruleAsset.rule_id = 'rule-1';
    ruleAsset.version = 2;

    const installedRule = getRuleMock(getQueryRuleParams());
    installedRule.params.ruleId = 'rule-2';
    installedRule.params.version = 1;
    const shouldUpdate = filterInstalledRules(ruleAsset, rulesToMap([installedRule]));
    expect(shouldUpdate).toEqual(false);
  });

  test('should return "false" if the version of file system rule is less than the installed version', () => {
    const ruleAsset = getPrebuiltRuleMock();
    ruleAsset.rule_id = 'rule-1';
    ruleAsset.version = 1;

    const installedRule = getRuleMock(getQueryRuleParams());
    installedRule.params.ruleId = 'rule-1';
    installedRule.params.version = 2;
    const shouldUpdate = filterInstalledRules(ruleAsset, rulesToMap([installedRule]));
    expect(shouldUpdate).toEqual(false);
  });

  test('should return "false" if the version of file system rule is the same as the installed version', () => {
    const ruleAsset = getPrebuiltRuleMock();
    ruleAsset.rule_id = 'rule-1';
    ruleAsset.version = 1;

    const installedRule = getRuleMock(getQueryRuleParams());
    installedRule.params.ruleId = 'rule-1';
    installedRule.params.version = 1;
    const shouldUpdate = filterInstalledRules(ruleAsset, rulesToMap([installedRule]));
    expect(shouldUpdate).toEqual(false);
  });

  test('should return "true" to update if the version of file system rule is greater than the installed version', () => {
    const ruleAsset = getPrebuiltRuleMock();
    ruleAsset.rule_id = 'rule-1';
    ruleAsset.version = 2;

    const installedRule = getRuleMock(getQueryRuleParams());
    installedRule.params.ruleId = 'rule-1';
    installedRule.params.version = 1;
    installedRule.params.exceptionsList = [];

    const shouldUpdate = filterInstalledRules(ruleAsset, rulesToMap([installedRule]));
    expect(shouldUpdate).toEqual(true);
  });
});
