/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { conditionToESQL } from '@kbn/streamlang';
import { fieldNotOneOfCondition, isNotEmptyCondition } from '../domain/definitions/common_fields';
import { LOCAL_NAMESPACE_EXCLUDED_USER_NAMES } from '../domain/definitions/user_entity_constants';
import { entityStoreConditionToESQL } from './condition_to_esql';

describe('entityStoreConditionToESQL', () => {
  describe('homogeneous OR-of-EQ optimization', () => {
    it('rewrites OR-of-EQ to COALESCE(IN) when all children are same-field eq', () => {
      const result = entityStoreConditionToESQL({
        or: [
          { field: 'user.name', eq: 'root' },
          { field: 'user.name', eq: 'bin' },
          { field: 'user.name', eq: 'daemon' },
        ],
      });
      expect(result).toBe('COALESCE(`user.name` IN ("root", "bin", "daemon"), FALSE)');
    });

    it('wraps not(or-of-EQ) as NOT (COALESCE(IN))', () => {
      const condition = fieldNotOneOfCondition('user.name', ['root', 'bin']);
      const result = entityStoreConditionToESQL(condition);
      expect(result).toBe('NOT (COALESCE(`user.name` IN ("root", "bin"), FALSE))');
    });

    it('optimizes the full LOCAL_NAMESPACE_EXCLUDED_USER_NAMES list', () => {
      const condition = fieldNotOneOfCondition('user.name', [
        ...LOCAL_NAMESPACE_EXCLUDED_USER_NAMES,
      ]);
      const result = entityStoreConditionToESQL(condition);
      const names = LOCAL_NAMESPACE_EXCLUDED_USER_NAMES.map((n) => `"${n}"`).join(', ');
      expect(result).toBe(`NOT (COALESCE(\`user.name\` IN (${names}), FALSE))`);
      expect(result).not.toContain(' OR ');
    });

    it('finds nested not(or-of-EQ) inside an AND', () => {
      const condition = {
        and: [
          { field: 'user.name', exists: true },
          fieldNotOneOfCondition('user.name', ['root', 'bin']),
        ],
      };
      const result = entityStoreConditionToESQL(condition);
      expect(result).toContain('`user.name` IN (');
      expect(result).toContain(' AND ');
      expect(result).not.toContain(' OR ');
    });
  });

  describe('isNotEmpty condition optimization', () => {
    it('rewrites AND(exists:true, neq:"") on same field to IS NOT NULL AND != ""', () => {
      const result = entityStoreConditionToESQL(isNotEmptyCondition('host.id'));
      expect(result).toBe('host.id IS NOT NULL AND host.id != ""');
    });

    it('does not optimize AND(exists:true, neq:"") with different fields', () => {
      const condition = {
        and: [
          { field: 'host.id', exists: true },
          { field: 'host.name', neq: '' },
        ],
      };
      // Falls through to general AND handling
      const result = entityStoreConditionToESQL(condition as any);
      expect(result).not.toBe('host.id IS NOT NULL AND host.id != ""');
    });

    it('optimizes isNotEmpty inside OR (documentsFilter pattern)', () => {
      const condition = {
        or: [
          isNotEmptyCondition('host.id'),
          isNotEmptyCondition('host.name'),
          isNotEmptyCondition('host.hostname'),
        ],
      };
      const result = entityStoreConditionToESQL(condition);
      expect(result).toBe(
        'host.id IS NOT NULL AND host.id != "" OR ' +
          'host.name IS NOT NULL AND host.name != "" OR ' +
          'host.hostname IS NOT NULL AND host.hostname != ""'
      );
    });

    it('optimizes isNotEmpty inside AND + OR (user documentsFilter pattern)', () => {
      const condition = {
        and: [
          {
            or: [
              { field: 'event.outcome', exists: false },
              { field: 'event.outcome', neq: 'failure' },
            ],
          },
          {
            or: [
              isNotEmptyCondition('user.email'),
              isNotEmptyCondition('user.id'),
              isNotEmptyCondition('user.name'),
            ],
          },
        ],
      };
      const result = entityStoreConditionToESQL(condition as any);
      expect(result).toContain('user.email IS NOT NULL AND user.email != ""');
      expect(result).toContain('user.id IS NOT NULL AND user.id != ""');
      expect(result).toContain('user.name IS NOT NULL AND user.name != ""');
      // event.outcome arms fall through to streamlang (not isNotEmpty pattern)
      expect(result).not.toContain('NOT(`event.outcome`');
    });
  });

  describe('non-optimized fallthrough', () => {
    it('delegates single-item OR to conditionToESQL', () => {
      const condition = { or: [{ field: 'user.name', eq: 'root' }] };
      expect(entityStoreConditionToESQL(condition)).toBe(conditionToESQL(condition));
    });

    it('delegates heterogeneous OR (non-eq child) to conditionToESQL path', () => {
      const condition = {
        or: [
          { field: 'user.name', eq: 'root' },
          { field: 'user.name', exists: false },
        ],
      };
      const result = entityStoreConditionToESQL(condition);
      expect(result).not.toContain(' IN ');
    });

    it('delegates OR-of-EQ on different fields to conditionToESQL path', () => {
      const condition = {
        or: [
          { field: 'user.name', eq: 'root' },
          { field: 'host.name', eq: 'server1' },
        ],
      };
      const result = entityStoreConditionToESQL(condition);
      expect(result).not.toContain(' IN ');
    });

    it('passes leaf filter conditions through unchanged', () => {
      const condition = { field: 'user.name', eq: 'alice' };
      expect(entityStoreConditionToESQL(condition)).toBe(conditionToESQL(condition));
    });

    it('passes always-condition through unchanged', () => {
      const condition = { always: {} };
      expect(entityStoreConditionToESQL(condition)).toBe(conditionToESQL(condition));
    });
  });

  describe('operator precedence', () => {
    it('wraps non-IN OR in parens when it appears inside AND', () => {
      const condition = {
        and: [
          { field: 'user.name', exists: true },
          {
            or: [
              { field: 'event.kind', eq: 'asset' },
              { field: 'event.kind', eq: 'alert' },
            ],
          },
        ],
      };
      const result = entityStoreConditionToESQL(condition);
      // The OR has two different values but same field → optimized to IN, no parens needed
      expect(result).toContain('`event.kind` IN (');
    });

    it('wraps genuinely non-homogeneous OR in parens inside AND', () => {
      const condition = {
        and: [
          { field: 'user.name', exists: true },
          {
            or: [
              { field: 'event.kind', eq: 'asset' },
              { field: 'event.type', eq: 'creation' }, // different field
            ],
          },
        ],
      };
      const result = entityStoreConditionToESQL(condition);
      // Non-homogeneous OR inside AND must be wrapped in parens
      expect(result).toMatch(/\(.*OR.*\)/);
    });
  });
});
