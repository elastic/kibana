/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  applyWhenConditionTrueSetFields,
  evaluateStreamlangCondition,
  getDocument,
  getFieldValue,
  resolveFieldValueSchema,
} from './commons';
import type { Condition } from '@kbn/streamlang';
import { isSingleFieldIdentity } from '../definitions/entity_schema';
import { getEntityDefinitionWithoutId } from '../definitions/registry';
import { isNotEmptyCondition } from '../definitions/common_fields';
import { USER_ENTITY_NAMESPACE } from '../definitions/user_entity_constants';

describe('getDocument', () => {
  it('returns _source when doc is an Elasticsearch hit', () => {
    const source = { entity: { id: 'e-1' } };
    expect(getDocument({ _source: source })).toBe(source);
  });

  it('returns doc as-is when _source is missing', () => {
    const doc = { user: { id: '123' } };
    expect(getDocument(doc)).toBe(doc);
  });

  it('returns doc as-is when _source is null', () => {
    const doc = { _source: null, user: { id: '123' } };
    expect(getDocument(doc)).toBe(doc);
  });
});

describe('getFieldValue', () => {
  describe('flattened documents', () => {
    it('returns value for flattened dot-notation key', () => {
      expect(getFieldValue({ 'user.id': '123' }, 'user.id')).toBe('123');
    });

    it('returns value for flattened entity.id', () => {
      expect(getFieldValue({ 'entity.id': 'e-1' }, 'entity.id')).toBe('e-1');
    });

    it('returns undefined when flattened key is missing', () => {
      expect(getFieldValue({ 'other.key': 'x' }, 'user.id')).toBeUndefined();
    });
  });

  describe('nested documents', () => {
    it('returns value for nested path', () => {
      expect(getFieldValue({ user: { id: '123' } }, 'user.id')).toBe('123');
    });

    it('returns undefined when path is missing', () => {
      expect(getFieldValue({ user: {} }, 'user.id')).toBeUndefined();
    });
  });
});

describe('evaluateStreamlangCondition', () => {
  it('returns false when condition is null or undefined', () => {
    expect(evaluateStreamlangCondition({ a: '1' }, null)).toBe(false);
    expect(evaluateStreamlangCondition({ a: '1' }, undefined)).toBe(false);
  });

  it('returns false when condition is not an object', () => {
    expect(evaluateStreamlangCondition({ a: '1' }, 'string')).toBe(false);
    expect(evaluateStreamlangCondition({ a: '1' }, 42)).toBe(false);
  });

  it('always returns true for { always: true }', () => {
    expect(evaluateStreamlangCondition({}, { always: true })).toBe(true);
    expect(evaluateStreamlangCondition({ foo: 'bar' }, { always: true })).toBe(true);
  });

  it('always returns false for { never: true }', () => {
    expect(evaluateStreamlangCondition({}, { never: true })).toBe(false);
    expect(evaluateStreamlangCondition({ foo: 'bar' }, { never: true })).toBe(false);
  });

  describe('field predicates', () => {
    it('eq: returns true when field value equals expected', () => {
      expect(evaluateStreamlangCondition({ a: 'x' }, { field: 'a', eq: 'x' })).toBe(true);
      expect(
        evaluateStreamlangCondition({ 'user.name': 'alice' }, { field: 'user.name', eq: 'alice' })
      ).toBe(true);
    });

    it('eq: returns false when field value does not equal expected', () => {
      expect(evaluateStreamlangCondition({ a: 'x' }, { field: 'a', eq: 'y' })).toBe(false);
      expect(evaluateStreamlangCondition({ a: '1' }, { field: 'a', eq: 1 })).toBe(true); // String(1) === '1'
    });

    it('eq: returns false when field is missing', () => {
      expect(evaluateStreamlangCondition({}, { field: 'a', eq: 'x' })).toBe(false);
      expect(evaluateStreamlangCondition({ b: 'y' }, { field: 'a', eq: 'x' })).toBe(false);
    });

    it('neq: returns true when field value does not equal expected', () => {
      expect(evaluateStreamlangCondition({ a: 'x' }, { field: 'a', neq: 'y' })).toBe(true);
      expect(evaluateStreamlangCondition({ a: 'x' }, { field: 'a', neq: 'x' })).toBe(false);
    });

    it('neq: returns true when field is missing (undefined !== expected)', () => {
      expect(evaluateStreamlangCondition({}, { field: 'a', neq: 'x' })).toBe(true);
    });

    it('exists: returns true when field has non-empty value', () => {
      expect(evaluateStreamlangCondition({ a: 'x' }, { field: 'a', exists: true })).toBe(true);
      expect(evaluateStreamlangCondition({ a: '' }, { field: 'a', exists: false })).toBe(true);
    });

    it('exists: returns false when field is missing or empty', () => {
      expect(evaluateStreamlangCondition({}, { field: 'a', exists: true })).toBe(false);
      expect(evaluateStreamlangCondition({ a: '' }, { field: 'a', exists: true })).toBe(false);
      expect(evaluateStreamlangCondition({ a: 'x' }, { field: 'a', exists: false })).toBe(false);
    });

    it('includes: returns true when field value includes substring', () => {
      expect(
        evaluateStreamlangCondition({ a: 'hello world' }, { field: 'a', includes: 'world' })
      ).toBe(true);
      expect(evaluateStreamlangCondition({ a: 'okta' }, { field: 'a', includes: 'okta' })).toBe(
        true
      );
    });

    it('includes: returns false when field does not include substring', () => {
      expect(evaluateStreamlangCondition({ a: 'hello' }, { field: 'a', includes: 'world' })).toBe(
        false
      );
    });

    it('includes: returns false when field is missing', () => {
      expect(evaluateStreamlangCondition({}, { field: 'a', includes: 'x' })).toBe(false);
    });
  });

  describe('and', () => {
    it('returns true when all sub-conditions are true', () => {
      const doc = { a: 'x', b: 'y' };
      const condition = {
        and: [
          { field: 'a', eq: 'x' },
          { field: 'b', eq: 'y' },
        ],
      };
      expect(evaluateStreamlangCondition(doc, condition)).toBe(true);
    });

    it('returns false when any sub-condition is false', () => {
      const doc = { a: 'x', b: 'y' };
      const condition = {
        and: [
          { field: 'a', eq: 'x' },
          { field: 'b', eq: 'wrong' },
        ],
      };
      expect(evaluateStreamlangCondition(doc, condition)).toBe(false);
    });

    it('returns true for empty and array', () => {
      expect(evaluateStreamlangCondition({}, { and: [] })).toBe(true);
    });
  });

  describe('or', () => {
    it('returns true when any sub-condition is true', () => {
      const doc = { a: 'x', b: 'y' };
      const condition = {
        or: [
          { field: 'a', eq: 'wrong' },
          { field: 'b', eq: 'y' },
        ],
      };
      expect(evaluateStreamlangCondition(doc, condition)).toBe(true);
    });

    it('returns false when all sub-conditions are false', () => {
      const doc = { a: 'x', b: 'y' };
      const condition = {
        or: [
          { field: 'a', eq: 'wrong' },
          { field: 'b', eq: 'wrong' },
        ],
      };
      expect(evaluateStreamlangCondition(doc, condition)).toBe(false);
    });

    it('returns false for empty or array', () => {
      expect(evaluateStreamlangCondition({}, { or: [] })).toBe(false);
    });
  });

  describe('not', () => {
    it('negates the inner condition', () => {
      expect(evaluateStreamlangCondition({ a: 'x' }, { not: { field: 'a', eq: 'y' } })).toBe(true);
      expect(evaluateStreamlangCondition({ a: 'x' }, { not: { field: 'a', eq: 'x' } })).toBe(false);
    });

    it('not always yields false', () => {
      expect(evaluateStreamlangCondition({}, { not: { always: true } })).toBe(false);
    });

    it('not never yields true', () => {
      expect(evaluateStreamlangCondition({}, { not: { never: true } })).toBe(true);
    });
  });

  describe('nested conditions', () => {
    it('evaluates and of or correctly', () => {
      const doc = { a: 'x', b: 'y' };
      const condition = {
        and: [
          {
            or: [
              { field: 'a', eq: 'x' },
              { field: 'a', eq: 'z' },
            ],
          },
          {
            or: [
              { field: 'b', eq: 'y' },
              { field: 'b', eq: 'w' },
            ],
          },
        ],
      };
      expect(evaluateStreamlangCondition(doc, condition)).toBe(true);
    });

    it('evaluates not of and correctly', () => {
      const doc = { a: 'x', b: 'wrong' };
      const condition = {
        not: {
          and: [
            { field: 'a', eq: 'x' },
            { field: 'b', eq: 'y' },
          ],
        },
      };
      expect(evaluateStreamlangCondition(doc, condition)).toBe(true);
    });
  });
});

describe('resolveFieldValueSchema', () => {
  it('returns literal string as-is', () => {
    expect(resolveFieldValueSchema({}, USER_ENTITY_NAMESPACE.Local)).toBe(
      USER_ENTITY_NAMESPACE.Local
    );
    expect(resolveFieldValueSchema({ a: 'x' }, 'literal')).toBe('literal');
  });

  it('returns field value for source reference', () => {
    expect(resolveFieldValueSchema({ 'user.name': 'alice' }, { source: 'user.name' })).toBe(
      'alice'
    );
    expect(resolveFieldValueSchema({ user: { name: 'bob' } }, { source: 'user.name' })).toBe('bob');
  });

  it('returns undefined for source when field is missing', () => {
    expect(resolveFieldValueSchema({}, { source: 'user.name' })).toBeUndefined();
  });

  it('returns concatenated values for composition', () => {
    const doc = { 'user.name': 'alice', 'host.name': 'server1' };
    expect(
      resolveFieldValueSchema(doc, {
        composition: { fields: ['user.name', 'host.name'], sep: '@' },
      })
    ).toBe('alice@server1');
  });

  it('returns undefined for composition when any field is missing', () => {
    expect(
      resolveFieldValueSchema(
        { 'user.name': 'alice' },
        {
          composition: { fields: ['user.name', 'host.name'], sep: '@' },
        }
      )
    ).toBeUndefined();
  });

  it('uses custom separator for composition', () => {
    const doc = { a: 'x', b: 'y', c: 'z' };
    expect(
      resolveFieldValueSchema(doc, { composition: { fields: ['a', 'b', 'c'], sep: '.' } })
    ).toBe('x.y.z');
  });
});

describe('applyWhenConditionTrueSetFields', () => {
  it('sets literal field when condition matches', () => {
    const doc: Record<string, unknown> = { a: 'x' };
    applyWhenConditionTrueSetFields(doc, [
      {
        condition: { field: 'a', eq: 'x' },
        fields: { 'entity.namespace': USER_ENTITY_NAMESPACE.Local },
      },
    ]);
    expect(doc['entity.namespace']).toBe(USER_ENTITY_NAMESPACE.Local);
  });

  it('does not set fields when condition does not match', () => {
    const doc: Record<string, unknown> = { a: 'x' };
    applyWhenConditionTrueSetFields(doc, [
      {
        condition: { field: 'a', eq: 'y' },
        fields: { 'entity.namespace': USER_ENTITY_NAMESPACE.Local },
      },
    ]);
    expect(doc['entity.namespace']).toBeUndefined();
  });

  it('applies entries in order; later entries can depend on earlier', () => {
    const doc: Record<string, unknown> = { 'user.name': 'alice', 'host.name': 'server1' };
    applyWhenConditionTrueSetFields(doc, [
      { condition: { always: true }, fields: { 'entity.namespace': USER_ENTITY_NAMESPACE.Local } },
      {
        condition: { field: 'entity.namespace', eq: USER_ENTITY_NAMESPACE.Local },
        fields: {
          'entity.name': { composition: { fields: ['user.name', 'host.name'], sep: '@' } },
        },
      },
    ]);
    expect(doc['entity.namespace']).toBe(USER_ENTITY_NAMESPACE.Local);
    expect(doc['entity.name']).toBe('alice@server1');
  });

  it('sets source-based field when condition matches', () => {
    const doc: Record<string, unknown> = { 'entity.namespace': 'okta', 'user.name': 'bob' };
    applyWhenConditionTrueSetFields(doc, [
      {
        condition: { field: 'entity.namespace', neq: USER_ENTITY_NAMESPACE.Local },
        fields: { 'entity.name': { source: 'user.name' } },
      },
    ]);
    expect(doc['entity.name']).toBe('bob');
  });

  it('skips entry when resolved value is undefined', () => {
    const doc: Record<string, unknown> = { 'entity.namespace': USER_ENTITY_NAMESPACE.Local };
    applyWhenConditionTrueSetFields(doc, [
      {
        condition: { field: 'entity.namespace', eq: USER_ENTITY_NAMESPACE.Local },
        fields: {
          'entity.name': { composition: { fields: ['user.name', 'host.name'], sep: '@' } },
        },
      },
    ]);
    expect(doc['entity.name']).toBeUndefined();
  });

  it('uses user.name for local entity.name when host.name is missing (user.ts post-STATS rules)', () => {
    const doc: Record<string, unknown> = {
      'entity.namespace': USER_ENTITY_NAMESPACE.Local,
      'user.name': 'alice.local',
      'host.id': 'host-1',
    };
    applyWhenConditionTrueSetFields(doc, [
      {
        condition: {
          and: [
            { field: 'entity.namespace', eq: USER_ENTITY_NAMESPACE.Local },
            isNotEmptyCondition('host.name'),
          ],
        },
        fields: {
          'entity.name': { composition: { fields: ['user.name', 'host.name'], sep: '@' } },
        },
      },
      {
        condition: {
          and: [
            { field: 'entity.namespace', eq: USER_ENTITY_NAMESPACE.Local },
            { not: isNotEmptyCondition('host.name') },
          ],
        },
        fields: {
          'entity.name': { source: 'user.name' },
        },
      },
    ]);
    expect(doc['entity.name']).toBe('alice.local');
  });
});

describe('user containsId filter condition (documentsFilter AND postAggFilter)', () => {
  function getUserContainsIdCondition() {
    const def = getEntityDefinitionWithoutId('user');
    const { identityField } = def;
    if (isSingleFieldIdentity(identityField)) {
      throw new Error('User has calculated identity');
    }
    let condition: Condition = identityField.documentsFilter;
    if (def.postAggFilter) {
      condition = { and: [condition, def.postAggFilter] };
    }
    return condition;
  }

  it('matches IDP doc: event.kind=asset, user.email present', () => {
    const doc = {
      'event.outcome': 'success',
      'event.kind': 'asset',
      'user.email': 'alice@example.com',
    };
    expect(evaluateStreamlangCondition(doc, getUserContainsIdCondition())).toBe(true);
  });

  it('matches IDP doc: event.category=iam, event.type=user, user.id present', () => {
    const doc = {
      'event.outcome': 'success',
      'event.category': 'iam',
      'event.type': 'user',
      'user.id': 'user-123',
    };
    expect(evaluateStreamlangCondition(doc, getUserContainsIdCondition())).toBe(true);
  });

  it('matches non-IDP doc: user.name + host.id, user.name not in excluded list', () => {
    const doc = {
      'event.outcome': 'success',
      'user.name': 'john.doe',
      'host.id': 'host-1',
    };
    expect(evaluateStreamlangCondition(doc, getUserContainsIdCondition())).toBe(true);
  });

  it('matches doc with entity.id (shared entity from store)', () => {
    const doc = {
      'event.outcome': 'success',
      'user.email': 'alice@example.com',
      'entity.id': 'user:alice@okta',
    };
    expect(evaluateStreamlangCondition(doc, getUserContainsIdCondition())).toBe(true);
  });

  it('excludes invalid doc: user.email + event.module only, no IDP or non-IDP postAggFilter', () => {
    const doc = {
      'event.outcome': 'success',
      'user.email': 'alice@example.com',
      'event.module': 'okta',
    };
    expect(evaluateStreamlangCondition(doc, getUserContainsIdCondition())).toBe(false);
  });

  it('excludes invalid doc: event.outcome=failure', () => {
    const doc = {
      'event.outcome': 'failure',
      'event.kind': 'asset',
      'user.email': 'alice@example.com',
    };
    expect(evaluateStreamlangCondition(doc, getUserContainsIdCondition())).toBe(false);
  });

  it('excludes non-IDP doc with excluded user.name (root)', () => {
    const doc = {
      'event.outcome': 'success',
      'user.name': 'root',
      'host.id': 'host-1',
    };
    expect(evaluateStreamlangCondition(doc, getUserContainsIdCondition())).toBe(false);
  });
});
