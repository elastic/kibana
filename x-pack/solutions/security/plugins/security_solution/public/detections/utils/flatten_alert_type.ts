/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RULE_PARAMETERS } from '@kbn/rule-data-utils';
import type { Alert } from '@kbn/alerting-types';
import type { JsonValue } from '@kbn/utility-types';
import { toObjectArrayOfStrings } from '@kbn/timelines-plugin/common';

const nonFlattenedFormatParamsFields = ['related_integrations', 'threat_mapping'];

/**
 * Returns true if the field is related to kibana.alert.rule.parameters.
 * This code is similar to x-pack/solutions/security/plugins/timelines/common/utils/field_formatters.ts and once
 * the Security Solution and Timelines plugins are merged we should probably share the code.
 */
const isRuleParametersFieldOrSubfield = (
  /**
   * Field to check against
   */
  field: string,
  /**
   * Optional value used if we're processing nested fields
   */
  prependField?: string
) =>
  (prependField?.includes(ALERT_RULE_PARAMETERS) || field === ALERT_RULE_PARAMETERS) &&
  !nonFlattenedFormatParamsFields.includes(field);

/**
 * Recursive function that processes all the fields from an Alert and returns a flattened object as a Record<string, string[]>.
 * This is used in EASE alert summary page, in the getPromptContext when passing data to the assistant.
 * The logic is similar to x-pack/solutions/security/plugins/timelines/common/utils/field_formatters.ts but for an Alert type.
 */
export const flattenAlertType = (
  /**
   * Object of type Alert that needs nested fields flattened
   */
  obj: Alert,
  /**
   * Parent field (populated when the function is called recursively on the nested fields)
   */
  prependField?: string
): Record<string, string[]> => {
  const resultMap: Record<string, string[]> = {};
  const allFields: string[] = Object.keys(obj);

  for (let i = 0; i < allFields.length; i++) {
    const field: string = allFields[i];
    const value: string | number | JsonValue[] = obj[field];

    const dotField: string = prependField ? `${prependField}.${field}` : field;

    const valueIntoObjectArrayOfStrings = toObjectArrayOfStrings(value);
    const valueAsStringArray = valueIntoObjectArrayOfStrings.map(({ str }) => str);
    const valueIsObjectArray = valueIntoObjectArrayOfStrings.some((o) => o.isObjectArray);

    if (!valueIsObjectArray) {
      // Handle simple fields
      resultMap[dotField] = valueAsStringArray;
    } else {
      // Process nested fields
      const isRuleParameters = isRuleParametersFieldOrSubfield(field, prependField);

      const subField: string | undefined = isRuleParameters ? dotField : undefined;
      const subValue: JsonValue = Array.isArray(value) ? value[0] : value;

      const subValueIntoObjectArrayOfStrings = toObjectArrayOfStrings(subValue);
      const subValueAsStringArray = subValueIntoObjectArrayOfStrings.map(({ str }) => str);
      const subValueIsObjectArray = subValueIntoObjectArrayOfStrings.some((o) => o.isObjectArray);

      if (!subValueIsObjectArray) {
        resultMap[dotField] = subValueAsStringArray;
      } else {
        const nestedFieldValuePairs = flattenAlertType(subValue as Alert, subField);
        const nestedFields = Object.keys(nestedFieldValuePairs);

        for (let j = 0; j < nestedFields.length; j++) {
          const nestedField = nestedFields[j];
          resultMap[nestedField] = nestedFieldValuePairs[nestedField];
        }
      }
    }
  }

  return resultMap;
};
