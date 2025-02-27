/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filterInstalledRules, getRulesToUpdate, mergeExceptionLists } from './get_rules_to_update';
import { getRuleMock } from '../../routes/__mocks__/request_responses';
import { getPrebuiltRuleMock } from '../mocks';
import { getQueryRuleParams } from '../../rule_schema/mocks';
import { rulesToMap } from './utils';

describe('get_rules_to_update', () => {
  test('should return empty array if both rule sets are empty', () => {
    const update = getRulesToUpdate([], rulesToMap([]));
    expect(update).toEqual([]);
  });

  test('should return empty array if the rule_id of the two rules do not match', () => {
    const ruleAsset = getPrebuiltRuleMock();
    ruleAsset.rule_id = 'rule-1';
    ruleAsset.version = 2;

    const installedRule = getRuleMock(getQueryRuleParams());
    installedRule.params.ruleId = 'rule-2';
    installedRule.params.version = 1;
    const update = getRulesToUpdate([ruleAsset], rulesToMap([installedRule]));
    expect(update).toEqual([]);
  });

  test('should return empty array if the version of file system rule is less than the installed version', () => {
    const ruleAsset = getPrebuiltRuleMock();
    ruleAsset.rule_id = 'rule-1';
    ruleAsset.version = 1;

    const installedRule = getRuleMock(getQueryRuleParams());
    installedRule.params.ruleId = 'rule-1';
    installedRule.params.version = 2;
    const update = getRulesToUpdate([ruleAsset], rulesToMap([installedRule]));
    expect(update).toEqual([]);
  });

  test('should return empty array if the version of file system rule is the same as the installed version', () => {
    const ruleAsset = getPrebuiltRuleMock();
    ruleAsset.rule_id = 'rule-1';
    ruleAsset.version = 1;

    const installedRule = getRuleMock(getQueryRuleParams());
    installedRule.params.ruleId = 'rule-1';
    installedRule.params.version = 1;
    const update = getRulesToUpdate([ruleAsset], rulesToMap([installedRule]));
    expect(update).toEqual([]);
  });

  test('should return the rule to update if the version of file system rule is greater than the installed version', () => {
    const ruleAsset = getPrebuiltRuleMock();
    ruleAsset.rule_id = 'rule-1';
    ruleAsset.version = 2;

    const installedRule = getRuleMock(getQueryRuleParams());
    installedRule.params.ruleId = 'rule-1';
    installedRule.params.version = 1;
    installedRule.params.exceptionsList = [];

    const update = getRulesToUpdate([ruleAsset], rulesToMap([installedRule]));
    expect(update).toEqual([ruleAsset]);
  });

  test('should return 1 rule out of 2 to update if the version of file system rule is greater than the installed version of just one', () => {
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

    const update = getRulesToUpdate([ruleAsset], rulesToMap([installedRule1, installedRule2]));
    expect(update).toEqual([ruleAsset]);
  });

  test('should return 2 rules out of 2 to update if the version of file system rule is greater than the installed version of both', () => {
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

    const update = getRulesToUpdate(
      [ruleAsset1, ruleAsset2],
      rulesToMap([installedRule1, installedRule2])
    );
    expect(update).toEqual([ruleAsset1, ruleAsset2]);
  });

  test('should add back an exception_list if it was removed by the end user on an immutable rule during an upgrade', () => {
    const ruleAsset1 = getPrebuiltRuleMock();
    ruleAsset1.exceptions_list = [
      {
        id: 'endpoint_list',
        list_id: 'endpoint_list',
        namespace_type: 'agnostic',
        type: 'endpoint',
      },
    ];
    ruleAsset1.rule_id = 'rule-1';
    ruleAsset1.version = 2;

    const installedRule1 = getRuleMock(getQueryRuleParams());
    installedRule1.params.ruleId = 'rule-1';
    installedRule1.params.version = 1;
    installedRule1.params.exceptionsList = [];

    const [update] = getRulesToUpdate([ruleAsset1], rulesToMap([installedRule1]));
    expect(update.exceptions_list).toEqual(ruleAsset1.exceptions_list);
  });

  test('should not remove an additional exception_list if an additional one was added by the end user on an immutable rule during an upgrade', () => {
    const ruleAsset1 = getPrebuiltRuleMock();
    ruleAsset1.exceptions_list = [
      {
        id: 'endpoint_list',
        list_id: 'endpoint_list',
        namespace_type: 'agnostic',
        type: 'endpoint',
      },
    ];
    ruleAsset1.rule_id = 'rule-1';
    ruleAsset1.version = 2;

    const installedRule1 = getRuleMock(getQueryRuleParams());
    installedRule1.params.ruleId = 'rule-1';
    installedRule1.params.version = 1;
    installedRule1.params.exceptionsList = [
      {
        id: 'second_exception_list',
        list_id: 'some-other-id',
        namespace_type: 'single',
        type: 'detection',
      },
    ];

    const [update] = getRulesToUpdate([ruleAsset1], rulesToMap([installedRule1]));
    expect(update.exceptions_list).toEqual([
      ...ruleAsset1.exceptions_list,
      ...installedRule1.params.exceptionsList,
    ]);
  });

  test('should not remove an existing exception_list if they are the same between the current installed one and the upgraded one', () => {
    const ruleAsset1 = getPrebuiltRuleMock();
    ruleAsset1.exceptions_list = [
      {
        id: 'endpoint_list',
        list_id: 'endpoint_list',
        namespace_type: 'agnostic',
        type: 'endpoint',
      },
    ];
    ruleAsset1.rule_id = 'rule-1';
    ruleAsset1.version = 2;

    const installedRule1 = getRuleMock(getQueryRuleParams());
    installedRule1.params.ruleId = 'rule-1';
    installedRule1.params.version = 1;
    installedRule1.params.exceptionsList = [
      {
        id: 'endpoint_list',
        list_id: 'endpoint_list',
        namespace_type: 'agnostic',
        type: 'endpoint',
      },
    ];

    const [update] = getRulesToUpdate([ruleAsset1], rulesToMap([installedRule1]));
    expect(update.exceptions_list).toEqual(ruleAsset1.exceptions_list);
  });

  test('should not remove an existing exception_list if the rule has an empty exceptions list', () => {
    const ruleAsset1 = getPrebuiltRuleMock();
    ruleAsset1.exceptions_list = [];
    ruleAsset1.rule_id = 'rule-1';
    ruleAsset1.version = 2;

    const installedRule1 = getRuleMock(getQueryRuleParams());
    installedRule1.params.ruleId = 'rule-1';
    installedRule1.params.version = 1;
    installedRule1.params.exceptionsList = [
      {
        id: 'endpoint_list',
        list_id: 'endpoint_list',
        namespace_type: 'agnostic',
        type: 'endpoint',
      },
    ];

    const [update] = getRulesToUpdate([ruleAsset1], rulesToMap([installedRule1]));
    expect(update.exceptions_list).toEqual(installedRule1.params.exceptionsList);
  });

  test('should not remove an existing exception_list if the rule has an empty exceptions list for multiple rules', () => {
    const ruleAsset1 = getPrebuiltRuleMock();
    ruleAsset1.exceptions_list = [];
    ruleAsset1.rule_id = 'rule-1';
    ruleAsset1.version = 2;

    const ruleAsset2 = getPrebuiltRuleMock();
    ruleAsset2.exceptions_list = [];
    ruleAsset2.rule_id = 'rule-2';
    ruleAsset2.version = 2;

    const installedRule1 = getRuleMock(getQueryRuleParams());
    installedRule1.params.ruleId = 'rule-1';
    installedRule1.params.version = 1;
    installedRule1.params.exceptionsList = [
      {
        id: 'endpoint_list',
        list_id: 'endpoint_list',
        namespace_type: 'agnostic',
        type: 'endpoint',
      },
    ];
    const installedRule2 = getRuleMock(getQueryRuleParams());
    installedRule2.params.ruleId = 'rule-2';
    installedRule2.params.version = 1;
    installedRule2.params.exceptionsList = [
      {
        id: 'endpoint_list',
        list_id: 'endpoint_list',
        namespace_type: 'agnostic',
        type: 'endpoint',
      },
    ];

    const [update1, update2] = getRulesToUpdate(
      [ruleAsset1, ruleAsset2],
      rulesToMap([installedRule1, installedRule2])
    );
    expect(update1.exceptions_list).toEqual(installedRule1.params.exceptionsList);
    expect(update2.exceptions_list).toEqual(installedRule2.params.exceptionsList);
  });

  test('should not remove an existing exception_list if the rule has an empty exceptions list for mixed rules', () => {
    const ruleAsset1 = getPrebuiltRuleMock();
    ruleAsset1.exceptions_list = [];
    ruleAsset1.rule_id = 'rule-1';
    ruleAsset1.version = 2;

    const ruleAsset2 = getPrebuiltRuleMock();
    ruleAsset2.exceptions_list = [];
    ruleAsset2.rule_id = 'rule-2';
    ruleAsset2.version = 2;
    ruleAsset2.exceptions_list = [
      {
        id: 'second_list',
        list_id: 'second_list',
        namespace_type: 'single',
        type: 'detection',
      },
    ];

    const installedRule1 = getRuleMock(getQueryRuleParams());
    installedRule1.params.ruleId = 'rule-1';
    installedRule1.params.version = 1;
    installedRule1.params.exceptionsList = [
      {
        id: 'endpoint_list',
        list_id: 'endpoint_list',
        namespace_type: 'agnostic',
        type: 'endpoint',
      },
    ];

    const installedRule2 = getRuleMock(getQueryRuleParams());
    installedRule2.params.ruleId = 'rule-2';
    installedRule2.params.version = 1;
    installedRule2.params.exceptionsList = [
      {
        id: 'endpoint_list',
        list_id: 'endpoint_list',
        namespace_type: 'agnostic',
        type: 'endpoint',
      },
    ];

    const [update1, update2] = getRulesToUpdate(
      [ruleAsset1, ruleAsset2],
      rulesToMap([installedRule1, installedRule2])
    );
    expect(update1.exceptions_list).toEqual(installedRule1.params.exceptionsList);
    expect(update2.exceptions_list).toEqual([
      ...ruleAsset2.exceptions_list,
      ...installedRule2.params.exceptionsList,
    ]);
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

describe('mergeExceptionLists', () => {
  test('should add back an exception_list if it was removed by the end user on an immutable rule during an upgrade', () => {
    const ruleAsset1 = getPrebuiltRuleMock();
    ruleAsset1.exceptions_list = [
      {
        id: 'endpoint_list',
        list_id: 'endpoint_list',
        namespace_type: 'agnostic',
        type: 'endpoint',
      },
    ];
    ruleAsset1.rule_id = 'rule-1';
    ruleAsset1.version = 2;

    const installedRule1 = getRuleMock(getQueryRuleParams());
    installedRule1.params.ruleId = 'rule-1';
    installedRule1.params.version = 1;
    installedRule1.params.exceptionsList = [];

    const update = mergeExceptionLists(ruleAsset1, rulesToMap([installedRule1]));
    expect(update.exceptions_list).toEqual(ruleAsset1.exceptions_list);
  });

  test('should not remove an additional exception_list if an additional one was added by the end user on an immutable rule during an upgrade', () => {
    const ruleAsset1 = getPrebuiltRuleMock();
    ruleAsset1.exceptions_list = [
      {
        id: 'endpoint_list',
        list_id: 'endpoint_list',
        namespace_type: 'agnostic',
        type: 'endpoint',
      },
    ];
    ruleAsset1.rule_id = 'rule-1';
    ruleAsset1.version = 2;

    const installedRule1 = getRuleMock(getQueryRuleParams());
    installedRule1.params.ruleId = 'rule-1';
    installedRule1.params.version = 1;
    installedRule1.params.exceptionsList = [
      {
        id: 'second_exception_list',
        list_id: 'some-other-id',
        namespace_type: 'single',
        type: 'detection',
      },
    ];

    const update = mergeExceptionLists(ruleAsset1, rulesToMap([installedRule1]));
    expect(update.exceptions_list).toEqual([
      ...ruleAsset1.exceptions_list,
      ...installedRule1.params.exceptionsList,
    ]);
  });

  test('should not remove an existing exception_list if they are the same between the current installed one and the upgraded one', () => {
    const ruleAsset1 = getPrebuiltRuleMock();
    ruleAsset1.exceptions_list = [
      {
        id: 'endpoint_list',
        list_id: 'endpoint_list',
        namespace_type: 'agnostic',
        type: 'endpoint',
      },
    ];
    ruleAsset1.rule_id = 'rule-1';
    ruleAsset1.version = 2;

    const installedRule1 = getRuleMock(getQueryRuleParams());
    installedRule1.params.ruleId = 'rule-1';
    installedRule1.params.version = 1;
    installedRule1.params.exceptionsList = [
      {
        id: 'endpoint_list',
        list_id: 'endpoint_list',
        namespace_type: 'agnostic',
        type: 'endpoint',
      },
    ];

    const update = mergeExceptionLists(ruleAsset1, rulesToMap([installedRule1]));
    expect(update.exceptions_list).toEqual(ruleAsset1.exceptions_list);
  });

  test('should not remove an existing exception_list if the rule has an empty exceptions list', () => {
    const ruleAsset1 = getPrebuiltRuleMock();
    ruleAsset1.exceptions_list = [];
    ruleAsset1.rule_id = 'rule-1';
    ruleAsset1.version = 2;

    const installedRule1 = getRuleMock(getQueryRuleParams());
    installedRule1.params.ruleId = 'rule-1';
    installedRule1.params.version = 1;
    installedRule1.params.exceptionsList = [
      {
        id: 'endpoint_list',
        list_id: 'endpoint_list',
        namespace_type: 'agnostic',
        type: 'endpoint',
      },
    ];

    const update = mergeExceptionLists(ruleAsset1, rulesToMap([installedRule1]));
    expect(update.exceptions_list).toEqual(installedRule1.params.exceptionsList);
  });
});
