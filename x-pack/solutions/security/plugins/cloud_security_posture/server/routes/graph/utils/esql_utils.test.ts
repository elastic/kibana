/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getFieldNamespace,
  generateFieldHintCases,
  concatJsonObjectPropertyEsqlExprSafe,
  buildLookupJoinEsql,
} from './esql_utils';

describe('ESQL utils', () => {
  describe('getFieldNamespace', () => {
    it('should extract namespace from user.entity.id', () => {
      expect(getFieldNamespace('user.entity.id')).toBe('user');
    });

    it('should extract namespace from service.entity.id', () => {
      expect(getFieldNamespace('service.entity.id')).toBe('service');
    });

    it('should extract namespace from host.entity.id', () => {
      expect(getFieldNamespace('host.entity.id')).toBe('host');
    });

    it('should extract namespace from user.target.entity.id', () => {
      expect(getFieldNamespace('user.target.entity.id')).toBe('user');
    });

    it('should extract namespace from service.target.entity.id', () => {
      expect(getFieldNamespace('service.target.entity.id')).toBe('service');
    });

    it('should return "entity" for entity.id', () => {
      expect(getFieldNamespace('entity.id')).toBe('entity');
    });

    it('should return "entity" for entity.target.id', () => {
      expect(getFieldNamespace('entity.target.id')).toBe('entity');
    });
  });

  describe('generateFieldHintCases', () => {
    it('should generate CASE statements for actor fields', () => {
      const result = generateFieldHintCases(
        ['user.entity.id', 'service.entity.id', 'entity.id'],
        'actorEntityId'
      );

      expect(result).toBe(
        `    MV_CONTAINS(user.entity.id, actorEntityId), "user",
    MV_CONTAINS(service.entity.id, actorEntityId), "service",
    MV_CONTAINS(entity.id, actorEntityId), "entity"`
      );
    });

    it('should generate CASE statements for target fields', () => {
      const result = generateFieldHintCases(
        ['user.target.entity.id', 'service.target.entity.id', 'entity.target.id'],
        'targetEntityId'
      );

      expect(result).toBe(
        `    MV_CONTAINS(user.target.entity.id, targetEntityId), "user",
    MV_CONTAINS(service.target.entity.id, targetEntityId), "service",
    MV_CONTAINS(entity.target.id, targetEntityId), "entity"`
      );
    });

    it('should handle single field', () => {
      const result = generateFieldHintCases(['user.entity.id'], 'actorEntityId');

      expect(result).toBe(`    MV_CONTAINS(user.entity.id, actorEntityId), "user"`);
    });

    it('should handle empty array', () => {
      const result = generateFieldHintCases([], 'actorEntityId');

      expect(result).toBe('');
    });
  });

  describe('formatJsonProperty', () => {
    it('should generate ESQL that outputs JSON property, or empty string if null', () => {
      const result = concatJsonObjectPropertyEsqlExprSafe('name', 'entityName');

      expect(result).toBe('COALESCE(CONCAT("\\"name\\":\\"", entityName, "\\""), "")');
    });

    it('should include the property name and variable in the output', () => {
      const result = concatJsonObjectPropertyEsqlExprSafe('customProp', 'customVar');

      expect(result).toContain('customProp');
      expect(result).toContain('customVar');
    });
  });

  describe('buildLookupJoinEsql', () => {
    it('should generate LOOKUP JOIN statements with provided index name', () => {
      const result = buildLookupJoinEsql('.entities.v2.latest.security_default-00001');

      expect(result).toContain('| DROP entity.id');
      expect(result).toContain('| DROP entity.target.id');
      expect(result).toContain(
        '| LOOKUP JOIN .entities.v2.latest.security_default-00001 ON entity.id'
      );
      expect(result).toContain('| RENAME actorEntityName    = entity.name');
      expect(result).toContain('| RENAME actorEntityType    = entity.type');
      expect(result).toContain('| RENAME actorEntitySubType = entity.sub_type');
      expect(result).toContain('| INLINE STATS actorHostIp = VALUES(TO_STRING(host.ip))');
      expect(result).toContain('| RENAME targetEntityName    = entity.name');
      expect(result).toContain('| RENAME targetEntityType    = entity.type');
      expect(result).toContain('| RENAME targetEntitySubType = entity.sub_type');
      expect(result).toContain('| INLINE STATS targetHostIp = VALUES(TO_STRING(host.ip))');
    });

    it('should include two LOOKUP JOIN statements for actor and target', () => {
      const result = buildLookupJoinEsql('.entities.v2.latest.security_test-00001');

      const lookupJoinMatches = result.match(/LOOKUP JOIN/g);
      expect(lookupJoinMatches).toHaveLength(2);
    });

    it('should use the provided index name in both LOOKUP JOIN statements', () => {
      const indexName = '.entities.v2.latest.security_custom-00001';
      const result = buildLookupJoinEsql(indexName);

      const indexMatches = result.match(new RegExp(indexName.replace(/\./g, '\\.'), 'g'));
      expect(indexMatches).toHaveLength(2);
    });
    it('should preserve the lookup entity id aliases for both joins', () => {
      const result = buildLookupJoinEsql('.entities.v2.latest.security_test-00001');

      expect(result).toContain('| RENAME actorLookupEntityId = entity.id');
      expect(result).toContain('| RENAME targetLookupEntityId = entity.id');
    });
  });
});
