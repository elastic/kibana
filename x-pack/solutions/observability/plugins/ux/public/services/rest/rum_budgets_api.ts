/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import {
  buildRumBudgetSlo,
  rumBudgetBurnRateWindows,
  type RumBudgetFilters,
  type RumBudgetItem,
  type RumBudgetParams,
} from '../../../common/rum_budgets';

export interface RumBudgetsResponse {
  available: boolean;
  items: RumBudgetItem[];
  total: number;
}

export const fetchRumBudgets = async (http: HttpStart): Promise<RumBudgetsResponse> => {
  return http.get<RumBudgetsResponse>('/internal/ux/rum/budgets');
};

export const createRumBudget = async (
  http: HttpStart,
  params: RumBudgetParams,
  options: { alert: boolean }
): Promise<{ id: string; alertCreated: boolean }> => {
  const built = buildRumBudgetSlo(params);
  const created = await http.post<{ id: string }>('/api/observability/slos', {
    version: '2023-10-31',
    body: JSON.stringify(built.slo),
  });
  if (!options.alert) {
    return { id: created.id, alertCreated: false };
  }
  try {
    const ruleId = crypto.randomUUID();
    await http.post(`/api/alerting/rule/${ruleId}`, {
      body: JSON.stringify({
        params: { sloId: created.id, windows: rumBudgetBurnRateWindows() },
        consumer: 'slo',
        schedule: { interval: '1m' },
        tags: built.tags,
        name: `${built.slo.name} Burn Rate rule`,
        rule_type_id: 'slo.rules.burnRate',
        actions: [],
        enabled: true,
      }),
    });
    return { id: created.id, alertCreated: true };
  } catch {
    return { id: created.id, alertCreated: false };
  }
};

export const deleteRumBudget = async (http: HttpStart, id: string): Promise<void> => {
  await http.delete(`/api/observability/slos/${id}`, { version: '2023-10-31' });
};

export const generateRumBudgetKql = async (
  http: HttpStart,
  body: { prompt: string; filters?: RumBudgetFilters; connectorId?: string }
): Promise<{ filter: string; good: string; index: string; description: string }> => {
  return http.post('/internal/ux/rum/budgets/_generate', {
    body: JSON.stringify(body),
  });
};
