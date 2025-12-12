/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRulesSchemaMock } from '../../../../../../common/api/detection_engine/model/rule_schema/rule_response_schema.mock';
import { mergeExceptionLists } from './utils';

describe('mergeExceptionLists', () => {
  test('should add back an exception_list if it was removed by the end user on an immutable rule during an upgrade', () => {
    const ruleAsset1 = getRulesSchemaMock();
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

    const installedRule1 = getRulesSchemaMock();
    installedRule1.rule_id = 'rule-1';
    installedRule1.version = 1;
    installedRule1.exceptions_list = [];

    const update = mergeExceptionLists(ruleAsset1, installedRule1);
    expect(update.exceptions_list).toEqual(ruleAsset1.exceptions_list);
  });

  test('should not remove an additional exception_list if an additional one was added by the end user on an immutable rule during an upgrade', () => {
    const ruleAsset1 = getRulesSchemaMock();
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

    const installedRule1 = getRulesSchemaMock();
    installedRule1.rule_id = 'rule-1';
    installedRule1.version = 1;
    installedRule1.exceptions_list = [
      {
        id: 'second_exception_list',
        list_id: 'some-other-id',
        namespace_type: 'single',
        type: 'detection',
      },
    ];

    const update = mergeExceptionLists(ruleAsset1, installedRule1);
    expect(update.exceptions_list).toEqual([
      ...ruleAsset1.exceptions_list,
      ...installedRule1.exceptions_list,
    ]);
  });

  test('should not remove an existing exception_list if they are the same between the current installed one and the upgraded one', () => {
    const ruleAsset1 = getRulesSchemaMock();
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

    const installedRule1 = getRulesSchemaMock();
    installedRule1.rule_id = 'rule-1';
    installedRule1.version = 1;
    installedRule1.exceptions_list = [
      {
        id: 'endpoint_list',
        list_id: 'endpoint_list',
        namespace_type: 'agnostic',
        type: 'endpoint',
      },
    ];

    const update = mergeExceptionLists(ruleAsset1, installedRule1);
    expect(update.exceptions_list).toEqual(ruleAsset1.exceptions_list);
  });

  test('should not remove an existing exception_list if the rule has an empty exceptions list', () => {
    const ruleAsset1 = getRulesSchemaMock();
    ruleAsset1.exceptions_list = [];
    ruleAsset1.rule_id = 'rule-1';
    ruleAsset1.version = 2;

    const installedRule1 = getRulesSchemaMock();
    installedRule1.rule_id = 'rule-1';
    installedRule1.version = 1;
    installedRule1.exceptions_list = [
      {
        id: 'endpoint_list',
        list_id: 'endpoint_list',
        namespace_type: 'agnostic',
        type: 'endpoint',
      },
    ];

    const update = mergeExceptionLists(ruleAsset1, installedRule1);
    expect(update.exceptions_list).toEqual(installedRule1.exceptions_list);
  });
});
