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
  getHighlightedFieldsToDisplay,
} from '../../../../common/components/event_details/get_alert_summary_rows';
import { EVENT_SOURCE_FIELD_NAME } from '../../../../timelines/components/timeline/body/renderers/constants';

export interface UseHighlightedFieldsParams {
  /**
   * An array of field objects with category and value
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[];
  /**
   * An array of fields user has selected to highlight, defined on rule
   */
  investigationFields: string[];
  /**
   * Optional prop to specify the type of highlighted fields to display
   * Custom: fields defined on the rule
   * Default: fields defined by elastic
   * All: both custom and default fields
   */
  type?: 'default' | 'custom' | 'all';
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
  type,
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

  const tableFields = getHighlightedFieldsToDisplay({
    eventCategories,
    eventCode,
    eventRuleType,
    ruleCustomHighlightedFields: investigationFields,
    type,
  });

  return tableFields.reduce<UseHighlightedFieldsResult>((acc, field) => {
    const item = dataFormattedForFieldBrowser.find(
      (data) => data.field === field.id || (field.legacyId && data.field === field.legacyId)
    );
    if (!item) {
      return acc;
    }

    // if there aren't any values we can skip this highlighted field
    let fieldValues = item.values;
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

    /**
     * Source event use-case.
     * In this case we only want to show ancestors of level "0".
     * We can obtain those by using the `kibana.alert.ancestors.depth` field
     */
    if (item.field === EVENT_SOURCE_FIELD_NAME) {
      /**
       * Threshold rules create a fake document to represent the aggregation
       * bucket and use that ID as an ancestor. This leads to a bug when users
       * try to click on the ID from the highlighted fields and get back a 500
       * from the server, because that ID doesn't really exists in the database.
       *
       * For this reason, if the rule type is "threshold", we just don't show the
       * ancestor in the highlights table.
       *
       * @see https://github.com/elastic/kibana/issues/238019
       */
      const ruleType = dataFormattedForFieldBrowser.find(
        (_item) => _item.field === 'kibana.alert.rule.type'
      )?.values?.[0];

      if (ruleType === 'threshold') {
        return acc;
      }

      const depts = dataFormattedForFieldBrowser.find(
        (_item) => _item.field === `kibana.alert.ancestors.depth`
      );
      fieldValues = fieldValues.filter((_, idx) => (depts?.values?.[idx] ?? '0') === '0');
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
