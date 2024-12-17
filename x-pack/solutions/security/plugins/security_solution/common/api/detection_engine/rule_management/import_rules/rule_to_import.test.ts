/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess, stringifyZodError } from '@kbn/zod-helpers';
import { getListArrayMock } from '../../../../detection_engine/schemas/types/lists.mock';
import type { RuleToImportInput } from './rule_to_import';
import { RuleToImport } from './rule_to_import';
import {
  getImportRulesSchemaMock,
  getImportThreatMatchRulesSchemaMock,
} from './rule_to_import.mock';

describe('RuleToImport', () => {
  test('empty objects do not validate', () => {
    const payload: Partial<RuleToImportInput> = {};

    const result = RuleToImport.safeParse(payload);
    expectParseError(result);

    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"name: Required, description: Required, risk_score: Required, severity: Required, type: Invalid discriminator value. Expected 'eql' | 'query' | 'saved_query' | 'threshold' | 'threat_match' | 'machine_learning' | 'new_terms' | 'esql', and 1 more"`
    );
  });

  test('extra properties are removed', () => {
    const payload: RuleToImportInput = getImportRulesSchemaMock({
      // @ts-expect-error add an unknown field
      madeUp: 'hi',
    });

    const result = RuleToImport.safeParse(payload);
    expectParseSuccess(result);

    expect(result.data).toEqual(getImportRulesSchemaMock());
  });

  test('[rule_id] does not validate', () => {
    const payload: Partial<RuleToImportInput> = {
      rule_id: 'rule-1',
    };

    const result = RuleToImport.safeParse(payload);
    expectParseError(result);

    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"name: Required, description: Required, risk_score: Required, severity: Required, type: Invalid discriminator value. Expected 'eql' | 'query' | 'saved_query' | 'threshold' | 'threat_match' | 'machine_learning' | 'new_terms' | 'esql'"`
    );
  });

  test('[rule_id, description] does not validate', () => {
    const payload: Partial<RuleToImportInput> = {
      rule_id: 'rule-1',
      description: 'some description',
    };

    const result = RuleToImport.safeParse(payload);
    expectParseError(result);

    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"name: Required, risk_score: Required, severity: Required, type: Invalid discriminator value. Expected 'eql' | 'query' | 'saved_query' | 'threshold' | 'threat_match' | 'machine_learning' | 'new_terms' | 'esql'"`
    );
  });

  test('[rule_id, description, from] does not validate', () => {
    const payload: Partial<RuleToImportInput> = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
    };

    const result = RuleToImport.safeParse(payload);
    expectParseError(result);

    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"name: Required, risk_score: Required, severity: Required, type: Invalid discriminator value. Expected 'eql' | 'query' | 'saved_query' | 'threshold' | 'threat_match' | 'machine_learning' | 'new_terms' | 'esql'"`
    );
  });

  test('[rule_id, description, from, to, name, severity, type, interval] does not validate', () => {
    const payload: Partial<RuleToImportInput> = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
      severity: 'low',
      interval: '5m',
      type: 'query',
    };

    const result = RuleToImport.safeParse(payload);
    expectParseError(result);

    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(`"risk_score: Required"`);
  });

  test('[rule_id, description, from, to, name, severity, type, interval, index] does not validate', () => {
    const payload: Partial<RuleToImportInput> = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
      severity: 'low',
      type: 'query',
      interval: '5m',
      index: ['index-1'],
    };

    const result = RuleToImport.safeParse(payload);
    expectParseError(result);

    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(`"risk_score: Required"`);
  });

  test('[rule_id, description, from, to, name, severity, type, query, index, interval] does validate', () => {
    const payload: RuleToImportInput = {
      rule_id: 'rule-1',
      risk_score: 50,
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      name: 'some-name',
      severity: 'low',
      type: 'query',
      query: 'some query',
      index: ['index-1'],
      interval: '5m',
    };

    const result = RuleToImport.safeParse(payload);

    expectParseSuccess(result);
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, query, language] does not validate', () => {
    const payload: Partial<RuleToImportInput> = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      index: ['index-1'],
      name: 'some-name',
      severity: 'low',
      interval: '5m',
      type: 'query',
      query: 'some query',
      language: 'kuery',
    };

    const result = RuleToImport.safeParse(payload);
    expectParseError(result);

    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(`"risk_score: Required"`);
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, query, language, risk_score] does validate', () => {
    const payload: RuleToImportInput = {
      rule_id: 'rule-1',
      risk_score: 50,
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      index: ['index-1'],
      name: 'some-name',
      severity: 'low',
      interval: '5m',
      type: 'query',
      query: 'some query',
      language: 'kuery',
    };

    const result = RuleToImport.safeParse(payload);

    expectParseSuccess(result);
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, query, language, risk_score, output_index] does validate', () => {
    const payload: RuleToImportInput = {
      rule_id: 'rule-1',
      output_index: '.siem-signals',
      risk_score: 50,
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      index: ['index-1'],
      name: 'some-name',
      severity: 'low',
      interval: '5m',
      type: 'query',
      query: 'some query',
      language: 'kuery',
    };

    const result = RuleToImport.safeParse(payload);

    expectParseSuccess(result);
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score] does validate', () => {
    const payload: RuleToImportInput = {
      rule_id: 'rule-1',
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      index: ['index-1'],
      name: 'some-name',
      severity: 'low',
      interval: '5m',
      type: 'query',
      risk_score: 50,
    };

    const result = RuleToImport.safeParse(payload);

    expectParseSuccess(result);
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, output_index] does validate', () => {
    const payload: RuleToImportInput = {
      rule_id: 'rule-1',
      output_index: '.siem-signals',
      risk_score: 50,
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      index: ['index-1'],
      name: 'some-name',
      severity: 'low',
      interval: '5m',
      type: 'query',
    };

    const result = RuleToImport.safeParse(payload);

    expectParseSuccess(result);
  });

  test('You can send in an empty array to threat', () => {
    const payload: RuleToImportInput = getImportRulesSchemaMock({ threat: [] });

    const result = RuleToImport.safeParse(payload);

    expectParseSuccess(result);
  });

  test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, output_index, threat] does validate', () => {
    const payload: RuleToImportInput = {
      rule_id: 'rule-1',
      output_index: '.siem-signals',
      risk_score: 50,
      description: 'some description',
      from: 'now-5m',
      to: 'now',
      index: ['index-1'],
      name: 'some-name',
      severity: 'low',
      interval: '5m',
      type: 'query',
      threat: [
        {
          framework: 'someFramework',
          tactic: {
            id: 'fakeId',
            name: 'fakeName',
            reference: 'fakeRef',
          },
          technique: [
            {
              id: 'techniqueId',
              name: 'techniqueName',
              reference: 'techniqueRef',
            },
          ],
        },
      ],
    };

    const result = RuleToImport.safeParse(payload);

    expectParseSuccess(result);
  });

  test('allows references to be sent as valid', () => {
    const payload: RuleToImportInput = getImportRulesSchemaMock({ references: ['index-1'] });

    const result = RuleToImport.safeParse(payload);

    expectParseSuccess(result);
  });

  test('defaults references to an array if it is not sent in', () => {
    const { references, ...noReferences } = getImportRulesSchemaMock();
    const result = RuleToImport.safeParse(noReferences);

    expectParseSuccess(result);
  });

  test('references cannot be numbers', () => {
    const payload = getImportRulesSchemaMock({
      // @ts-expect-error assign wrong type value
      references: [5],
    });

    const result = RuleToImport.safeParse(payload);
    expectParseError(result);

    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"references.0: Expected string, received number"`
    );
  });

  test('indexes cannot be numbers', () => {
    const payload = getImportRulesSchemaMock({
      // @ts-expect-error assign wrong type value
      index: [5],
    });

    const result = RuleToImport.safeParse(payload);
    expectParseError(result);

    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"index.0: Expected string, received number"`
    );
  });

  test('defaults interval to 5 min', () => {
    const { interval, ...noInterval } = getImportRulesSchemaMock();
    const payload: RuleToImportInput = {
      ...noInterval,
    };

    const result = RuleToImport.safeParse(payload);

    expectParseSuccess(result);
  });

  test('defaults max signals to 100', () => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { max_signals, ...noMaxSignals } = getImportRulesSchemaMock();
    const payload: RuleToImportInput = {
      ...noMaxSignals,
    };

    const result = RuleToImport.safeParse(payload);

    expectParseSuccess(result);
  });

  test('saved_query type can have filters with it', () => {
    const payload = getImportRulesSchemaMock({
      filters: [],
    });

    const result = RuleToImport.safeParse(payload);

    expectParseSuccess(result);
  });

  test('filters cannot be a string', () => {
    const payload = getImportRulesSchemaMock({
      // @ts-expect-error assign wrong type value
      filters: 'some string',
    });

    const result = RuleToImport.safeParse(payload);
    expectParseError(result);

    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"filters: Expected array, received string"`
    );
  });

  test('language validates with kuery', () => {
    const payload = getImportRulesSchemaMock({ language: 'kuery' });

    const result = RuleToImport.safeParse(payload);

    expectParseSuccess(result);
  });

  test('language validates with lucene', () => {
    const payload = getImportRulesSchemaMock({ language: 'lucene' });

    const result = RuleToImport.safeParse(payload);

    expectParseSuccess(result);
  });

  test('language does not validate with something made up', () => {
    // @ts-expect-error assign unsupported value
    const payload = getImportRulesSchemaMock({
      language: 'something-made-up',
    });

    const result = RuleToImport.safeParse(payload);
    expectParseError(result);

    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"language: Invalid enum value. Expected 'kuery' | 'lucene', received 'something-made-up'"`
    );
  });

  test('max_signals cannot be negative', () => {
    const payload: RuleToImportInput = getImportRulesSchemaMock({ max_signals: -1 });

    const result = RuleToImport.safeParse(payload);
    expectParseError(result);

    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"max_signals: Number must be greater than or equal to 1"`
    );
  });

  test('max_signals cannot be zero', () => {
    const payload: RuleToImportInput = getImportRulesSchemaMock({ max_signals: 0 });

    const result = RuleToImport.safeParse(payload);
    expectParseError(result);

    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"max_signals: Number must be greater than or equal to 1"`
    );
  });

  test('max_signals can be 1', () => {
    const payload: RuleToImportInput = getImportRulesSchemaMock({ max_signals: 1 });

    const result = RuleToImport.safeParse(payload);

    expectParseSuccess(result);
  });

  test('You can optionally send in an array of tags', () => {
    const payload: RuleToImportInput = getImportRulesSchemaMock({ tags: ['tag_1', 'tag_2'] });

    const result = RuleToImport.safeParse(payload);

    expectParseSuccess(result);
  });

  test('You cannot send in an array of tags that are numbers', () => {
    const payload = getImportRulesSchemaMock({
      // @ts-expect-error assign unsupported value
      tags: [0, 1, 2],
    });

    const result = RuleToImport.safeParse(payload);
    expectParseError(result);

    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"tags.0: Expected string, received number, tags.1: Expected string, received number, tags.2: Expected string, received number"`
    );
  });

  test('You cannot send in an array of threat that are missing "framework"', () => {
    const payload = getImportRulesSchemaMock({
      threat: [
        // @ts-expect-error assign unsupported value
        {
          tactic: {
            id: 'fakeId',
            name: 'fakeName',
            reference: 'fakeRef',
          },
          technique: [
            {
              id: 'techniqueId',
              name: 'techniqueName',
              reference: 'techniqueRef',
            },
          ],
        },
      ],
    });

    const result = RuleToImport.safeParse(payload);
    expectParseError(result);

    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(`"threat.0.framework: Required"`);
  });

  test('You cannot send in an array of threat that are missing "tactic"', () => {
    const payload = getImportRulesSchemaMock({
      threat: [
        // @ts-expect-error assign unsupported value
        {
          framework: 'fake',
          technique: [
            {
              id: 'techniqueId',
              name: 'techniqueName',
              reference: 'techniqueRef',
            },
          ],
        },
      ],
    });

    const result = RuleToImport.safeParse(payload);
    expectParseError(result);

    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(`"threat.0.tactic: Required"`);
  });

  test('You can send in an array of threat that are missing "technique"', () => {
    const payload = getImportRulesSchemaMock({
      threat: [
        {
          framework: 'fake',
          tactic: {
            id: 'fakeId',
            name: 'fakeName',
            reference: 'fakeRef',
          },
        },
      ],
    });

    const result = RuleToImport.safeParse(payload);

    expectParseSuccess(result);
  });

  test('You can optionally send in an array of false positives', () => {
    const payload: RuleToImportInput = getImportRulesSchemaMock({
      false_positives: ['false_1', 'false_2'],
    });

    const result = RuleToImport.safeParse(payload);

    expectParseSuccess(result);
  });

  test('You cannot send in an array of false positives that are numbers', () => {
    const payload = getImportRulesSchemaMock({
      // @ts-expect-error assign unsupported value
      false_positives: [5, 4],
    });

    const result = RuleToImport.safeParse(payload);
    expectParseError(result);

    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"false_positives.0: Expected string, received number, false_positives.1: Expected string, received number"`
    );
  });

  test('You cannot set immutable to a number', () => {
    const payload = getImportRulesSchemaMock({
      // @ts-expect-error assign unsupported value
      immutable: 5,
    });

    const result = RuleToImport.safeParse(payload);
    expectParseError(result);

    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"immutable: Expected boolean, received number"`
    );
  });

  test('You can optionally set immutable to false', () => {
    const payload: RuleToImportInput = getImportRulesSchemaMock({
      immutable: false,
    });

    const result = RuleToImport.safeParse(payload);

    expectParseSuccess(result);
  });

  test('You can optionally set immutable to true', () => {
    const payload = getImportRulesSchemaMock({
      immutable: true,
    });

    const result = RuleToImport.safeParse(payload);

    expectParseSuccess(result);
  });

  test('You cannot set the risk_score to 101', () => {
    const payload: RuleToImportInput = getImportRulesSchemaMock({
      risk_score: 101,
    });

    const result = RuleToImport.safeParse(payload);
    expectParseError(result);

    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"risk_score: Number must be less than or equal to 100"`
    );
  });

  test('You cannot set the risk_score to -1', () => {
    const payload: RuleToImportInput = getImportRulesSchemaMock({
      risk_score: -1,
    });

    const result = RuleToImport.safeParse(payload);
    expectParseError(result);

    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"risk_score: Number must be greater than or equal to 0"`
    );
  });

  test('You can set the risk_score to 0', () => {
    const payload: RuleToImportInput = getImportRulesSchemaMock({
      risk_score: 0,
    });

    const result = RuleToImport.safeParse(payload);

    expectParseSuccess(result);
  });

  test('You can set the risk_score to 100', () => {
    const payload: RuleToImportInput = getImportRulesSchemaMock({
      risk_score: 100,
    });

    const result = RuleToImport.safeParse(payload);

    expectParseSuccess(result);
  });

  test('You can set meta to any object you want', () => {
    const payload: RuleToImportInput = getImportRulesSchemaMock({
      meta: {
        somethingMadeUp: { somethingElse: true },
      },
    });

    const result = RuleToImport.safeParse(payload);

    expectParseSuccess(result);
  });

  test('You cannot create meta as a string', () => {
    const payload = getImportRulesSchemaMock({
      // @ts-expect-error assign unsupported value
      meta: 'should not work',
    });

    const result = RuleToImport.safeParse(payload);
    expectParseError(result);

    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"meta: Expected object, received string"`
    );
  });

  test('validates with timeline_id and timeline_title', () => {
    const payload: RuleToImportInput = getImportRulesSchemaMock({
      timeline_id: 'timeline-id',
      timeline_title: 'timeline-title',
    });

    const result = RuleToImport.safeParse(payload);

    expectParseSuccess(result);
  });

  test('rule_id is required and you cannot get by with just id', () => {
    const payload: RuleToImportInput = getImportRulesSchemaMock({
      id: 'c4e80a0d-e20f-4efc-84c1-08112da5a612',
    });
    // @ts-expect-error
    delete payload.rule_id;

    const result = RuleToImport.safeParse(payload);
    expectParseError(result);

    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(`"rule_id: Required"`);
  });

  test('it validates with created_at, updated_at, created_by, updated_by values', () => {
    const payload: RuleToImportInput = getImportRulesSchemaMock({
      created_at: '2020-01-09T06:15:24.749Z',
      updated_at: '2020-01-09T06:15:24.749Z',
      created_by: 'Braden Hassanabad',
      updated_by: 'Evan Hassanabad',
    });

    const result = RuleToImport.safeParse(payload);

    expectParseSuccess(result);
  });

  test('it does not validate with epoch strings for created_at', () => {
    const payload: RuleToImportInput = getImportRulesSchemaMock({ created_at: '1578550728650' });

    const result = RuleToImport.safeParse(payload);
    expectParseError(result);

    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(`"created_at: Invalid datetime"`);
  });

  test('it does not validate with epoch strings for updated_at', () => {
    const payload: RuleToImportInput = getImportRulesSchemaMock({ updated_at: '1578550728650' });

    const result = RuleToImport.safeParse(payload);
    expectParseError(result);

    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(`"updated_at: Invalid datetime"`);
  });

  test('The default for "from" will be "now-6m"', () => {
    const { from, ...noFrom } = getImportRulesSchemaMock();
    const payload: RuleToImportInput = {
      ...noFrom,
    };

    const result = RuleToImport.safeParse(payload);

    expectParseSuccess(result);
  });

  test('The default for "to" will be "now"', () => {
    const { to, ...noTo } = getImportRulesSchemaMock();
    const payload: RuleToImportInput = {
      ...noTo,
    };

    const result = RuleToImport.safeParse(payload);

    expectParseSuccess(result);
  });

  test('You cannot set the severity to a value other than low, medium, high, or critical', () => {
    const payload = getImportRulesSchemaMock({
      // @ts-expect-error assign unsupported value
      severity: 'junk',
    });

    const result = RuleToImport.safeParse(payload);
    expectParseError(result);

    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"severity: Invalid enum value. Expected 'low' | 'medium' | 'high' | 'critical', received 'junk'"`
    );
  });

  test('The default for "actions" will be an empty array', () => {
    const { actions, ...noActions } = getImportRulesSchemaMock();
    const payload: RuleToImportInput = {
      ...noActions,
    };

    const result = RuleToImport.safeParse(payload);

    expectParseSuccess(result);
  });

  test('You cannot send in an array of actions that are missing "id"', () => {
    const payload = getImportRulesSchemaMock({
      actions: [
        // @ts-expect-error assign unsupported value
        { group: 'group', action_type_id: 'action_type_id', params: {} },
      ],
    });

    const result = RuleToImport.safeParse(payload);
    expectParseError(result);

    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(`"actions.0.id: Required"`);
  });

  test('You cannot send in an array of actions that are missing "action_type_id"', () => {
    const payload = getImportRulesSchemaMock({
      actions: [
        // @ts-expect-error assign unsupported value
        { group: 'group', id: 'id', params: {} },
      ],
    });

    const result = RuleToImport.safeParse(payload);
    expectParseError(result);

    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"actions.0.action_type_id: Required"`
    );
  });

  test('You cannot send in an array of actions that are missing "params"', () => {
    const payload = getImportRulesSchemaMock({
      actions: [
        // @ts-expect-error assign unsupported value
        { group: 'group', id: 'id', action_type_id: 'action_type_id' },
      ],
    });

    const result = RuleToImport.safeParse(payload);
    expectParseError(result);

    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(`"actions.0.params: Required"`);
  });

  test('You cannot send in an array of actions that are including "actionTypeId"', () => {
    const payload = getImportRulesSchemaMock({
      actions: [
        {
          group: 'group',
          id: 'id',
          // @ts-expect-error assign unsupported value
          actionTypeId: 'actionTypeId',
          params: {},
        },
      ],
    });

    const result = RuleToImport.safeParse(payload);
    expectParseError(result);

    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"actions.0.action_type_id: Required"`
    );
  });

  test('The default for "throttle" will be null', () => {
    const { throttle, ...noThrottle } = getImportRulesSchemaMock();
    const payload: RuleToImportInput = {
      ...noThrottle,
    };

    const result = RuleToImport.safeParse(payload);
    expectParseSuccess(result);
  });

  describe('note', () => {
    test('You can set note to a string', () => {
      const payload: RuleToImport = getImportRulesSchemaMock({
        note: '# documentation markdown here',
      });

      const result = RuleToImport.safeParse(payload);
      expectParseSuccess(result);
    });

    test('You can set note to an empty string', () => {
      const payload: RuleToImportInput = getImportRulesSchemaMock({ note: '' });

      const result = RuleToImport.safeParse(payload);
      expectParseSuccess(result);
    });

    test('You cannot create note as an object', () => {
      const payload = getImportRulesSchemaMock({
        // @ts-expect-error assign unsupported value
        note: {
          somethingHere: 'something else',
        },
      });

      const result = RuleToImport.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
        `"note: Expected string, received object"`
      );
    });

    test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, note] does validate', () => {
      const payload: RuleToImportInput = {
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        risk_score: 50,
        note: '# some markdown',
      };

      const result = RuleToImport.safeParse(payload);
      expectParseSuccess(result);
    });
  });

  describe('exception_list', () => {
    test('[rule_id, description, from, to, index, name, severity, interval, type, filters, risk_score, note, and exceptions_list] does validate', () => {
      const payload: RuleToImportInput = {
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        filters: [],
        risk_score: 50,
        note: '# some markdown',
        exceptions_list: getListArrayMock(),
      };

      const result = RuleToImport.safeParse(payload);
      expectParseSuccess(result);
    });

    test('[rule_id, description, from, to, index, name, severity, interval, type, filter, risk_score, note, and empty exceptions_list] does validate', () => {
      const payload: RuleToImportInput = {
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        filters: [],
        risk_score: 50,
        note: '# some markdown',
        exceptions_list: [],
      };

      const result = RuleToImport.safeParse(payload);
      expectParseSuccess(result);
    });

    test('rule_id, description, from, to, index, name, severity, interval, type, filters, risk_score, note, and invalid exceptions_list] does NOT validate', () => {
      const payload = {
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        filters: [],
        risk_score: 50,
        note: '# some markdown',
        exceptions_list: [{ id: 'uuid_here', namespace_type: 'not a namespace type' }],
      };

      const result = RuleToImport.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toEqual(
        "exceptions_list.0.list_id: Required, exceptions_list.0.type: Required, exceptions_list.0.namespace_type: Invalid enum value. Expected 'agnostic' | 'single', received 'not a namespace type'"
      );
    });

    test('[rule_id, description, from, to, index, name, severity, interval, type, filters, risk_score, note, and non-existent exceptions_list] does validate with empty exceptions_list', () => {
      const payload: RuleToImportInput = {
        rule_id: 'rule-1',
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        index: ['index-1'],
        name: 'some-name',
        severity: 'low',
        interval: '5m',
        type: 'query',
        filters: [],
        risk_score: 50,
        note: '# some markdown',
      };

      const result = RuleToImport.safeParse(payload);
      expectParseSuccess(result);
    });
  });

  describe('threat_mapping', () => {
    test('You can set a threat query, index, mapping, filters on an imported rule', () => {
      const payload = getImportThreatMatchRulesSchemaMock();
      const result = RuleToImport.safeParse(payload);
      expectParseSuccess(result);
    });
  });

  describe('data_view_id', () => {
    test('Defined data_view_id and empty index does validate', () => {
      const payload: RuleToImportInput = {
        rule_id: 'rule-1',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        name: 'some-name',
        severity: 'low',
        type: 'query',
        query: 'some query',
        data_view_id: 'logs-*',
        index: [],
        interval: '5m',
      };

      const result = RuleToImport.safeParse(payload);
      expectParseSuccess(result);
    });

    // Both can be defined, but if a data_view_id is defined, rule will use that one
    test('Defined data_view_id and index does validate', () => {
      const payload: RuleToImportInput = {
        rule_id: 'rule-1',
        risk_score: 50,
        description: 'some description',
        from: 'now-5m',
        to: 'now',
        name: 'some-name',
        severity: 'low',
        type: 'query',
        query: 'some query',
        data_view_id: 'logs-*',
        index: ['auditbeat-*'],
        interval: '5m',
      };

      const result = RuleToImport.safeParse(payload);
      expectParseSuccess(result);
    });

    test('data_view_id cannot be a number', () => {
      const payload = getImportRulesSchemaMock({
        // @ts-expect-error assign unsupported value
        data_view_id: 5,
      });

      const result = RuleToImport.safeParse(payload);
      expectParseError(result);

      expect(stringifyZodError(result.error)).toContain('data_view_id: Expected string');
    });
  });

  describe('rule_source', () => {
    test('it should validate a rule with "rule_source" set to internal', () => {
      const payload = getImportRulesSchemaMock({
        rule_source: {
          type: 'internal',
        },
      });

      const result = RuleToImport.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });

    test('it should validate a rule with "rule_source" set to external', () => {
      const payload = getImportRulesSchemaMock({
        rule_source: {
          type: 'external',
          is_customized: true,
        },
      });

      const result = RuleToImport.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });

    test('it should validate a rule with "rule_source" set to undefined', () => {
      const payload = getImportRulesSchemaMock({
        rule_source: undefined,
      });

      const result = RuleToImport.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });

    describe('backwards compatibility', () => {
      it('allows version to be absent', () => {
        const payload = getImportRulesSchemaMock();
        delete payload.version;

        const result = RuleToImport.safeParse(payload);
        expectParseSuccess(result);
        expect(result.data).toEqual(payload);
      });
    });
  });
});
