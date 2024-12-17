/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import {
  RiskScoreEntityLevelField,
  RiskScoreEntityNameField,
  RiskScoreEntityScoreField,
  RiskScoreEntityType,
} from './types';
/*
 * This utility function can be used to turn a TypeScript enum into a io-ts codec.
 */
export function fromEnum<EnumType extends string>(
  enumName: string,
  theEnum: Record<string, EnumType>
): t.Type<EnumType, EnumType, unknown> {
  const isEnumValue = (input: unknown): input is EnumType =>
    Object.values<unknown>(theEnum).includes(input);

  return new t.Type<EnumType>(
    enumName,
    isEnumValue,
    (input, context) => (isEnumValue(input) ? t.success(input) : t.failure(input, context)),
    t.identity
  );
}

export const EntityTypeToNameField: Record<RiskScoreEntityType, RiskScoreEntityNameField> = {
  [RiskScoreEntityType.host]: RiskScoreEntityNameField.host,
  [RiskScoreEntityType.user]: RiskScoreEntityNameField.user,
  [RiskScoreEntityType.service]: RiskScoreEntityNameField.service,
};

export const EntityTypeToLevelField: Record<RiskScoreEntityType, RiskScoreEntityLevelField> = {
  [RiskScoreEntityType.host]: RiskScoreEntityLevelField.host,
  [RiskScoreEntityType.user]: RiskScoreEntityLevelField.user,
  [RiskScoreEntityType.service]: RiskScoreEntityLevelField.service,
};

export const EntityTypeToScoreField: Record<RiskScoreEntityType, RiskScoreEntityScoreField> = {
  [RiskScoreEntityType.host]: RiskScoreEntityScoreField.host,
  [RiskScoreEntityType.user]: RiskScoreEntityScoreField.user,
  [RiskScoreEntityType.service]: RiskScoreEntityScoreField.service,
};
