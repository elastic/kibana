/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DiffableFieldsByTypeUnion, DiffableAllFields, DiffableRuleTypes } from './diffable_rule';

describe('Diffable rule schema', () => {
  describe('DiffableAllFields', () => {
    it('includes all possible rules types listed in the diffable rule schemas', () => {
      const diffableAllFieldsRuleTypes = DiffableAllFields.shape.type.options.map((x) => x.value);
      const diffableRuleTypes = DiffableRuleTypes.options.map((x) => x.value);
      expect(diffableAllFieldsRuleTypes).toStrictEqual(diffableRuleTypes);
    });
  });

  describe('DiffableRule', () => {
    it('includes all possible rules types listed in the diffable rule schemas', () => {
      const diffableRuleTypes = DiffableFieldsByTypeUnion.options.map((x) => x.shape.type.value);
      const ruleTypes = DiffableRuleTypes.options.map((x) => x.value);
      expect(diffableRuleTypes).toStrictEqual(ruleTypes);
    });
  });
});
