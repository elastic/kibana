/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest } from '@kbn/core/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import { ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX } from '@kbn/elastic-assistant-common';
import type { SecurityAttackDiscoveryAlert } from '@kbn/alerts-as-data-utils';
import type { SecuritySolutionRequestHandlerContext } from '../../types';

export const createFakeSecuritySolutionContext = async (
  core: CoreSetup,
  context: StepHandlerContext
): Promise<SecuritySolutionRequestHandlerContext> => {
  const [coreStart] = await core.getStartServices();
  const request = context.contextManager.getFakeRequest();

  return {
    securitySolution: Promise.resolve({
      getSpaceId: () => context.contextManager.getContext().workflow?.spaceId ?? 'default',
      getRuleDataService: () => {
        // We need to return an object that has getClient() which returns ruleDataClient
        // Wait, IRuleDataService is from rule-registry-plugin
        throw new Error('getRuleDataService is not implemented in fake context');
      },
    }),
    core: Promise.resolve({
      elasticsearch: {
        client: {
          asCurrentUser: context.contextManager.getScopedEsClient(),
        },
      },
      security: {
        authc: {
          getCurrentUser: () => coreStart.security.authc.getCurrentUser(request),
        },
      },
      uiSettings: {
        client: coreStart.uiSettings.asScopedToClient(
          coreStart.savedObjects.getScopedClient(request)
        ),
      },
    }),
  } as unknown as SecuritySolutionRequestHandlerContext;
};

export const createFakeRequest = <TBody>(
  context: StepHandlerContext,
  body: TBody
): KibanaRequest<unknown, unknown, TBody> => {
  const request = context.contextManager.getFakeRequest();
  return {
    ...request,
    body,
  } as unknown as KibanaRequest<unknown, unknown, TBody>;
};

export const getAttacksData = async (
  context: StepHandlerContext,
  attackIds: string[]
): Promise<{ existingAttackIds: string[]; relatedAlertIds: string[] }> => {
  if (!attackIds.length) return { existingAttackIds: [], relatedAlertIds: [] };

  const spaceId = context.contextManager.getContext().workflow?.spaceId ?? 'default';
  const attackIndex = `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-${spaceId}`;
  const esClient = context.contextManager.getScopedEsClient();

  try {
    const response = await esClient.search<SecurityAttackDiscoveryAlert>({
      index: attackIndex,
      query: {
        ids: {
          values: attackIds,
        },
      },
      _source: ['kibana.alert.attack_discovery.alert_ids'],
      size: 10000, // Assuming a reasonable upper limit for the number of attacks being updated at once
    });

    const existingAttackIds = new Set<string>();
    const relatedAlertIds = new Set<string>();

    for (const hit of response.hits.hits) {
      if (hit._id) {
        existingAttackIds.add(hit._id);
      }
      const alertIds = hit._source?.['kibana.alert.attack_discovery.alert_ids'];
      if (Array.isArray(alertIds)) {
        for (const id of alertIds) {
          relatedAlertIds.add(id);
        }
      }
    }

    const missingAttackIds = attackIds.filter((id) => !existingAttackIds.has(id));
    if (missingAttackIds.length > 0) {
      throw new Error(`The following attack IDs do not exist: ${missingAttackIds.join(', ')}`);
    }

    return {
      existingAttackIds: Array.from(existingAttackIds),
      relatedAlertIds: Array.from(relatedAlertIds),
    };
  } catch (error) {
    context.logger.error(
      'Failed to fetch attack data',
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
};

export const resolveAttackTargetsAndIndices = async (
  context: StepHandlerContext,
  fakeContext: SecuritySolutionRequestHandlerContext,
  ruleDataClient: IRuleDataClient | null,
  input: { attack_ids: string[]; update_related_alerts?: boolean }
) => {
  const updateRelated = input.update_related_alerts;
  const { existingAttackIds, relatedAlertIds } = await getAttacksData(context, input.attack_ids);

  const targetIds = [...existingAttackIds, ...(updateRelated ? relatedAlertIds : [])];

  const getIndexPattern = async () => {
    const spaceId = (await fakeContext.securitySolution).getSpaceId();
    const alertsIndex = ruleDataClient?.indexNameWithNamespace(spaceId);
    return [
      ...(updateRelated && alertsIndex ? [alertsIndex] : []),
      `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-${spaceId}`,
    ];
  };

  return { targetIds, getIndexPattern };
};
