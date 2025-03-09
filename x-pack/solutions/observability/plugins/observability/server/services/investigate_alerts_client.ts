/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { omit } from 'lodash';
import { OBSERVABILITY_RULE_TYPE_IDS } from '@kbn/rule-data-utils';
import { CustomThresholdParams } from '@kbn/response-ops-rule-params/custom_threshold';
import { AlertsClient } from '@kbn/rule-registry-plugin/server';
import {
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_TYPE_ID,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  fields as TECHNICAL_ALERT_FIELDS,
} from '@kbn/rule-data-utils';
import { AlertNotFoundError } from '../common/errors/alert_not_found_error';

export type AlertData = Awaited<ReturnType<AlertsClient['get']>>;

export class InvestigateAlertsClient {
  private alertsClient: AlertsClient;

  constructor(alertsClient: AlertsClient) {
    this.alertsClient = alertsClient;
  }

  async getAlertById(alertId: string): Promise<AlertData> {
    const indices = (await this.getAlertsIndices()) || [];
    if (!indices.length) {
      throw new Error('No alert indices exist');
    }
    try {
      return await this.alertsClient.get({
        id: alertId,
        index: indices.join(','),
      });
    } catch (e) {
      if (e.output.payload.statusCode === 404) {
        throw new AlertNotFoundError(`Alert with id ${alertId} not found`);
      }
      throw e;
    }
  }

  async getAlertsIndices() {
    return await this.alertsClient.getAuthorizedAlertsIndices(OBSERVABILITY_RULE_TYPE_IDS);
  }

  getRuleParameters(alert: AlertData) {
    const ruleParameters = alert[ALERT_RULE_PARAMETERS];
    return ruleParameters;
  }

  getRelevantRuleFields(alert: AlertData): Set<string> {
    const ruleParameters = this.getRuleParameters(alert);
    const relevantFields = new Set<string>();
    if (!ruleParameters) {
      throw new Error('No rule parameters found');
    }
    switch (this.getRuleTypeId(alert)) {
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

  getRelevantAADFields(alert: AlertData): string[] {
    const ignoredFields = ['_index'];
    const allKibanaFields = Object.keys(alert).filter((field) => field.startsWith('kibana.'));
    const nonTechnicalFields = omit(alert, [
      ...Object.values(TECHNICAL_ALERT_FIELDS),
      ...allKibanaFields,
      ...ignoredFields,
    ]);
    return Object.keys(nonTechnicalFields);
  }

  getAlertTags(alert: AlertData): string[] {
    return alert.tags || [];
  }

  getRuleQueryIndex(alert: AlertData) {
    const ruleParameters = this.getRuleParameters(alert);
    const ruleTypeId = this.getRuleTypeId(alert);
    if (!ruleParameters) {
      throw new Error('No rule parameters found');
    }
    switch (ruleTypeId) {
      case OBSERVABILITY_THRESHOLD_RULE_TYPE_ID:
        const customThresholdParams = ruleParameters as CustomThresholdParams;
        return customThresholdParams.searchConfiguration.index;
      default:
        return '';
    }
  }

  getRuleTypeId(alert: AlertData) {
    return alert[ALERT_RULE_TYPE_ID];
  }
}
