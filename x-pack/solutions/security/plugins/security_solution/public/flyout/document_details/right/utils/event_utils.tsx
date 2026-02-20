/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * ## IMPORTANT TODO ##
 * This file imports @elastic/ecs directly, which imports all ECS fields into the bundle.
 * This should be migrated to using the unified fields metadata plugin instead.
 * See https://github.com/elastic/kibana/tree/main/x-pack/platform/plugins/shared/fields_metadata for more details.
 */
// eslint-disable-next-line no-restricted-imports
import { EcsFlat } from '@elastic/ecs';
import { i18n } from '@kbn/i18n';

export interface AllowedValue {
  description?: string;
  expected_event_types?: string[];
  name?: string;
}

type FieldName = 'event.kind' | 'event.category';

/**
 * Helper function to return if the value is in the allowed value list of an ecs field
 * @param fieldName
 * @param value
 * @returns boolean if value is an allowed value
 */
export const isEcsAllowedValue = (
  fieldName: FieldName,
  value: string | undefined | null
): boolean => {
  if (!value || value == null) {
    return false;
  }
  const allowedValues: AllowedValue[] = EcsFlat[fieldName]?.allowed_values ?? [];
  return Boolean(allowedValues?.find((item) => item.name === value));
};

/**
 * Helper function to return the description of an allowed value of the specified field
 * @param fieldName
 * @param value
 * @returns ecs description of the value
 */
export const getEcsAllowedValueDescription = (fieldName: FieldName, value: string): string => {
  const allowedValues: AllowedValue[] = EcsFlat[fieldName]?.allowed_values ?? [];
  return (
    allowedValues?.find((item) => item.name === value)?.description ??
    i18n.translate('xpack.securitySolution.flyout.right.about.noEventKindDescriptionMessage', {
      defaultMessage: "This field doesn't have a description because it's not part of ECS.",
    })
  );
};
