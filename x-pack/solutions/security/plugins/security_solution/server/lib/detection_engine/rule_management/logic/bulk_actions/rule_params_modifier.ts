/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleParamsModifierResult } from '@kbn/alerting-plugin/server/rules_client/methods/bulk_edit';
import type { InvestigationFieldsCombined, RuleAlertType } from '../../../rule_schema';
import type {
  BulkActionEditForRuleParams,
  BulkActionEditPayloadIndexPatterns,
  BulkActionEditPayloadInvestigationFields,
  BulkActionEditPayloadAlertSuppression,
} from '../../../../../../common/api/detection_engine/rule_management';
import { BulkActionEditTypeEnum } from '../../../../../../common/api/detection_engine/rule_management';
import { invariant } from '../../../../../../common/utils/invariant';
import { calculateFromValue } from '../../../rule_types/utils/utils';
import type {
  AlertSuppressionCamel,
  AlertSuppressionDuration,
} from '../../../../../../common/api/detection_engine/model/rule_schema/common_attributes.gen';
import { DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY } from '../../../../../../common/detection_engine/constants';
import type { ThresholdAlertSuppression } from '../../../../../../common/api/detection_engine/model/rule_schema/specific_attributes/threshold_attributes.gen';

export const addItemsToArray = <T>(arr: T[], items: T[]): T[] =>
  Array.from(new Set([...arr, ...items]));

export const deleteItemsFromArray = <T>(arr: T[], items: T[]): T[] => {
  const itemsSet = new Set(items);
  return arr.filter((item) => !itemsSet.has(item));
};

// Check if current params have a configured data view id
// and the action is not set to overwrite data views
const isDataViewExistsAndNotOverriden = (
  dataViewId: string | undefined,
  action: BulkActionEditPayloadIndexPatterns
) => dataViewId != null && !action.overwrite_data_views;

// Check if the index patterns added to the rule already exist in it
const hasIndexPatterns = (
  indexPatterns: string[] | undefined,
  action: BulkActionEditPayloadIndexPatterns
) => action.value.every((indexPattern) => indexPatterns?.includes(indexPattern));

// Check if the index patterns to be deleted don't exist in the rule
const hasNotIndexPattern = (
  indexPatterns: string[] | undefined,
  action: BulkActionEditPayloadIndexPatterns
) => action.value.every((indexPattern) => !indexPatterns?.includes(indexPattern));

const shouldSkipIndexPatternsBulkAction = (
  indexPatterns: string[] | undefined,
  dataViewId: string | undefined,
  action: BulkActionEditPayloadIndexPatterns
) => {
  if (isDataViewExistsAndNotOverriden(dataViewId, action)) {
    return true;
  }

  if (action.type === BulkActionEditTypeEnum.add_index_patterns) {
    return hasIndexPatterns(indexPatterns, action);
  }

  if (action.type === BulkActionEditTypeEnum.delete_index_patterns) {
    return hasNotIndexPattern(indexPatterns, action);
  }

  return false;
};

// Check if the investigation fields added to the rule already exist in it
const hasInvestigationFields = (
  investigationFields: InvestigationFieldsCombined | undefined,
  action: BulkActionEditPayloadInvestigationFields
) =>
  action.value.field_names.every((field) =>
    (Array.isArray(investigationFields)
      ? investigationFields
      : investigationFields?.field_names ?? []
    ).includes(field)
  );

// Check if the investigation fields to be deleted don't exist in the rule
const hasNoInvestigationFields = (
  investigationFields: InvestigationFieldsCombined | undefined,
  action: BulkActionEditPayloadInvestigationFields
) =>
  action.value.field_names.every(
    (field) =>
      !(
        Array.isArray(investigationFields)
          ? investigationFields
          : investigationFields?.field_names ?? []
      ).includes(field)
  );

const shouldSkipInvestigationFieldsBulkAction = (
  investigationFields: InvestigationFieldsCombined | undefined,
  action: BulkActionEditPayloadInvestigationFields
) => {
  if (action.type === BulkActionEditTypeEnum.add_investigation_fields) {
    return hasInvestigationFields(investigationFields, action);
  }

  if (action.type === BulkActionEditTypeEnum.delete_investigation_fields) {
    return hasNoInvestigationFields(investigationFields, action);
  }

  return false;
};

// Check if Group by fields already exist in rule
const hasAlertSuppressionGroupByFields = (
  groupByFields: string[] | undefined,
  action: BulkActionEditPayloadAlertSuppression
) => action.value.group_by.every((field) => groupByFields?.includes(field));

// Check if Group by fields do not exist in rule
const hasNoAlertSuppressionGroupByFields = (
  groupByFields: string[] | undefined,
  action: BulkActionEditPayloadAlertSuppression
) => action.value.group_by.every((field) => !groupByFields?.includes(field));

const hasMatchingDuration = (
  duration: AlertSuppressionDuration | undefined,
  action: BulkActionEditPayloadAlertSuppression
) =>
  (duration?.value === action.value.duration?.value &&
    duration?.unit === action.value.duration?.unit) ||
  (duration === undefined && action.value.duration === null);

const shouldSkipAlertSuppressionFieldsBulkAction = (
  alertSuppression: AlertSuppressionCamel | undefined,
  action: BulkActionEditPayloadAlertSuppression
) => {
  // if alert suppression is not configured and group by fields are empty we skip update
  if (alertSuppression === undefined && action.value.group_by.length === 0) {
    return true;
  }

  if (!hasMatchingDuration(alertSuppression?.duration, action)) {
    return false;
  }

  if (
    action.value.missing_fields_strategy &&
    alertSuppression?.missingFieldsStrategy !== action.value.missing_fields_strategy
  ) {
    return false;
  }

  if (action.type === BulkActionEditTypeEnum.add_alert_suppression) {
    return (
      alertSuppression?.groupBy?.length === 3 ||
      hasAlertSuppressionGroupByFields(alertSuppression?.groupBy, action)
    );
  }

  if (action.type === BulkActionEditTypeEnum.set_alert_suppression) {
    return (
      alertSuppression?.groupBy?.length === action.value.group_by.length &&
      hasAlertSuppressionGroupByFields(alertSuppression?.groupBy, action)
    );
  }

  if (action.type === BulkActionEditTypeEnum.delete_alert_suppression) {
    return hasNoAlertSuppressionGroupByFields(alertSuppression?.groupBy, action);
  }

  return false;
};

const updateAlertSuppression = ({
  alertSuppression,
  action,
  resultingGroupBy,
}: {
  alertSuppression: AlertSuppressionCamel | undefined;
  action: BulkActionEditPayloadAlertSuppression;
  resultingGroupBy: string[];
}): AlertSuppressionCamel => ({
  ...alertSuppression,
  groupBy: resultingGroupBy,
  ...(action.value.missing_fields_strategy
    ? {
        missingFieldsStrategy: action.value.missing_fields_strategy,
      }
    : {
        missingFieldsStrategy:
          alertSuppression?.missingFieldsStrategy ?? DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY,
      }),
  ...(action.value.duration !== undefined
    ? {
        duration: action.value.duration ?? undefined,
      }
    : {}),
});

const updateAlertSuppressionForThresholdRule = ({
  alertSuppression,
  action,
}: {
  alertSuppression: ThresholdAlertSuppression | undefined;
  action: BulkActionEditPayloadAlertSuppression;
}) => {
  const duration = action.value?.duration;
  if (duration === null) {
    return { alertSuppression: undefined, isActionSkipped: !alertSuppression?.duration };
  }

  if (duration && !hasMatchingDuration(alertSuppression?.duration, action)) {
    return { alertSuppression: { duration }, isActionSkipped: false };
  }

  return { alertSuppression, isActionSkipped: true };
};

// eslint-disable-next-line complexity
const applyBulkActionEditToRuleParams = (
  existingRuleParams: RuleAlertType['params'],
  action: BulkActionEditForRuleParams
): {
  ruleParams: RuleAlertType['params'];
  isActionSkipped: boolean;
} => {
  let ruleParams = { ...existingRuleParams };
  // If the action is successfully applied and the rule params are modified,
  // we update the following flag to false. As soon as the current function
  // returns this flag as false, at least once, for any action, we know that
  // the rule needs to be marked as having its params updated.
  let isActionSkipped = false;

  switch (action.type) {
    // index_patterns actions
    // index pattern is not present in machine learning rule type, so we throw error on it
    case BulkActionEditTypeEnum.add_index_patterns: {
      invariant(
        ruleParams.type !== 'machine_learning',
        "Index patterns can't be added. Machine learning rule doesn't have index patterns property"
      );
      invariant(
        ruleParams.type !== 'esql',
        "Index patterns can't be added. ES|QL rule doesn't have index patterns property"
      );

      if (shouldSkipIndexPatternsBulkAction(ruleParams.index, ruleParams.dataViewId, action)) {
        isActionSkipped = true;
        break;
      }

      if (action.overwrite_data_views) {
        ruleParams.dataViewId = undefined;
      }

      ruleParams.index = addItemsToArray(ruleParams.index ?? [], action.value);
      break;
    }
    case BulkActionEditTypeEnum.delete_index_patterns: {
      invariant(
        ruleParams.type !== 'machine_learning',
        "Index patterns can't be deleted. Machine learning rule doesn't have index patterns property"
      );
      invariant(
        ruleParams.type !== 'esql',
        "Index patterns can't be deleted. ES|QL rule doesn't have index patterns property"
      );

      if (
        !action.overwrite_data_views &&
        shouldSkipIndexPatternsBulkAction(ruleParams.index, ruleParams.dataViewId, action)
      ) {
        isActionSkipped = true;
        break;
      }

      if (action.overwrite_data_views) {
        ruleParams.dataViewId = undefined;
      }

      if (ruleParams.index) {
        ruleParams.index = deleteItemsFromArray(ruleParams.index, action.value);
      }
      break;
    }
    case BulkActionEditTypeEnum.set_index_patterns: {
      invariant(
        ruleParams.type !== 'machine_learning',
        "Index patterns can't be overwritten. Machine learning rule doesn't have index patterns property"
      );
      invariant(
        ruleParams.type !== 'esql',
        "Index patterns can't be overwritten. ES|QL rule doesn't have index patterns property"
      );

      if (shouldSkipIndexPatternsBulkAction(ruleParams.index, ruleParams.dataViewId, action)) {
        isActionSkipped = true;
        break;
      }

      if (action.overwrite_data_views) {
        ruleParams.dataViewId = undefined;
      }

      ruleParams.index = action.value;
      break;
    }
    // investigation_fields actions
    case BulkActionEditTypeEnum.add_investigation_fields: {
      if (shouldSkipInvestigationFieldsBulkAction(ruleParams.investigationFields, action)) {
        isActionSkipped = true;
        break;
      }

      ruleParams.investigationFields = {
        field_names: addItemsToArray(
          (Array.isArray(ruleParams.investigationFields)
            ? ruleParams.investigationFields
            : ruleParams.investigationFields?.field_names) ?? [],
          action.value.field_names
        ),
      };
      break;
    }
    case BulkActionEditTypeEnum.delete_investigation_fields: {
      if (shouldSkipInvestigationFieldsBulkAction(ruleParams.investigationFields, action)) {
        isActionSkipped = true;
        break;
      }

      if (ruleParams.investigationFields) {
        const fieldNames = deleteItemsFromArray(
          (Array.isArray(ruleParams.investigationFields)
            ? ruleParams.investigationFields
            : ruleParams.investigationFields?.field_names) ?? [],
          action.value.field_names
        );
        ruleParams.investigationFields =
          fieldNames.length > 0
            ? {
                field_names: fieldNames,
              }
            : undefined;
      }
      break;
    }
    case BulkActionEditTypeEnum.set_investigation_fields: {
      if (shouldSkipInvestigationFieldsBulkAction(ruleParams.investigationFields, action)) {
        isActionSkipped = true;
        break;
      }

      ruleParams.investigationFields = action.value;
      break;
    }
    // alert suppression actions
    case BulkActionEditTypeEnum.add_alert_suppression: {
      // for threshold rule type only duration exists in alert suppression
      if (ruleParams.type === 'threshold') {
        const thresholdRuleProcessed = updateAlertSuppressionForThresholdRule({
          alertSuppression: ruleParams.alertSuppression,
          action,
        });

        ruleParams.alertSuppression = thresholdRuleProcessed.alertSuppression;
        isActionSkipped = thresholdRuleProcessed.isActionSkipped;
        break;
      }

      if (shouldSkipAlertSuppressionFieldsBulkAction(ruleParams?.alertSuppression, action)) {
        isActionSkipped = true;
        break;
      }

      const resultingGroupBy = addItemsToArray(
        ruleParams?.alertSuppression?.groupBy ?? [],
        action.value.group_by
      );

      ruleParams.alertSuppression = updateAlertSuppression({
        alertSuppression: ruleParams.alertSuppression,
        action,
        resultingGroupBy,
      });
      break;
    }
    case BulkActionEditTypeEnum.delete_alert_suppression: {
      // for threshold rule type only duration exists in alert suppression
      if (ruleParams.type === 'threshold') {
        const thresholdRuleProcessed = updateAlertSuppressionForThresholdRule({
          alertSuppression: ruleParams.alertSuppression,
          action,
        });

        ruleParams.alertSuppression = thresholdRuleProcessed.alertSuppression;
        isActionSkipped = thresholdRuleProcessed.isActionSkipped;
        break;
      }

      if (shouldSkipAlertSuppressionFieldsBulkAction(ruleParams?.alertSuppression, action)) {
        isActionSkipped = true;
        break;
      }

      const resultingGroupBy = deleteItemsFromArray(
        ruleParams?.alertSuppression?.groupBy ?? [],
        action.value.group_by
      );

      if (resultingGroupBy.length === 0) {
        ruleParams.alertSuppression = undefined;
        break;
      }

      ruleParams.alertSuppression = updateAlertSuppression({
        alertSuppression: ruleParams.alertSuppression,
        action,
        resultingGroupBy,
      });

      break;
    }
    case BulkActionEditTypeEnum.set_alert_suppression: {
      // for threshold rule type only duration exists in alert suppression
      if (ruleParams.type === 'threshold') {
        const thresholdRuleProcessed = updateAlertSuppressionForThresholdRule({
          alertSuppression: ruleParams.alertSuppression,
          action,
        });

        ruleParams.alertSuppression = thresholdRuleProcessed.alertSuppression;
        isActionSkipped = thresholdRuleProcessed.isActionSkipped;
        break;
      }

      if (shouldSkipAlertSuppressionFieldsBulkAction(ruleParams?.alertSuppression, action)) {
        isActionSkipped = true;
        break;
      }

      if (action.value.group_by.length === 0) {
        ruleParams.alertSuppression = undefined;
        break;
      }

      ruleParams.alertSuppression = updateAlertSuppression({
        alertSuppression: ruleParams.alertSuppression,
        action,
        resultingGroupBy: action.value.group_by,
      });

      break;
    }
    // timeline actions
    case BulkActionEditTypeEnum.set_timeline: {
      ruleParams = {
        ...ruleParams,
        timelineId: action.value.timeline_id || undefined,
        timelineTitle: action.value.timeline_title || undefined,
      };

      break;
    }
    // update look-back period in from and meta.from fields
    case BulkActionEditTypeEnum.set_schedule: {
      const from = calculateFromValue(action.value.interval, action.value.lookback);

      ruleParams = {
        ...ruleParams,
        meta: {
          ...ruleParams.meta,
          from: action.value.lookback,
        },
        from,
      };

      break;
    }
  }

  return { ruleParams, isActionSkipped };
};

/**
 * takes list of bulkEdit actions and apply them to rule.params by mutating it
 * @param existingRuleParams
 * @param actions
 * @returns mutated params, isParamsUpdateSkipped flag
 */
export const ruleParamsModifier = (
  existingRuleParams: RuleAlertType['params'],
  actions: BulkActionEditForRuleParams[]
): RuleParamsModifierResult<RuleAlertType['params']> => {
  let isParamsUpdateSkipped = true;

  const modifiedParams = actions.reduce((acc, action) => {
    const { ruleParams, isActionSkipped } = applyBulkActionEditToRuleParams(acc, action);

    // The rule was updated with at least one action, so mark our rule as updated
    if (!isActionSkipped) {
      isParamsUpdateSkipped = false;
    }
    return { ...acc, ...ruleParams } as RuleAlertType['params'];
  }, existingRuleParams);

  // increment version even if actions are empty, as attributes can be modified as well outside of ruleParamsModifier
  // version must not be modified for immutable rule. Otherwise prebuilt rules upgrade flow will be broken
  if (existingRuleParams.immutable === false) {
    modifiedParams.version += 1;
  }

  return { modifiedParams, isParamsUpdateSkipped };
};
