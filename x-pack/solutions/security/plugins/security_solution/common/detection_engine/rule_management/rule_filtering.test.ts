/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertRulesFilterToKQL } from './rule_filtering';

describe('convertRulesFilterToKQL', () => {
  const filterOptions = {
    filter: '',
    showCustomRules: false,
    showElasticRules: false,
    tags: [],
  };

  it('returns empty string if filter is an empty string', () => {
    const kql = convertRulesFilterToKQL(filterOptions);

    expect(kql).toBe('');
  });

  it('returns empty string if filter contains only whitespace', () => {
    const kql = convertRulesFilterToKQL({ ...filterOptions, filter: ' \n\t' });

    expect(kql).toBe('');
  });

  it('returns empty string if filter is undefined', () => {
    const kql = convertRulesFilterToKQL({ ...filterOptions, filter: undefined });

    expect(kql).toBe('');
  });

  it('handles presence of "filter" properly', () => {
    const kql = convertRulesFilterToKQL({ ...filterOptions, filter: 'foo' });

    expect(kql).toBe(
      '(' +
        'alert.attributes.name.keyword: *foo* ' +
        'OR alert.attributes.params.index: "foo" ' +
        'OR alert.attributes.params.threat.tactic.id: "foo" ' +
        'OR alert.attributes.params.threat.tactic.name: "foo" ' +
        'OR alert.attributes.params.threat.technique.id: "foo" ' +
        'OR alert.attributes.params.threat.technique.name: "foo" ' +
        'OR alert.attributes.params.threat.technique.subtechnique.id: "foo" ' +
        'OR alert.attributes.params.threat.technique.subtechnique.name: "foo"' +
        ')'
    );
  });

  it('escapes "filter" value for single term searches', () => {
    const kql = convertRulesFilterToKQL({
      ...filterOptions,
      filter: '"a<detection\\-rule*with)a<surprise:',
    });

    expect(kql).toBe(
      '(' +
        'alert.attributes.name.keyword: *\\"a\\<detection\\\\-rule\\*with\\)a\\<surprise\\:* ' +
        'OR alert.attributes.params.index: "\\"a<detection\\\\-rule*with)a<surprise:" ' +
        'OR alert.attributes.params.threat.tactic.id: "\\"a<detection\\\\-rule*with)a<surprise:" ' +
        'OR alert.attributes.params.threat.tactic.name: "\\"a<detection\\\\-rule*with)a<surprise:" ' +
        'OR alert.attributes.params.threat.technique.id: "\\"a<detection\\\\-rule*with)a<surprise:" ' +
        'OR alert.attributes.params.threat.technique.name: "\\"a<detection\\\\-rule*with)a<surprise:" ' +
        'OR alert.attributes.params.threat.technique.subtechnique.id: "\\"a<detection\\\\-rule*with)a<surprise:" ' +
        'OR alert.attributes.params.threat.technique.subtechnique.name: "\\"a<detection\\\\-rule*with)a<surprise:"' +
        ')'
    );
  });

  it('allows partial name matches for single term searches', () => {
    const kql = convertRulesFilterToKQL({
      ...filterOptions,
      filter: 'sql',
    });

    expect(kql.startsWith('(alert.attributes.name.keyword: *sql*')).toBe(true);
    expect(kql).not.toContain('alert.attributes.name: "sql"');
  });

  it('escapes "filter" value for multiple term searches', () => {
    const kql = convertRulesFilterToKQL({
      ...filterOptions,
      filter: '"a <detection rule with)\\a< surprise:',
    });

    expect(kql).toBe(
      '(' +
        'alert.attributes.name: "\\"a <detection rule with)\\\\a< surprise:" ' +
        'OR alert.attributes.params.index: "\\"a <detection rule with)\\\\a< surprise:" ' +
        'OR alert.attributes.params.threat.tactic.id: "\\"a <detection rule with)\\\\a< surprise:" ' +
        'OR alert.attributes.params.threat.tactic.name: "\\"a <detection rule with)\\\\a< surprise:" ' +
        'OR alert.attributes.params.threat.technique.id: "\\"a <detection rule with)\\\\a< surprise:" ' +
        'OR alert.attributes.params.threat.technique.name: "\\"a <detection rule with)\\\\a< surprise:" ' +
        'OR alert.attributes.params.threat.technique.subtechnique.id: "\\"a <detection rule with)\\\\a< surprise:" ' +
        'OR alert.attributes.params.threat.technique.subtechnique.name: "\\"a <detection rule with)\\\\a< surprise:"' +
        ')'
    );
  });

  it('allows only exact matching for multi-term searches', () => {
    const kql = convertRulesFilterToKQL({
      ...filterOptions,
      filter: 'sql server',
    });

    expect(kql.startsWith('(alert.attributes.name: "sql server"')).toBe(true);
    expect(kql).not.toContain('alert.attributes.name.keyword: *sql server*');
  });

  it('handles presence of "showCustomRules" properly', () => {
    const kql = convertRulesFilterToKQL({ ...filterOptions, showCustomRules: true });

    expect(kql).toBe(`alert.attributes.params.immutable: false`);
  });

  it('handles presence of "showElasticRules" properly', () => {
    const kql = convertRulesFilterToKQL({ ...filterOptions, showElasticRules: true });

    expect(kql).toBe(`alert.attributes.params.immutable: true`);
  });

  it('handles presence of "showElasticRules" and "showCustomRules" at the same time properly', () => {
    const kql = convertRulesFilterToKQL({
      ...filterOptions,
      showElasticRules: true,
      showCustomRules: true,
    });

    expect(kql).toBe('');
  });

  it('handles presence of "tags" properly', () => {
    const kql = convertRulesFilterToKQL({ ...filterOptions, tags: ['tag1', 'tag2'] });

    expect(kql).toBe('alert.attributes.tags:("tag1" AND "tag2")');
  });

  it('handles combination of different properties properly', () => {
    const kql = convertRulesFilterToKQL({
      ...filterOptions,
      filter: 'foo',
      showElasticRules: true,
      tags: ['tag1', 'tag2'],
    });

    expect(kql).toBe(
      `(` +
        `alert.attributes.name.keyword: *foo* OR ` +
        `alert.attributes.params.index: "foo" OR ` +
        `alert.attributes.params.threat.tactic.id: "foo" OR ` +
        `alert.attributes.params.threat.tactic.name: "foo" OR ` +
        `alert.attributes.params.threat.technique.id: "foo" OR ` +
        `alert.attributes.params.threat.technique.name: "foo" OR ` +
        `alert.attributes.params.threat.technique.subtechnique.id: "foo" OR ` +
        `alert.attributes.params.threat.technique.subtechnique.name: "foo")` +
        ` AND ` +
        `alert.attributes.params.immutable: true` +
        ` AND ` +
        `alert.attributes.tags:(\"tag1\" AND \"tag2\")`
    );
  });

  it('handles presence of "excludeRuleTypes" properly', () => {
    const kql = convertRulesFilterToKQL({
      ...filterOptions,
      excludeRuleTypes: ['machine_learning', 'saved_query'],
    });

    expect(kql).toBe('NOT alert.attributes.params.type: ("machine_learning" OR "saved_query")');
  });

  it('handles presence of "includeRuleTypes" properly', () => {
    const kql = convertRulesFilterToKQL({
      ...filterOptions,
      includeRuleTypes: ['query', 'eql'],
    });

    expect(kql).toBe('alert.attributes.params.type: ("query" OR "eql")');
  });
});
