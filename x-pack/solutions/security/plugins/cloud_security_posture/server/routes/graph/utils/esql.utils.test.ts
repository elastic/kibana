/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFieldNamespace, generateFieldHintCases, formatJsonProperty } from './esql.utils';

describe('esql_utils', () => {
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
    it('should generate CONCAT statement with comma prefix by default', () => {
      const result = formatJsonProperty('type', 'actorEntityType');

      expect(result).toBe(
        'CONCAT(",\\"type\\":\\"", COALESCE(actorEntityType, "undefined"), "\\"")'
      );
    });

    it('should generate CONCAT statement without comma when includeComma is false', () => {
      const result = formatJsonProperty('name', 'actorEntityName', false);

      expect(result).toBe(
        'CONCAT("\\"name\\":\\"", COALESCE(actorEntityName, "undefined"), "\\"")'
      );
    });

    it('should handle sub_type property', () => {
      const result = formatJsonProperty('sub_type', 'actorEntitySubType');

      expect(result).toBe(
        'CONCAT(",\\"sub_type\\":\\"", COALESCE(actorEntitySubType, "undefined"), "\\"")'
      );
    });

    it('should handle target entity properties', () => {
      const result = formatJsonProperty('type', 'targetEntityType');

      expect(result).toBe(
        'CONCAT(",\\"type\\":\\"", COALESCE(targetEntityType, "undefined"), "\\"")'
      );
    });

    it('should handle target name property without comma', () => {
      const result = formatJsonProperty('name', 'targetEntityName', false);

      expect(result).toBe(
        'CONCAT("\\"name\\":\\"", COALESCE(targetEntityName, "undefined"), "\\"")'
      );
    });
  });
});
