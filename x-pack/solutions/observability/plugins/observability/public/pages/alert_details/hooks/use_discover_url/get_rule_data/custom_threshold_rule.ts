/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Rule } from '@kbn/alerts-ui-shared';
import { ALERT_GROUPING, ALERT_RULE_PARAMETERS } from '@kbn/rule-data-utils';
import { getViewInAppLocatorParams } from '../../../../../../common/custom_threshold_rule/get_view_in_app_url';
import { getDataViewId } from '../../../../../../common/custom_threshold_rule/helpers/get_data_view_id';
import { getGroupsFromGroupingObject } from '../../../../../../common/custom_threshold_rule/helpers/get_group';
import type {
  CustomThresholdExpressionMetric,
  SearchConfigurationWithExtractedReferenceType,
} from '../../../../../../common/custom_threshold_rule/types';
import type { TopAlert } from '../../../../../typings/alerts';

interface SnapshotCriterion {
  metrics?: CustomThresholdExpressionMetric[];
}

const toCriteria = (criteria: unknown): SnapshotCriterion[] => {
  if (Array.isArray(criteria)) {
    return criteria as SnapshotCriterion[];
  }
  return criteria ? [criteria as SnapshotCriterion] : [];
};

export const getCustomThresholdRuleData = ({ alert }: { rule: Rule; alert: TopAlert }) => {
  const ruleParams = alert.fields[ALERT_RULE_PARAMETERS] as
    | {
        searchConfiguration?: SearchConfigurationWithExtractedReferenceType;
        criteria?: unknown;
      }
    | undefined;
  const searchConfiguration = ruleParams?.searchConfiguration;
  if (!searchConfiguration) {
    return {};
  }

  const criteria = toCriteria(ruleParams?.criteria);
  const dataViewId = getDataViewId(searchConfiguration);

  return {
    discoverAppLocatorParams: getViewInAppLocatorParams({
      dataViewId,
      groups: getGroupsFromGroupingObject(alert.fields[ALERT_GROUPING]),
      metrics: criteria.flatMap((criterion) => criterion.metrics ?? []),
      searchConfiguration,
    }),
  };
};
