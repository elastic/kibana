/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { MessageRole } from '@kbn/inference-common';
import {
  extractRumBudgetKqlFromLlm,
  RUM_BUDGET_AI_SYSTEM_PROMPT,
} from '../../../common/rum_budget_kql';
import { RUM_BUDGET_TAG, toRumBudgetItem, type RumBudgetItem } from '../../../common/rum_budgets';
import { createUxServerRoute } from '../create_ux_server_route';
import { boundedString } from './query';

export interface RumBudgetsResponse {
  available: boolean;
  items: RumBudgetItem[];
  total: number;
}

export const listRumBudgetsRoute = createUxServerRoute({
  endpoint: 'GET /internal/ux/rum/budgets',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<RumBudgetsResponse> => {
    const plugins = await resources.startPlugins();
    if (!plugins.slo) {
      return { available: false, items: [], total: 0 };
    }
    const client = await plugins.slo.getSloClientWithRequest(resources.request);
    const found = await client.findSlos({
      kqlQuery: `slo.tags: "${RUM_BUDGET_TAG}"`,
      perPage: '100',
      sortBy: 'status',
      sortDirection: 'asc',
    });
    return {
      available: true,
      total: found.total,
      items: found.results.map((slo) =>
        toRumBudgetItem({
          id: slo.id,
          instanceId: slo.instanceId,
          name: slo.name,
          description: slo.description,
          tags: slo.tags,
          indicator: slo.indicator,
          objective: { target: slo.objective.target },
          timeWindow: { duration: slo.timeWindow.duration },
          summary: slo.summary,
          groupings: slo.groupings,
        })
      ),
    };
  },
});

const generateBodyCodec = t.intersection([
  t.type({ prompt: boundedString(2000) }),
  t.partial({
    connectorId: boundedString(128),
    filters: t.partial({
      serviceName: boundedString(256),
      pageUrl: boundedString(512),
    }),
  }),
]);

export const generateRumBudgetKqlRoute = createUxServerRoute({
  endpoint: 'POST /internal/ux/rum/budgets/_generate',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({ body: generateBodyCodec }),
  handler: async (
    resources
  ): Promise<{ filter: string; good: string; index: string; description: string }> => {
    const plugins = await resources.startPlugins();
    if (!plugins.inference) {
      throw new Error('Inference is not available');
    }
    const { prompt, connectorId, filters } = resources.params.body;
    const connector = connectorId
      ? await plugins.inference.getConnectorById(connectorId, resources.request)
      : await plugins.inference.getDefaultConnector(resources.request);
    if (!connector) {
      throw new Error('No GenAI connector is configured');
    }
    const filterLines = [
      filters?.serviceName ? `service: ${filters.serviceName}` : null,
      filters?.pageUrl ? `page: ${filters.pageUrl}` : null,
    ].filter(Boolean);
    const client = plugins.inference.getClient({ request: resources.request });
    const response = await client.chatComplete({
      connectorId: connector.connectorId,
      system: RUM_BUDGET_AI_SYSTEM_PROMPT,
      messages: [
        {
          role: MessageRole.User,
          content: [
            'Write a RUM performance-budget SLO (KQL filter + good) for:',
            prompt.trim(),
            filterLines.length > 0 ? `Filters: ${filterLines.join(', ')}` : 'Filters: none',
            'Return JSON only. KQL only — no FROM, no pipes.',
          ].join('\n'),
        },
      ],
    });
    const extracted = extractRumBudgetKqlFromLlm(response.content?.trim() ?? '');
    return {
      filter: extracted.filter,
      good: extracted.good,
      index: extracted.index,
      description: (extracted.description || prompt.trim()).slice(0, 300),
    };
  },
});
