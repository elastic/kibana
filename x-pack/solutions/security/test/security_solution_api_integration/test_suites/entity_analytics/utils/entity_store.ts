/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType } from '@kbn/security-solution-plugin/common/api/entity_analytics/entity_store/common.gen';
import expect from '@kbn/expect';
import type { InitEntityStoreRequestBodyInput } from '@kbn/security-solution-plugin/common/api/entity_analytics/entity_store/enable.gen';
import type { FtrProviderContext } from '../../../ftr_provider_context';
import { elasticAssetCheckerFactory } from './elastic_asset_checker';

export const EntityStoreUtils = (
  getService: FtrProviderContext['getService'],
  namespace: string = 'default'
) => {
  const entityAnalyticsApi = getService('entityAnalyticsApi');
  const es = getService('es');
  const log = getService('log');
  const retry = getService('retry');
  const {
    expectTransformExists,
    expectTransformNotFound,
    expectEnrichPolicyExists,
    expectEnrichPolicyNotFound,
    expectComponentTemplateExists,
    expectComponentTemplateNotFound,
    expectIngestPipelineExists,
    expectIngestPipelineNotFound,
    expectEntitiesIndexExists,
    expectEntitiesIndexNotFound,
  } = elasticAssetCheckerFactory(getService);

  log.debug(`EntityStoreUtils namespace: ${namespace}`);

  const cleanEngines = async () => {
    const supertest = getService('supertest');
    let settingsUrl = '/internal/kibana/settings';
    if (namespace !== 'default') {
      settingsUrl = `/s/${namespace}${settingsUrl}`;
    }
    await supertest
      .post(settingsUrl)
      .set('kbn-xsrf', 'true')
      .set('x-elastic-internal-origin', 'Kibana')
      .send({ changes: { 'securitySolution:entityStoreEnableV2': null } })
      .expect(200);

    const { body } = await entityAnalyticsApi.listEntityEngines(namespace).expect(200);

    // @ts-expect-error body is any
    const engineTypes = body.engines.map((engine) => engine.type);

    log.info(`Cleaning engines: ${engineTypes.join(', ')}`);
    try {
      await Promise.all(
        engineTypes.map((entityType: 'user' | 'host') =>
          entityAnalyticsApi.deleteEntityEngine(
            { params: { entityType }, query: { data: true } },
            namespace
          )
        )
      );
    } catch (e) {
      log.warning(`Error deleting engines: ${e.message}`);
    }
  };

  const initEntityEngineForEntityType = async (entityType: EntityType) => {
    log.info(
      `Initializing engine for entity type ${entityType} in namespace ${namespace || 'default'}`
    );
    const res = await entityAnalyticsApi.initEntityEngine(
      {
        params: { entityType },
        body: {},
      },
      namespace
    );

    if (res.status !== 200) {
      log.error(`Failed to initialize engine for entity type ${entityType}`);
      log.error(JSON.stringify(res.body));
    }

    expect(res.status).to.eql(200);
  };

  const initEntityEngineForEntityTypesAndWait = async (entityTypes: EntityType[]) => {
    await Promise.all(entityTypes.map((entityType) => initEntityEngineForEntityType(entityType)));

    await retry.waitForWithTimeout(
      `Engines to start for entity types: ${entityTypes.join(', ')}`,
      60_000,
      async () => {
        const { body } = await entityAnalyticsApi.listEntityEngines(namespace).expect(200);
        if (body.engines.every((engine: any) => engine.status === 'started')) {
          return true;
        }
        if (body.engines.some((engine: any) => engine.status === 'error')) {
          throw new Error(`Engines not started: ${JSON.stringify(body)}`);
        }
        return false;
      }
    );
  };

  const waitForEngineStatus = async (entityType: EntityType, status: string) => {
    await retry.waitForWithTimeout(
      `Engine for entity type ${entityType} to be in status ${status}`,
      60_000,
      async () => {
        const { body } = await entityAnalyticsApi
          .getEntityEngine({ params: { entityType } }, namespace)
          .expect(200);
        log.debug(`Engine status for ${entityType}: ${body.status}`);

        if (status !== 'error' && body.status === 'error') {
          // If we are not expecting an error, throw the error to improve logging
          throw new Error(`Engine not started: ${JSON.stringify(body)}`);
        }

        return body.status === status;
      }
    );
  };

  const enableEntityStore = async (body: InitEntityStoreRequestBodyInput = {}) => {
    const res = await entityAnalyticsApi.initEntityStore({ body }, namespace);
    if (res.status !== 200) {
      log.error(`Failed to enable entity store`);
      log.error(JSON.stringify(res.body));
    }
    expect(res.status).to.eql(200);
    return res;
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

  const expectEngineAssetsExist = async (entityType: EntityType) => {
    await expectTransformExists(`entities-v1-latest-security_${entityType}_${namespace}`);
    await expectEnrichPolicyExists(
      `entity_store_field_retention_${entityType}_${namespace}_v1.0.0`
    );
    await expectComponentTemplateExists(`security_${entityType}_${namespace}-latest@platform`);
    await expectIngestPipelineExists(`security_${entityType}_${namespace}-latest@platform`);
    await expectEntitiesIndexExists(entityType, namespace);
  };

  const expectEngineAssetsDoNotExist = async (entityType: EntityType) => {
    await expectTransformNotFound(`entities-v1-latest-security_${entityType}_${namespace}`);
    await expectEnrichPolicyNotFound(
      `entity_store_field_retention_${entityType}_${namespace}_v1.0.0`
    );
    await expectComponentTemplateNotFound(`security_${entityType}_${namespace}-latest@platform`);
    await expectIngestPipelineNotFound(`security_${entityType}_${namespace}-latest@platform`);
    await expectEntitiesIndexNotFound(entityType, namespace);
  };

  const searchEntitiesV2 = async (
    filter: string,
    opts: { size?: number; source?: string[] } = {}
  ) => {
    const supertest = getService('supertest');
    let url = '/internal/security/entity_store/entities';
    if (namespace !== 'default') {
      url = `/s/${namespace}${url}`;
    }
    const res = await supertest
      .get(url)
      .set('kbn-xsrf', 'true')
      .set('x-elastic-internal-origin', 'Kibana')
      .set('elastic-api-version', '2')
      .query({
        filter,
        ...(opts.size !== undefined ? { size: opts.size } : {}),
        ...(opts.source ? { source: opts.source } : {}),
      });
    if (res.status !== 200) {
      log.error(`Failed to search entities`);
      log.error(JSON.stringify(res.body));
    }
    expect(res.status).to.eql(200);
    return res;
  };

  const deleteEntityV2 = async (entityId: string) => {
    const supertest = getService('supertest');
    let url = '/internal/security/entity_store/entities/';
    if (namespace !== 'default') {
      url = `/s/${namespace}${url}`;
    }
    const res = await supertest
      .delete(url)
      .set('kbn-xsrf', 'true')
      .set('x-elastic-internal-origin', 'Kibana')
      .set('elastic-api-version', '2')
      .send({ entityId });
    if (res.status !== 200) {
      log.error(`Failed to delete entity ${entityId}`);
      log.error(JSON.stringify(res.body));
    }
    expect(res.status).to.eql(200);
    return res;
  };

  const enableEntityStoreV2 = async (body: any = { entityTypes: ['user', 'host'] }) => {
    const supertest = getService('supertest');

    let settingsUrl = '/internal/kibana/settings';
    if (namespace !== 'default') {
      settingsUrl = `/s/${namespace}${settingsUrl}`;
    }
    await supertest
      .post(settingsUrl)
      .set('kbn-xsrf', 'true')
      .set('x-elastic-internal-origin', 'Kibana')
      .send({ changes: { 'securitySolution:entityStoreEnableV2': true } })
      .expect(200);

    let url = '/internal/security/entity_store/install?apiVersion=2';
    if (namespace !== 'default') {
      url = `/s/${namespace}${url}`;
    }
    const res = await supertest
      .post(url)
      .set('kbn-xsrf', 'true')
      .set('x-elastic-internal-origin', 'Kibana')
      .send(body);
    if (res.status !== 201 && res.status !== 200) {
      log.error(`Failed to install entity store v2`);
      log.error(JSON.stringify(res.body));
    }
    expect([200, 201]).to.contain(res.status);

    return res;
  };

  const installEntityStoreV2 = async (body: any = { entityTypes: ['user', 'host'] }) => {
    const supertest = getService('supertest');

    const res = await enableEntityStoreV2(body);

    let maintainersUrl = '/internal/security/entity_store/entity_maintainers/init?apiVersion=2';
    if (namespace !== 'default') {
      maintainersUrl = `/s/${namespace}${maintainersUrl}`;
    }

    await supertest
      .post(maintainersUrl)
      .set('kbn-xsrf', 'true')
      .set('x-elastic-internal-origin', 'Kibana')
      .send({})
      .expect(200);
    return res;
  };

  return {
    cleanEngines,
    deleteEntityV2,
    searchEntitiesV2,
    initEntityEngineForEntityTypesAndWait,
    expectTransformStatus,
    expectEngineAssetsExist,
    expectEngineAssetsDoNotExist,
    enableEntityStore,
    enableEntityStoreV2,
    installEntityStoreV2,
    waitForEngineStatus,
    initEntityEngineForEntityType,
  };
};
