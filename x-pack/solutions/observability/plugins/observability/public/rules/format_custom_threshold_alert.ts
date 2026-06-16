/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_GROUP_FIELD,
  ALERT_GROUP_VALUE,
  ALERT_REASON,
  ALERT_RULE_PARAMETERS,
  ALERT_START,
} from '@kbn/rule-data-utils';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import type {
  CustomThresholdExpressionMetric,
  SearchConfigurationWithExtractedReferenceType,
} from '../../common/custom_threshold_rule/types';
import type { MetricExpression } from '../components/custom_threshold/types';
import { getViewInAppUrl } from '../../common/custom_threshold_rule/get_view_in_app_url';
import { getGroups } from '../../common/custom_threshold_rule/helpers/get_group';

const getDataViewId = (searchConfiguration?: SearchConfigurationWithExtractedReferenceType) =>
  typeof searchConfiguration?.index === 'string'
    ? searchConfiguration.index
    : searchConfiguration?.index?.title;

export const formatCustomThresholdAlert = (
  fields: Record<string, unknown>,
  logsLocator?: LocatorPublic<DiscoverAppLocatorParams>
) => {
  const groups = getGroups(
    fields[ALERT_GROUP_FIELD] as string[] | undefined,
    fields[ALERT_GROUP_VALUE] as string[] | undefined
  );
  const ruleParams = fields[ALERT_RULE_PARAMETERS] as
    | { searchConfiguration?: SearchConfigurationWithExtractedReferenceType; criteria?: unknown }
    | undefined;
  const searchConfiguration = ruleParams?.searchConfiguration;
  const criteriaRaw = ruleParams?.criteria;
  const criteria = (
    Array.isArray(criteriaRaw) ? criteriaRaw : criteriaRaw ? [criteriaRaw] : []
  ) as MetricExpression[];
  const singleCriterion = criteria.length === 1 ? criteria[0] : undefined;
  const metrics: CustomThresholdExpressionMetric[] = singleCriterion?.metrics ?? [];

  const dataViewId = getDataViewId(searchConfiguration);

  return {
    reason: (fields[ALERT_REASON] as string) ?? '-',
    link: getViewInAppUrl({
      dataViewId,
      groups,
      logsLocator,
      metrics,
      searchConfiguration,
      startedAt: fields[ALERT_START] as string,
      timeSize: singleCriterion?.timeSize,
      timeUnit: singleCriterion?.timeUnit,
    }),
    hasBasePath: true,
  };
};
