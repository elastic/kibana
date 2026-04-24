/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, Logger, StartServicesAccessor } from '@kbn/core/server';
import { BillingApiKeyStorage } from '../lib/billing_api_key_storage';
import { BillingApiClient } from '../lib/billing_api_client';
import { BILLING_API_KEY_TYPE } from '../saved_objects/billing_api_key';

export const registerBillingRoutes = (
  router: IRouter,
  logger: Logger,
  getStartServices: StartServicesAccessor<{}, unknown>
): void => {
  const getStorage = async () => {
    const [coreStart] = await getStartServices();
    const repo = coreStart.savedObjects.createInternalRepository([BILLING_API_KEY_TYPE]);
    return new BillingApiKeyStorage({ savedObjectsRepository: repo, logger });
  };

  router.post(
    {
      path: '/internal/search_homepage/billing/api_key',
      security: {
        authz: {
          enabled: false,
          reason: 'This route stores a user-provided Cloud API key for billing data access.',
        },
      },
      validate: {
        body: schema.object({
          apiKey: schema.string({ minLength: 1 }),
          organizationId: schema.string({ minLength: 1 }),
        }),
      },
      options: {
        access: 'internal',
      },
    },
    async (_context, request, response) => {
      try {
        const storage = await getStorage();
        await storage.saveApiKey(request.body.apiKey, request.body.organizationId);

        return response.ok({
          body: { success: true },
        });
      } catch (error) {
        logger.error('Failed to save billing API key', { error });
        return response.customError({
          statusCode: 500,
          body: { message: 'Failed to save billing API key' },
        });
      }
    }
  );

  router.get(
    {
      path: '/internal/search_homepage/billing/usage',
      security: {
        authz: {
          enabled: false,
          reason: 'This route fetches billing data using a stored Cloud API key.',
        },
      },
      validate: {},
      options: {
        access: 'internal',
      },
    },
    async (_context, _request, response) => {
      try {
        const storage = await getStorage();
        const storedKey = await storage.getApiKey();

        if (!storedKey) {
          return response.ok({
            body: { configured: false },
          });
        }

        const billingClient = new BillingApiClient(logger);
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const from = monthStart.toISOString();
        const to = now.toISOString();

        const [usageData, budgets] = await Promise.all([
          billingClient.getInstancesCosts(storedKey.apiKey, storedKey.organizationId!, from, to),
          billingClient.getBudgets(storedKey.apiKey, storedKey.organizationId!),
        ]);

        const activeBudgets = budgets
          .filter((b) => b.active)
          .map((b) => ({
            id: b.id,
            name: b.name,
            amount: b.amount,
            scopeType: b.scope_type,
            scopeValues: b.scope_values,
            alerts: b.alerts.map((a) => ({
              threshold: a.threshold,
              thresholdType: a.threshold_type,
              lastExceededAt: a.last_exceeded_at,
            })),
          }));

        return response.ok({
          body: {
            configured: true,
            totalEcu: usageData.total_ecu,
            budgets: activeBudgets,
            instances: usageData.instances.map((inst) => ({
              id: inst.id,
              name: inst.name,
              type: inst.type,
              totalEcu: inst.total_ecu,
            })),
          },
        });
      } catch (error) {
        logger.error('Failed to fetch billing usage', { error });
        return response.customError({
          statusCode: 500,
          body: { message: 'Failed to fetch billing usage data' },
        });
      }
    }
  );
};
