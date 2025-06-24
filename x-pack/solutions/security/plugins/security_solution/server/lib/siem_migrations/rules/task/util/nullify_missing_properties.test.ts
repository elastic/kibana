/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { ElasticRule } from '../../../../../../common/siem_migrations/model/rule_migration.gen';
import { nullifyElasticRule, nullifyMissingPropertiesInObject } from './nullify_missing_properties';

describe('nullify missing values in object', () => {
  describe('nullifyMissingPropertiesInObject', () => {
    const someZodObject = z.object({
      foo: z.string(),
      bar: z.number().optional(),
      baz: z.object({
        qux: z.boolean().optional(),
      }),
    });

    const val: z.infer<typeof someZodObject> = {
      foo: 'test',
      baz: {
        qux: true,
      },
    };
    it('should correctly nullify missing values in zod object at first level', () => {
      const result = nullifyMissingPropertiesInObject(someZodObject, val);
      expect(result).toMatchObject({
        foo: 'test',
        bar: null,
        baz: {
          qux: true,
        },
      });
    });

    it('should throw if object does not conform to the schema', () => {
      const invalidVal = {
        foo: 'test',
        // Missing 'baz' property
      };

      expect(() =>
        nullifyMissingPropertiesInObject(someZodObject, invalidVal as z.infer<typeof someZodObject>)
      ).toThrow();
    });
  });

  describe('nullifyElasticRule', () => {
    it('should return an object with nullified empty values', () => {
      const elasticRule: ElasticRule = {
        title: 'Some Title',
      };

      const result = nullifyElasticRule(elasticRule);

      expect(result).toMatchObject({
        title: 'Some Title',
        description: null,
        severity: null,
        risk_score: null,
        query: null,
        query_language: null,
        prebuilt_rule_id: null,
        integration_ids: null,
        id: null,
      });
    });

    it('should return original object and call error callback in case of error', () => {
      const elasticRule = {
        hero: 'Some Title',
      } as unknown as ElasticRule;

      const errorMock = jest.fn();

      const result = nullifyElasticRule(elasticRule, errorMock);

      expect(result).toMatchObject(elasticRule);
      expect(errorMock).toHaveBeenCalled();
    });
  });
});
