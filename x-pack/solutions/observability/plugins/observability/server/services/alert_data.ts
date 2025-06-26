/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { CustomThresholdParams } from '@kbn/response-ops-rule-params/custom_threshold';
import type { AlertsClient } from '@kbn/rule-registry-plugin/server';
import { DataViewSpec } from '@kbn/response-ops-rule-params/common';
import {
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  fields as TECHNICAL_ALERT_FIELDS,
} from '@kbn/rule-data-utils';

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
    const relevantFields = new Set<string>();
    if (!ruleParameters) {
      throw new Error('No rule parameters found');
    }
    switch (this.getRuleTypeId()) {
      case OBSERVABILITY_THRESHOLD_RULE_TYPE_ID:
        const customThresholdParams = ruleParameters as CustomThresholdParams;
        const metrics = customThresholdParams.criteria[0].metrics;
        metrics.forEach((metric) => {
          relevantFields.add(metric.field);
        });
        return relevantFields;
      default:
        return relevantFields;
    }
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
    switch (ruleTypeId) {
      case OBSERVABILITY_THRESHOLD_RULE_TYPE_ID:
        const customThresholdParams = ruleParameters as CustomThresholdParams;
        if (typeof customThresholdParams.searchConfiguration.index === 'object')
          return (customThresholdParams.searchConfiguration.index as DataViewSpec)?.id || null;
        if (typeof customThresholdParams.searchConfiguration.index === 'string')
          return customThresholdParams.searchConfiguration.index;
        return null;
      default:
        return null;
    }
  }

  getRuleTypeId(): string | undefined {
    return this.alert[ALERT_RULE_TYPE_ID];
  }
}
