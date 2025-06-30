/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import type { AlertsClient } from '@kbn/rule-registry-plugin/server';
import {
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  fields as TECHNICAL_ALERT_FIELDS,
} from '@kbn/rule-data-utils';
import { CustomThresholdParams } from '@kbn/response-ops-rule-params/custom_threshold';
import { DataViewSpec } from '@kbn/response-ops-rule-params/common';
import {
  isSuggestedDashboardsValidRuleTypeId,
  SuggestedDashboardsValidRuleTypeIds,
} from './helpers';

// TS will make sure that if we add a new supported rule type id we had the corresponding function to get the relevant rule fields
const getRelevantRuleFieldsMap: Record<
  SuggestedDashboardsValidRuleTypeIds,
  (ruleParams: { [key: string]: unknown }) => Set<string>
> = {
  [OBSERVABILITY_THRESHOLD_RULE_TYPE_ID]: (customThresholdParams) => {
    const relevantFields = new Set<string>();
    const metrics = (customThresholdParams as CustomThresholdParams).criteria[0].metrics;
    metrics.forEach((metric) => {
      // The property "field" is of type string | never but it collapses to just string
      // We should probably avoid typing field as never and just omit it from the type to avoid situations like this one
      if ('field' in metric) relevantFields.add(metric.field);
    });
    return relevantFields;
  },
};

const getRuleQueryIndexMap: Record<
  SuggestedDashboardsValidRuleTypeIds,
  (ruleParams: { [key: string]: unknown }) => string | null
> = {
  [OBSERVABILITY_THRESHOLD_RULE_TYPE_ID]: (customThresholdParams) => {
    const {
      searchConfiguration: { index },
    } = customThresholdParams as CustomThresholdParams;
    if (typeof index === 'object') return (index as DataViewSpec)?.id || null;
    if (typeof index === 'string') return index;
    return null;
  },
};

export class AlertData {
  constructor(private alert: Awaited<ReturnType<AlertsClient['get']>>) {}

  getRuleParameters() {
    return this.alert[ALERT_RULE_PARAMETERS];
  }

  getRuleId() {
    return this.alert[ALERT_RULE_UUID];
  }

  getRelevantRuleFields(): Set<string> {
    const ruleParameters = this.getRuleParameters();
    if (!ruleParameters) {
      throw new Error('No rule parameters found');
    }
    const ruleTypeId = this.getRuleTypeId();

    return isSuggestedDashboardsValidRuleTypeId(ruleTypeId)
      ? getRelevantRuleFieldsMap[ruleTypeId](ruleParameters)
      : new Set<string>();
  }

  getRelevantAADFields(): string[] {
    const ignoredFields = ['_index'];
    const allKibanaFields = Object.keys(this.alert).filter((field) => field.startsWith('kibana.'));
    const nonTechnicalFields = omit(this.alert, [
      ...Object.values(TECHNICAL_ALERT_FIELDS),
      ...allKibanaFields,
      ...ignoredFields,
    ]);
    return Object.keys(nonTechnicalFields);
  }

  getAllRelevantFields(): string[] {
    const ruleFields = this.getRelevantRuleFields();
    const aadFields = this.getRelevantAADFields();
    return Array.from(new Set([...ruleFields, ...aadFields]));
  }

  getAlertTags(): string[] {
    return this.alert.tags || [];
  }

  getRuleQueryIndex(): string | null {
    const ruleParameters = this.getRuleParameters();
    const ruleTypeId = this.getRuleTypeId();
    if (!ruleParameters) {
      throw new Error('No rule parameters found');
    }

    return isSuggestedDashboardsValidRuleTypeId(ruleTypeId)
      ? getRuleQueryIndexMap[ruleTypeId](ruleParameters)
      : null;
  }

  getRuleTypeId(): string | undefined {
    return this.alert[ALERT_RULE_TYPE_ID];
  }
}
