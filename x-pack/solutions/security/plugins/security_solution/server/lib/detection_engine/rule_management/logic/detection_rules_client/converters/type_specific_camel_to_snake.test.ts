/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AlertSuppressionDuration,
  AlertSuppressionMissingFieldsStrategy,
} from '../../../../../../../common/api/detection_engine';
import { getEqlRuleParams } from '../../../../rule_schema/mocks';
import { typeSpecificCamelToSnake } from './type_specific_camel_to_snake';

describe('typeSpecificCamelToSnake', () => {
  describe('EQL', () => {
    test('should accept EQL params when existing rule type is EQL', () => {
      const params = {
        timestampField: 'event.created',
        eventCategoryOverride: 'event.not_category',
        tiebreakerField: 'event.created',
      };
      const eqlRule = { ...getEqlRuleParams(), ...params };
      const transformedParams = typeSpecificCamelToSnake(eqlRule);
      expect(transformedParams).toEqual(
        expect.objectContaining({
          timestamp_field: 'event.created',
          event_category_override: 'event.not_category',
          tiebreaker_field: 'event.created',
        })
      );
    });

    test('should accept EQL params with suppression in camel case and convert to snake case when rule type is EQL', () => {
      const params = {
        timestampField: 'event.created',
        eventCategoryOverride: 'event.not_category',
        tiebreakerField: 'event.created',
        alertSuppression: {
          groupBy: ['event.type'],
          duration: {
            value: 10,
            unit: 'm',
          } as AlertSuppressionDuration,
          missingFieldsStrategy: 'suppress' as AlertSuppressionMissingFieldsStrategy,
        },
      };
      const eqlRule = { ...getEqlRuleParams(), ...params };
      const transformedParams = typeSpecificCamelToSnake(eqlRule);
      expect(transformedParams).toEqual(
        expect.objectContaining({
          timestamp_field: 'event.created',
          event_category_override: 'event.not_category',
          tiebreaker_field: 'event.created',
          alert_suppression: {
            group_by: ['event.type'],
            duration: {
              value: 10,
              unit: 'm',
            } as AlertSuppressionDuration,
            missing_fields_strategy: 'suppress',
          },
        })
      );
    });
  });
});
