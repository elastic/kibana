/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsFlatTyped } from '../../../../../../../../../constants';
import type {
  IncompatibleFieldMetadata,
  NonLegacyHistoricalResult,
  SameFamilyFieldMetadata,
} from '../../../../../../../../../types';

interface IncompatibleAndSameFamilyFields {
  incompatibleMappingsFields: IncompatibleFieldMetadata[];
  incompatibleValuesFields: IncompatibleFieldMetadata[];
  sameFamilyFields: SameFamilyFieldMetadata[];
}

export const getIncompatibleAndSameFamilyFieldsFromHistoricalResult = (
  historicalResult: NonLegacyHistoricalResult
): IncompatibleAndSameFamilyFields => {
  const incompatibleAndSameFamilyFields: IncompatibleAndSameFamilyFields = {
    incompatibleMappingsFields: [],
    incompatibleValuesFields: [],
    sameFamilyFields: [],
  };

  const { incompatibleFieldMappingItems, incompatibleFieldValueItems, sameFamilyFieldItems } =
    historicalResult;

  for (const incompatibleFieldMappingItem of incompatibleFieldMappingItems) {
    const { fieldName, actualValue } = incompatibleFieldMappingItem;
    const incompatibleMappingsField: IncompatibleFieldMetadata = {
      ...EcsFlatTyped[fieldName],
      indexFieldName: fieldName,
      indexFieldType: actualValue,
      indexInvalidValues: [],
      hasEcsMetadata: true,
      isEcsCompliant: false,
      isInSameFamily: false,
    };

    incompatibleAndSameFamilyFields.incompatibleMappingsFields.push(incompatibleMappingsField);
  }

  for (const incompatibleFieldValueItem of incompatibleFieldValueItems) {
    const { fieldName, actualValues } = incompatibleFieldValueItem;
    const incompatibleValuesField: IncompatibleFieldMetadata = {
      ...EcsFlatTyped[fieldName],
      indexFieldName: fieldName,
      indexFieldType: EcsFlatTyped[fieldName].type,
      indexInvalidValues: actualValues.map((actualValue) => ({
        fieldName: actualValue.name,
        count: actualValue.count,
      })),
      hasEcsMetadata: true,
      isEcsCompliant: false,
      isInSameFamily: false,
    };

    incompatibleAndSameFamilyFields.incompatibleValuesFields.push(incompatibleValuesField);
  }

  for (const sameFamilyFieldItem of sameFamilyFieldItems) {
    const { fieldName, expectedValue } = sameFamilyFieldItem;
    const sameFamilyField: SameFamilyFieldMetadata = {
      ...EcsFlatTyped[fieldName],
      indexFieldName: fieldName,
      indexFieldType: expectedValue,
      indexInvalidValues: [],
      hasEcsMetadata: true,
      isEcsCompliant: false,
      isInSameFamily: true,
    };

    incompatibleAndSameFamilyFields.sameFamilyFields.push(sameFamilyField);
  }

  return incompatibleAndSameFamilyFields;
};
