/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';

export interface BillingInstance {
  id: string;
  name: string;
  type: string;
  total_ecu: number;
}

export interface BillingUsageResponse {
  total_ecu: number;
  instances: BillingInstance[];
}

export interface BillingBudgetAlert {
  id: number;
  threshold: number;
  threshold_type: string;
  operator: string;
  last_exceeded_at?: string;
}

export interface BillingBudget {
  id: number;
  name: string;
  active: boolean;
  amount: number;
  period: string;
  scope_type: string;
  scope_values: string[];
  alerts: BillingBudgetAlert[];
}

export class BillingApiClient {
  private readonly logger: Logger;
  private readonly baseUrl: string;

  constructor(logger: Logger, baseUrl: string = 'https://cloud.elastic.co') {
    this.logger = logger;
    this.baseUrl = baseUrl;
  }

  async getInstancesCosts(
    apiKey: string,
    organizationId: string,
    from: string,
    to: string
  ): Promise<BillingUsageResponse> {
    const url = `${this.baseUrl}/api/v2/billing/organizations/${organizationId}/costs/instances?from=${from}&to=${to}`;

    this.logger.debug(`Fetching billing costs for org ${organizationId}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `ApiKey ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Billing API returned ${response.status}: ${errorBody}`);
    }

    const data = (await response.json()) as BillingUsageResponse;

    this.logger.debug(`Billing costs fetched: ${data.total_ecu} ECU total`);

    return data;
  }

  async getBudgets(apiKey: string, organizationId: string): Promise<BillingBudget[]> {
    const url = `${this.baseUrl}/api/v1/billing/organization/${organizationId}/budgets`;

    this.logger.debug(`Fetching budgets for org ${organizationId}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `ApiKey ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.warn(`Budgets API returned ${response.status}: ${errorBody}`);
      return [];
    }

    const data = (await response.json()) as BillingBudget[];

    this.logger.debug(`Fetched ${data.length} budgets`);

    return data;
  }
}
