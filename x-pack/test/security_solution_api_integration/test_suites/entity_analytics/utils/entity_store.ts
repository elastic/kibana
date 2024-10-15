/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityType } from '@kbn/security-solution-plugin/common/api/entity_analytics/entity_store/common.gen';

import { FtrProviderContext } from '../../../../api_integration/ftr_provider_context';

export const EntityStoreUtils = (
  getService: FtrProviderContext['getService'],
  namespace?: string
) => {
  const api = getService('securitySolutionApi');
  const es = getService('es');
  const log = getService('log');

  log.debug(`EntityStoreUtils namespace: ${namespace}`);

  const cleanEngines = async () => {
    const { body } = await api.listEntityEngines(namespace).expect(200);

    // @ts-expect-error body is any
    const engineTypes = body.engines.map((engine) => engine.type);

    log.info(`Cleaning engines: ${engineTypes.join(', ')}`);
    try {
      await Promise.all(
        engineTypes.map((entityType: 'user' | 'host') =>
          api.deleteEntityEngine({ params: { entityType }, query: { data: true } }, namespace)
        )
      );
    } catch (e) {
      log.warning(`Error deleting engines: ${e.message}`);
    }
  };

  const initEntityEngineForEntityType = (entityType: EntityType) => {
    log.info(`Initializing engine for entity type ${entityType} in namespace ${namespace}`);
    return api
      .initEntityEngine(
        {
          params: { entityType },
          body: {},
        },
        namespace
      )
      .expect(200);
  };

  const expectTransformStatus = async (
    transformId: string,
    exists: boolean,
    attempts: number = 5,
    delayMs: number = 2000
  ) => {
    let currentAttempt = 1;
    while (currentAttempt <= attempts) {
      try {
        await es.transform.getTransform({ transform_id: transformId });
        if (!exists) {
          throw new Error(`Expected transform ${transformId} to not exist, but it does`);
        }
        return; // Transform exists, exit the loop
      } catch (e) {
        if (currentAttempt === attempts) {
          if (exists) {
            throw new Error(`Expected transform ${transformId} to exist, but it does not: ${e}`);
          } else {
            return; // Transform does not exist, exit the loop
          }
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        currentAttempt++;
      }
    }
  };

  const expectTransformNotFound = async (transformId: string, attempts: number = 5) => {
    return expectTransformStatus(transformId, false);
  };
  const expectTransformExists = async (transformId: string) => {
    return expectTransformStatus(transformId, true);
  };

  const expectTransformsExist = async (transformIds: string[]) =>
    Promise.all(transformIds.map((id) => expectTransformExists(id)));

  return {
    cleanEngines,
    initEntityEngineForEntityType,
    expectTransformStatus,
    expectTransformNotFound,
    expectTransformExists,
    expectTransformsExist,
  };
};
