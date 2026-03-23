/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityType } from '../definitions/entity_schema';
import { USER_ENTITY_NAMESPACE } from '../definitions/user_entity_constants';
import {
  getEuidPainlessEvaluation,
  getEuidPainlessRuntimeMapping,
  streamlangConditionToPainlessDoc,
} from './painless';

describe('streamlangConditionToPainlessDoc', () => {
  const nonEmpty = (field: string) =>
    `doc.containsKey('${field}') && doc['${field}'].size() > 0 && doc['${field}'].value != null && doc['${field}'].value != ""`;

  it('returns "false" when condition is null or undefined', () => {
    expect(streamlangConditionToPainlessDoc(null)).toBe('false');
    expect(streamlangConditionToPainlessDoc(undefined)).toBe('false');
  });

  it('returns "false" when condition is not an object', () => {
    expect(streamlangConditionToPainlessDoc('string')).toBe('false');
    expect(streamlangConditionToPainlessDoc(42)).toBe('false');
  });

  it('returns "true" for always', () => {
    expect(streamlangConditionToPainlessDoc({ always: true })).toBe('true');
  });

  it('returns "false" for never', () => {
    expect(streamlangConditionToPainlessDoc({ never: true })).toBe('false');
  });

  it('translates field eq predicate', () => {
    const condition = { field: 'event.kind', eq: 'asset' };
    expect(streamlangConditionToPainlessDoc(condition)).toBe(
      `(${nonEmpty('event.kind')} && doc['event.kind'].value == "asset")`
    );
  });

  it('translates field neq predicate', () => {
    const condition = { field: 'event.outcome', neq: 'failure' };
    expect(streamlangConditionToPainlessDoc(condition)).toBe(
      `(!(${nonEmpty('event.outcome')}) || doc['event.outcome'].value != "failure")`
    );
  });

  it('translates field exists true', () => {
    const condition = { field: 'user.email', exists: true };
    expect(streamlangConditionToPainlessDoc(condition)).toBe(nonEmpty('user.email'));
  });

  it('translates field exists false', () => {
    const condition = { field: 'event.kind', exists: false };
    expect(streamlangConditionToPainlessDoc(condition)).toBe(`!(${nonEmpty('event.kind')})`);
  });

  it('translates field includes predicate', () => {
    const condition = { field: 'event.kind', includes: 'asset' };
    expect(streamlangConditionToPainlessDoc(condition)).toBe(
      `(${nonEmpty('event.kind')} && doc['event.kind'].value.contains("asset"))`
    );
  });

  it('translates and condition', () => {
    const condition = {
      and: [
        { field: 'user.name', exists: true },
        { field: 'host.id', exists: true },
      ],
    };
    expect(streamlangConditionToPainlessDoc(condition)).toBe(
      `(${nonEmpty('user.name')} && ${nonEmpty('host.id')})`
    );
  });

  it('translates or condition', () => {
    const condition = {
      or: [
        { field: 'event.kind', includes: 'asset' },
        { field: 'entity.id', exists: true },
      ],
    };
    expect(streamlangConditionToPainlessDoc(condition)).toBe(
      `((${nonEmpty('event.kind')} && doc['event.kind'].value.contains("asset")) || ${nonEmpty(
        'entity.id'
      )})`
    );
  });

  it('translates not condition', () => {
    const condition = { not: { field: 'event.outcome', eq: 'failure' } };
    const inner = `(${nonEmpty('event.outcome')} && doc['event.outcome'].value == "failure")`;
    expect(streamlangConditionToPainlessDoc(condition)).toBe(`!(${inner})`);
  });

  it('translates empty and as true', () => {
    expect(streamlangConditionToPainlessDoc({ and: [] })).toBe('true');
  });

  it('translates empty or as false', () => {
    expect(streamlangConditionToPainlessDoc({ or: [] })).toBe('false');
  });

  it('translates nested and/or/not', () => {
    const condition = {
      or: [
        { field: 'entity.id', exists: true },
        {
          and: [
            { field: 'event.category', includes: 'iam' },
            {
              or: [
                { field: 'event.type', includes: 'user' },
                { field: 'event.type', includes: 'creation' },
              ],
            },
          ],
        },
      ],
    };
    const result = streamlangConditionToPainlessDoc(condition);
    expect(result).toContain(nonEmpty('entity.id'));
    expect(result).toContain(nonEmpty('event.category'));
    expect(result).toContain('doc[\'event.category\'].value.contains("iam")');
    expect(result).toContain('doc[\'event.type\'].value.contains("user")');
    expect(result).toContain('doc[\'event.type\'].value.contains("creation")');
    expect(result).toContain(' && ');
    expect(result).toContain(' || ');
  });

  it('escapes special characters in field names', () => {
    const condition = { field: "user.name'", eq: 'x' };
    expect(streamlangConditionToPainlessDoc(condition)).toContain("\\'");
  });

  it('escapes special characters in string values', () => {
    const condition = { field: 'a', eq: 'value with "quotes"' };
    expect(streamlangConditionToPainlessDoc(condition)).toContain('\\"');
  });

  it('returns "false" for unknown condition shape', () => {
    expect(streamlangConditionToPainlessDoc({ field: 'a' })).toBe('false');
  });

  const userEvaluatedVars = new Map<string, string>([['entity.namespace', 'entity_namespace']]);

  it('should use evaluated var for eq when field is in evaluatedVars', () => {
    expect(
      streamlangConditionToPainlessDoc(
        { field: 'entity.namespace', eq: USER_ENTITY_NAMESPACE.Local },
        { evaluatedVars: userEvaluatedVars }
      )
    ).toBe(`entity_namespace != null && entity_namespace == "${USER_ENTITY_NAMESPACE.Local}"`);
  });

  it('should use doc access for eq when field is not in evaluatedVars', () => {
    expect(
      streamlangConditionToPainlessDoc(
        { field: 'user.name', eq: 'alice' },
        { evaluatedVars: userEvaluatedVars }
      )
    ).toBe(`(${nonEmpty('user.name')} && doc['user.name'].value == "alice")`);
  });

  it('should mix evaluated var and doc fields in and conditions', () => {
    const result = streamlangConditionToPainlessDoc(
      {
        and: [
          { field: 'entity.namespace', eq: USER_ENTITY_NAMESPACE.Local },
          { field: 'user.name', eq: 'x' },
        ],
      },
      { evaluatedVars: userEvaluatedVars }
    );
    expect(result).toBe(
      `(entity_namespace != null && entity_namespace == "${
        USER_ENTITY_NAMESPACE.Local
      }" && (${nonEmpty('user.name')} && doc['user.name'].value == "x"))`
    );
  });

  it('should use evaluated var for neq', () => {
    expect(
      streamlangConditionToPainlessDoc(
        { field: 'entity.namespace', neq: USER_ENTITY_NAMESPACE.Local },
        { evaluatedVars: userEvaluatedVars }
      )
    ).toBe(
      `(entity_namespace == null || entity_namespace == "" || entity_namespace != "${USER_ENTITY_NAMESPACE.Local}")`
    );
  });

  it('should use evaluated var for exists true and false', () => {
    expect(
      streamlangConditionToPainlessDoc(
        { field: 'entity.namespace', exists: true },
        { evaluatedVars: userEvaluatedVars }
      )
    ).toBe('entity_namespace != null && entity_namespace != ""');
    expect(
      streamlangConditionToPainlessDoc(
        { field: 'entity.namespace', exists: false },
        { evaluatedVars: userEvaluatedVars }
      )
    ).toBe('(entity_namespace == null || entity_namespace == "")');
  });

  it('should use evaluated var for includes', () => {
    expect(
      streamlangConditionToPainlessDoc(
        { field: 'entity.namespace', includes: 'okta' },
        { evaluatedVars: userEvaluatedVars }
      )
    ).toBe(
      'entity_namespace != null && entity_namespace != "" && entity_namespace.contains("okta")'
    );
  });
});

describe('getEuidPainlessEvaluation', () => {
  describe('snapshots per entity type', () => {
    Object.values(EntityType.enum).forEach((entityType) => {
      it(`generates the expected Painless script for ${entityType}`, () => {
        const script = getEuidPainlessEvaluation(entityType);
        expect(script).toMatchSnapshot();
      });
    });
  });
});

describe('getEuidPainlessRuntimeMapping', () => {
  Object.values(EntityType.enum).forEach((entityType) => {
    it(`returns a keyword runtime mapping that wraps getEuidPainlessEvaluation for ${entityType}`, () => {
      const returnScript = getEuidPainlessEvaluation(entityType);
      const mapping = getEuidPainlessRuntimeMapping(entityType);

      expect(mapping.type).toBe('keyword');
      expect(mapping.script).toBeDefined();
      expect(mapping.script.source).toContain('if (___euid != null) { emit(___euid); }');
      expect(mapping.script.source).toContain('String ___euid_rt_eval(def doc)');
      expect(mapping.script.source).toContain('___euid_rt_eval(doc)');
      const firstReturn = returnScript.indexOf('return');
      expect(firstReturn).toBeGreaterThan(-1);
      expect(mapping.script.source).toContain(returnScript.slice(0, firstReturn));
    });
  });
});
