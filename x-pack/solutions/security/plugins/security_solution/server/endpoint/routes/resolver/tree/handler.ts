/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';

import type { RequestHandler } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
import type { RuleRegistryPluginStartContract } from '@kbn/rule-registry-plugin/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import { EXCLUDE_COLD_AND_FROZEN_TIERS_IN_ANALYZER } from '../../../../../common/constants';

import type { validateTree } from '../../../../../common/endpoint/schema/resolver';
import { featureUsageService } from '../../../services/feature_usage';
import { Fetcher } from './utils/fetch';

export function handleTree(
  getRuleRegistry: () => Promise<RuleRegistryPluginStartContract>,
  getLicensing: () => Promise<LicensingPluginStart>
): RequestHandler<unknown, unknown, TypeOf<typeof validateTree.body>> {
  return async (context, req, res) => {
    const client = (await context.core).elasticsearch.client;
    const licensing = await getLicensing();
    const license = await firstValueFrom(licensing.license$);
    const hasAccessToInsightsRelatedByProcessAncestry = license.hasAtLeast('platinum');
    const shouldExcludeColdAndFrozenTiers = await (
      await context.core
    ).uiSettings.client.get<boolean>(EXCLUDE_COLD_AND_FROZEN_TIERS_IN_ANALYZER);

    if (hasAccessToInsightsRelatedByProcessAncestry) {
      featureUsageService.notifyUsage('ALERTS_BY_PROCESS_ANCESTRY');
    }

    const alertsClient = hasAccessToInsightsRelatedByProcessAncestry
      ? await (await getRuleRegistry()).getRacClientWithRequest(req)
      : undefined;
    const fetcher = new Fetcher(client, alertsClient);
    const body = await fetcher.tree({ ...req.body, shouldExcludeColdAndFrozenTiers });
    return res.ok({
      body,
    });
  };
}
