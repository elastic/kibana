/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { find, isEmpty } from 'lodash/fp';
import { ALERT_RULE_TYPE } from '@kbn/rule-data-utils';
import { useAlertResponseActionsSupport } from '../../../../common/hooks/endpoint/use_alert_response_actions_support';
import { isResponseActionsAlertAgentIdField } from '../../../../common/lib/endpoint';
import {
  getEventCategoriesFromData,
  getEventFieldsToDisplay,
} from '../../../../common/components/event_details/get_alert_summary_rows';

export interface UseHighlightedFieldsParams {
  /**
   * An array of field objects with category and value
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[];
  /**
   * An array of fields user has selected to highlight, defined on rule
   */
  investigationFields?: string[];
}

export interface UseHighlightedFieldsResult {
  [fieldName: string]: {
    /**
     * If the field has a custom override
     */
    overrideField?: { field: string; values: string[] };
    /**
     * Values for the field
     */
    values: string[];
  };
}

/**
 * Returns the highlighted fields to display in the right panel under the Investigation section.
 */
export const useHighlightedFields = ({
  dataFormattedForFieldBrowser,
  investigationFields,
}: UseHighlightedFieldsParams): UseHighlightedFieldsResult => {
  const responseActionsSupport = useAlertResponseActionsSupport(dataFormattedForFieldBrowser);
  const eventCategories = getEventCategoriesFromData(dataFormattedForFieldBrowser);

  const eventCodeField = find(
    { category: 'event', field: 'event.code' },
    dataFormattedForFieldBrowser
  );

  const eventCode = Array.isArray(eventCodeField?.originalValue)
    ? eventCodeField?.originalValue?.[0]
    : eventCodeField?.originalValue;

  const eventRuleTypeField = find(
    { category: 'kibana', field: ALERT_RULE_TYPE },
    dataFormattedForFieldBrowser
  );

  const eventRuleType = Array.isArray(eventRuleTypeField?.originalValue)
    ? eventRuleTypeField?.originalValue?.[0]
    : eventRuleTypeField?.originalValue;

  const tableFields = getEventFieldsToDisplay({
    eventCategories,
    eventCode,
    eventRuleType,
    highlightedFieldsOverride: investigationFields ?? [],
  });

  return tableFields.reduce<UseHighlightedFieldsResult>((acc, field) => {
    const item = dataFormattedForFieldBrowser.find(
      (data) => data.field === field.id || (field.legacyId && data.field === field.legacyId)
    );
    if (!item) {
      return acc;
    }

    // if there aren't any values we can skip this highlighted field
    const fieldValues = item.values;
    if (!fieldValues || isEmpty(fieldValues)) {
      return acc;
    }

    // if we found the data by its legacy id we swap the ids to display the correct one
    if (item.field === field.legacyId) {
      field.id = field.legacyId;
    }

    // If the field is one used by a supported Response Actions agentType,
    // but the alert field is not the one that the agentType on the alert host uses,
    // then exit and return accumulator
    if (
      isResponseActionsAlertAgentIdField(field.id) &&
      responseActionsSupport.details.agentIdField !== field.id
    ) {
      return acc;
    }

    return {
      ...acc,
      [field.id]: {
        ...(field.overrideField && {
          overrideField: {
            field: field.overrideField,
            values:
              find({ field: field.overrideField }, dataFormattedForFieldBrowser)?.values ?? [],
          },
        }),
        values: fieldValues,
      },
    };
  }, {});
};
