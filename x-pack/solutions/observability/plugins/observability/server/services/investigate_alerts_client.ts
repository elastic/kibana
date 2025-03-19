/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { OBSERVABILITY_RULE_TYPE_IDS } from '@kbn/rule-data-utils';
import { AlertsClient } from '@kbn/rule-registry-plugin/server';
import { AlertNotFoundError } from '../common/errors/alert_not_found_error';
import { AlertData } from './alert_data';

export class InvestigateAlertsClient {
  constructor(private alertsClient: AlertsClient) {}

  async getAlertById(alertId: string): Promise<AlertData> {
    const indices = (await this.getAlertsIndices()) || [];
    if (!indices.length) {
      throw new Error('No alert indices exist');
    }
    try {
      const alert = await this.alertsClient.get({
        id: alertId,
        index: indices.join(','),
      });
      return new AlertData(alert);
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
}
