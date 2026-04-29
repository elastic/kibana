/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { GET_TRIAL_USAGE_ROUTE } from '../../common/routes';
import type { RouterContextData, TrialUsageResponse } from '../types';
import { fetchSizeStats } from '../lib/size_stats';

function getSettingValue(allSettings: Record<string, unknown>, key: string): string | undefined {
  const value = allSettings[key];
  return value !== undefined ? String(value) : undefined;
}

export const registerTrialUsageRoute = (
  router: IRouter,
  _logger: Logger,
  { trialEndDate, isServerless }: RouterContextData
): void => {
  router.get<unknown, unknown, TrialUsageResponse>(
    {
      path: GET_TRIAL_USAGE_ROUTE,
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
      validate: {},
      options: {
        access: 'internal',
      },
    },
    async (context, _request, response) => {
      const client = (await context.core).elasticsearch.client;

      const trialDaysLeft = trialEndDate
        ? Math.max(0, Math.ceil((trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0;

      // Storage usage
      let storageUsage = '0b';
      try {
        const stats = await fetchSizeStats(client, isServerless);
        storageUsage = stats.sizeStats.size;
      } catch {
        // storage stats may not be available
      }

      // ML nodes
      let mlNodeCount: number | undefined;
      let mlMemoryLimit: string | undefined;
      try {
        const mlInfo = await client.asCurrentUser.ml.info();
        const limit = mlInfo.limits?.effective_max_model_memory_limit;
        mlMemoryLimit = limit !== undefined ? String(limit) : undefined;

        const nodesInfo = await client.asCurrentUser.nodes.info({
          filter_path: 'nodes.*.attributes',
        });
        const nodes = nodesInfo.nodes ?? {};
        mlNodeCount = Object.values(nodes).filter(
          (node: any) =>
            node.attributes?.['ml.machine_memory'] &&
            Number(node.attributes['ml.machine_memory']) > 0
        ).length;
      } catch {
        // ML may not be available
      }

      // LLM token usage
      let llmTotalTokens: number | undefined;
      try {
        const result = await client.asCurrentUser.search({
          index: '.kibana-inference-token-usage',
          size: 0,
          aggs: {
            total_tokens: {
              sum: { field: 'token_usage.total_tokens' },
            },
          },
        });

        const aggs = result.aggregations as { total_tokens?: { value: number } } | undefined;
        llmTotalTokens = aggs?.total_tokens?.value ?? undefined;
      } catch {
        // data stream may not exist yet
      }

      // Serverless search settings
      let searchPowerMax: number | undefined;
      let searchPowerMin: number | undefined;
      let boostWindowHours: number | undefined;
      try {
        const settings = await client.asCurrentUser.cluster.getSettings({
          include_defaults: true,
          flat_settings: true,
        });

        const allSettings: Record<string, unknown> = {
          ...((settings.defaults as Record<string, unknown>) ?? {}),
          ...((settings.persistent as Record<string, unknown>) ?? {}),
          ...((settings.transient as Record<string, unknown>) ?? {}),
        };

        const powerMax = getSettingValue(allSettings, 'serverless.search.search_power_max');
        const powerMin = getSettingValue(allSettings, 'serverless.search.search_power_min');
        const boostWindow = getSettingValue(allSettings, 'serverless.search.boost_window');

        if (powerMax !== undefined) searchPowerMax = Number(powerMax);
        if (powerMin !== undefined) searchPowerMin = Number(powerMin);
        if (boostWindow !== undefined) {
          if (boostWindow.endsWith('d')) {
            boostWindowHours = parseInt(boostWindow, 10) * 24;
          } else if (boostWindow.endsWith('h')) {
            boostWindowHours = parseInt(boostWindow, 10);
          } else {
            boostWindowHours = parseInt(boostWindow, 10);
          }
        }
      } catch {
        // cluster settings may not be accessible
      }

      return response.ok({
        headers: { 'content-type': 'application/json' },
        body: {
          trialDaysLeft,
          storageUsage,
          mlNodeCount,
          mlMemoryLimit,
          llmTotalTokens,
          searchPowerMax,
          searchPowerMin,
          boostWindowHours,
        },
      });
    }
  );
};
