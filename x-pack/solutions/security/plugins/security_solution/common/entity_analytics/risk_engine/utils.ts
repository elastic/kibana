/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { EntityType } from '../types';
import { getAllEntityTypes, getDisabledEntityTypes } from '../utils';
import type { ExperimentalFeatures } from '../../experimental_features';

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

const RISK_ENGINE_UNAVAILABLE_TYPES = [EntityType.universal];

// TODO delete this function when the universal entity support is added
export const getRiskEngineEntityTypes = (experimentalFeatures: ExperimentalFeatures) => {
  const allEntityTypes = getAllEntityTypes();
  const disabledEntityTypes = getDisabledEntityTypes(experimentalFeatures);

  return allEntityTypes.filter(
    (value) =>
      !disabledEntityTypes.includes(value) && !RISK_ENGINE_UNAVAILABLE_TYPES.includes(value)
  );
};
