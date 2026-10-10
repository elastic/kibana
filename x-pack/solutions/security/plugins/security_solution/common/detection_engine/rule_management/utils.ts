/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniqBy } from 'lodash';
import { ecsFieldMap } from '@kbn/alerts-as-data-utils';
import type { RequiredField, RequiredFieldInput, RuleResponse } from '../../api/detection_engine';

/*
  Computes the boolean "ecs" property value for each required field based on the ECS field map.
  "ecs" property indicates whether the required field is an ECS field or not.
*/
export function addEcsToRequiredFields(requiredFields?: RequiredFieldInput[]): RequiredField[] {
  return (requiredFields ?? []).map((requiredFieldWithoutEcs) => {
    const isEcsField = Boolean(
      ecsFieldMap[requiredFieldWithoutEcs.name]?.type === requiredFieldWithoutEcs.type
    );

    return {
      ...requiredFieldWithoutEcs,
      ecs: isEcsField,
    };
  });
}

/*
  Removes required fields sharing the same "name" and "type". "ecs" is derived from them and is ignored.
*/
export function dedupeRequiredFields<T extends RequiredFieldInput>(requiredFields: T[]): T[] {
  return uniqBy(requiredFields, ({ name, type }) => `${name}\u0000${type}`);
}

export function isRuleCustomized(rule: RuleResponse): boolean {
  return rule.rule_source.type === 'external' && rule.rule_source.is_customized === true;
}
