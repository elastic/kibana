/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Rule, RuleReference } from '../types';

export const rules: Rule[] = [
  {
    exceptions_list: [
      {
        id: '123',
        list_id: 'i_exist',
        namespace_type: 'single',
        type: 'detection',
      },
      {
        id: '456',
        list_id: 'i_exist_2',
        namespace_type: 'single',
        type: 'detection',
      },
    ],
    id: '1a2b3c',
    name: 'Simple Rule Query',
    rule_id: 'rule-2',
  },
];

export const ruleReference: RuleReference = {
  name: 'endpoint list',
  id: 'endpoint_list',
  referenced_rules: rules,
  listId: 'endpoint_list_id',
};

export const ruleReferences = {
  endpoint_list_id: ruleReference,
};
