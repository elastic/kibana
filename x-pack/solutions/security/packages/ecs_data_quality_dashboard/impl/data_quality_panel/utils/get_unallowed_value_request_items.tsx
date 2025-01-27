/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsFlatTyped } from '../constants';
import type { EcsFieldMetadata, UnallowedValueRequestItem } from '../types';

export const hasAllowedValues = ({
  ecsMetadata,
  fieldName,
}: {
  ecsMetadata: EcsFlatTyped;
  fieldName: string;
}): boolean => (ecsMetadata[fieldName]?.allowed_values?.length ?? 0) > 0;

export const getValidValues = (field?: EcsFieldMetadata): string[] =>
  field?.allowed_values?.flatMap(({ name }) => name) ?? [];

export const getUnallowedValueRequestItems = ({
  ecsMetadata,
  indexName,
}: {
  ecsMetadata: EcsFlatTyped;
  indexName: string;
}): UnallowedValueRequestItem[] =>
  Object.keys(ecsMetadata).reduce<UnallowedValueRequestItem[]>(
    (acc, fieldName) =>
      hasAllowedValues({ ecsMetadata, fieldName })
        ? [
            ...acc,
            {
              indexName,
              indexFieldName: fieldName,
              allowedValues: getValidValues(ecsMetadata[fieldName]),
            },
          ]
        : acc,
    []
  );
