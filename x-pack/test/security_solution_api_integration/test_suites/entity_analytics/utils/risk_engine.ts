/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import { v4 as uuidv4 } from 'uuid';
import SuperTest from 'supertest';
import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { EcsRiskScore } from '@kbn/security-solution-plugin/common/entity_analytics/risk_engine';
import { riskEngineConfigurationTypeName } from '@kbn/security-solution-plugin/server/lib/entity_analytics/risk_engine/saved_object';
import type { KbnClient } from '@kbn/test';
import {
  RISK_ENGINE_INIT_URL,
  RISK_ENGINE_DISABLE_URL,
  RISK_ENGINE_ENABLE_URL,
  RISK_ENGINE_STATUS_URL,
  RISK_ENGINE_PRIVILEGES_URL,
  RISK_ENGINE_SCHEDULE_NOW_URL,
} from '@kbn/security-solution-plugin/common/constants';
import { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { removeLegacyTransforms } from '@kbn/security-solution-plugin/server/lib/entity_analytics/utils/transforms';
import { EntityRiskScoreRecord } from '@kbn/security-solution-plugin/common/api/entity_analytics/common';
import { SupertestWithoutAuthProviderType } from '@kbn/ftr-common-functional-services';
import {
  createRule,
  waitForAlertsToBePresent,
  waitForRuleSuccess,
  getRuleForAlertTesting,
  countDownTest,
  waitFor,
  routeWithNamespace,
} from '../../../../common/utils/security_solution';

const sanitizeScore = (score: Partial<EntityRiskScoreRecord>): Partial<EntityRiskScoreRecord> => {
  const {
    '@timestamp': timestamp,
    inputs,
    notes,
    category_2_count: cat2Count,
    category_2_score: cat2Score,
    ...rest
  } = score;
  return rest;
};

export const sanitizeScores = (
  scores: Array<Partial<EntityRiskScoreRecord>>
): Array<Partial<EntityRiskScoreRecord>> => scores.map(sanitizeScore);

export const normalizeScores = (
  scores: Array<Partial<EcsRiskScore>>
): Array<Partial<EntityRiskScoreRecord>> =>
  scores.map((score) => sanitizeScore(score.host?.risk ?? score.user?.risk ?? {}));

export const buildDocument = (body: object, id?: string) => {
  const firstTimestamp = Date.now();
  const doc = {
    id: id || uuidv4(),
    '@timestamp': firstTimestamp,
    agent: {
      name: 'agent-12345',
    },
    ...body,
  };
  return doc;
};

export const createAndSyncRuleAndAlertsFactory =
  ({
    supertest,
    log,
    namespace,
  }: {
    supertest: SuperTest.Agent;
    log: ToolingLog;
    namespace?: string;
  }) =>
  async ({
    alerts = 1,
    riskScore = 21,
    maxSignals = 100,
    query,
    riskScoreOverride,
  }: {
    alerts?: number;
    riskScore?: number;
    maxSignals?: number;
    query: string;
    riskScoreOverride?: string;
  }): Promise<void> => {
    const rule = getRuleForAlertTesting(['ecs_compliant']);
    const { id } = await createRule(
      supertest,
      log,
      {
        ...rule,
        risk_score: riskScore,
        query,
        max_signals: maxSignals,
        ...(riskScoreOverride
          ? {
              risk_score_mapping: [
                { field: riskScoreOverride, operator: 'equals', value: '', risk_score: undefined },
              ],
            }
          : {}),
      },
      namespace
    );
    await waitForRuleSuccess({ supertest, log, id, namespace });
    await waitForAlertsToBePresent(supertest, log, alerts, [id], namespace);
  };

export const getLatestRiskScoreIndexMapping: (
  es: Client
) => Promise<MappingTypeMapping | undefined> = async (es: Client) => {
  const riskScoreLatestIndex = 'risk-score.risk-score-latest-default';
  return (
    await es.indices.get({
      index: riskScoreLatestIndex,
    })
  )[riskScoreLatestIndex]?.mappings;
};

export const deleteRiskScoreIndices = async ({
  log,
  es,
  namespace = 'default',
}: {
  log: ToolingLog;
  es: Client;
  namespace?: string;
}) => {
  try {
    await Promise.allSettled([
      es.indices.deleteDataStream({ name: [`risk-score.risk-score-${namespace}`] }),
      es.indices.delete({
        index: [`risk-score.risk-score-latest-${namespace}`],
      }),
    ]);
  } catch (e) {
    log.warning(`Error deleting risk score indices: ${e.message}`);
  }
};

export const areRiskScoreIndicesEmpty = async ({
  es,
  namespace = 'default',
  log,
}: {
  es: Client;
  namespace?: string;
  log: ToolingLog;
}): Promise<boolean> => {
  const riskScoreIndex = `risk-score.risk-score-${namespace}`;
  const riskScoreLatestIndex = `risk-score.risk-score-latest-${namespace}`;
  let riskScoreCount = 0;
  let riskScoreLatestCount = 0;

  try {
    const [riskScoreCountRes, riskScoreLatestCountRes] = await Promise.all([
      es.count({ index: riskScoreIndex }),
      es.count({ index: riskScoreLatestIndex }),
    ]);
    riskScoreCount = riskScoreCountRes.count;
    riskScoreLatestCount = riskScoreLatestCountRes.count;
  } catch (e) {
    if (e.meta.statusCode === 404) {
      return true;
    }
    throw e;
  }

  const isEmpty = riskScoreCount === 0 && riskScoreLatestCount === 0;

  if (!isEmpty) {
    log.warning(
      `Risk score indices are not empty. Risk score index count: ${riskScoreCount}, Risk score latest index count: ${riskScoreLatestCount}`
    );
    const [riskScoreDocs, riskScoreLatestDocs] = await Promise.all([
      es.search({ index: riskScoreIndex, size: 25 }),
      es.search({ index: riskScoreLatestIndex, size: 25 }),
    ]);

    log.info(`Risk score index documents: ${JSON.stringify(riskScoreDocs.hits.hits)}`);
    log.info(`Risk score latest index documents: ${JSON.stringify(riskScoreLatestDocs.hits.hits)}`);
  }

  return isEmpty;
};

/**
 * Deletes all risk scores from a given index or indices, defaults to `risk-score.risk-score-*`
 * For use inside of afterEach blocks of tests
 */
export const deleteAllRiskScores = async (
  log: ToolingLog,
  es: Client,
  index: string[] = ['risk-score.risk-score-default']
): Promise<void> => {
  await countDownTest(
    async () => {
      await es.deleteByQuery({
        index,
        body: {
          query: {
            match_all: {},
          },
        },
        ignore_unavailable: true,
        refresh: true,
      });
      return {
        passed: true,
      };
    },
    'deleteAllRiskScores',
    log
  );
};

/**
 * Function to read risk scores from ES. By default, it reads from the risk
 * score datastream in the default space, but this can be overridden with the
 * `index` parameter.
 *
 * @param {string[]} index - the index or indices to read risk scores from.
 * @param {number} size - the size parameter of the query
 */
export const readRiskScores = async (
  es: Client,
  index: string[] = ['risk-score.risk-score-default'],
  size: number = 1000
): Promise<EcsRiskScore[]> => {
  const results = await es.search({
    index,
    size,
  });
  return results.hits.hits.map((hit) => hit._source as EcsRiskScore);
};

/**
 * Function to read risk scores from ES and wait for them to be
 * present/readable. By default, it reads from the risk score datastream in the
 * default space, but this can be overridden with the `index` parameter.
 *
 * @param {string[]} index - the index or indices to read risk scores from.
 * @param {number} scoreCount - the number of risk scores to wait for. Defaults to 1.
 */
export const waitForRiskScoresToBePresent = async ({
  es,
  log,
  index = ['risk-score.risk-score-default'],
  scoreCount = 1,
}: {
  es: Client;
  log: ToolingLog;
  index?: string[];
  scoreCount?: number;
}): Promise<void> => {
  await waitFor(
    async () => {
      const riskScores = await readRiskScores(es, index, scoreCount + 10);
      return riskScores.length >= scoreCount;
    },
    'waitForRiskScoresToBePresent',
    log
  );
};

export const getRiskEngineTasks = async ({
  es,
  index = ['.kibana_task_manager*'],
}: {
  es: Client;
  index?: string[];
}) => {
  const result = await es.search({
    index,
    query: { match: { 'task.taskType': 'risk_engine:risk_scoring' } },
  });

  return result.hits.hits?.map((hit) => hit._source);
};

export const getRiskEngineTask = async ({
  es,
  index = ['.kibana_task_manager*'],
}: {
  es: Client;
  index?: string[];
}) => {
  const result = await es.search({
    index,
    query: { match: { 'task.taskType': 'risk_engine:risk_scoring' } },
  });

  return result.hits.hits[0]?._source;
};

export const deleteRiskEngineTask = async ({
  es,
  log,
  index = ['.kibana_task_manager*'],
}: {
  es: Client;
  log: ToolingLog;
  index?: string[];
}) => {
  await countDownTest(
    async () => {
      await es.deleteByQuery({
        index,
        query: {
          match: {
            'task.taskType': 'risk_engine:risk_scoring',
          },
        },
        conflicts: 'proceed',
      });
      return {
        passed: true,
      };
    },
    'deleteRiskEngineTask',
    log
  );
};

export const waitForRiskEngineTaskToBeGone = async ({
  es,
  log,
  index = ['.kibana_task_manager*'],
}: {
  es: Client;
  log: ToolingLog;
  index?: string[];
}): Promise<void> => {
  await waitFor(
    async () => {
      const task = await getRiskEngineTask({ es, index });
      return task == null;
    },
    'waitForRiskEngineTaskToBeGone',
    log
  );
};

export const getRiskEngineConfigSO = async ({ kibanaServer }: { kibanaServer: KbnClient }) => {
  const soResponse = await kibanaServer.savedObjects.find({
    type: riskEngineConfigurationTypeName,
  });

  return soResponse?.saved_objects?.[0];
};

export const cleanRiskEngineConfig = async ({
  kibanaServer,
}: {
  kibanaServer: KbnClient;
}): Promise<void> => {
  const so = await getRiskEngineConfigSO({ kibanaServer });
  if (so) {
    await kibanaServer.savedObjects.delete({
      type: riskEngineConfigurationTypeName,
      id: so.id,
    });
  }
};

/**
 * General helper for cleaning up risk engine artifacts. This should be used before and after any risk engine tests so as not to pollute the test environment.
 */
export const cleanRiskEngine = async ({
  es,
  kibanaServer,
  log,
}: {
  es: Client;
  kibanaServer: KbnClient;
  log: ToolingLog;
}): Promise<void> => {
  await deleteRiskEngineTask({ es, log });
  await cleanRiskEngineConfig({ kibanaServer });
  await clearTransforms({ es, log });
  await deleteRiskScoreIndices({ log, es });
};

export const updateRiskEngineConfigSO = async ({
  attributes,
  kibanaServer,
}: {
  attributes: object;
  kibanaServer: KbnClient;
}) => {
  const so = await getRiskEngineConfigSO({ kibanaServer });
  if (so) {
    await kibanaServer.savedObjects.update({
      id: so.id,
      type: riskEngineConfigurationTypeName,
      attributes: {
        ...so.attributes,
        ...attributes,
      },
    });
  } else {
    throw Error('No risk engine config found');
  }
};

export const legacyTransformIds = [
  'ml_hostriskscore_pivot_transform_default',
  'ml_hostriskscore_latest_transform_default',
  'ml_userriskscore_pivot_transform_default',
  'ml_userriskscore_latest_transform_default',
];

export const clearTransforms = async ({
  es,
  log,
}: {
  es: Client;
  log: ToolingLog;
}): Promise<void> => {
  try {
    await es.transform.deleteTransform({
      transform_id: 'risk_score_latest_transform_default',
      force: true,
    });
  } catch (e) {
    log.warning(`Error deleting risk_score_latest_transform_default: ${e.message}`);
  }
};

export const clearLegacyTransforms = async ({
  es,
  log,
}: {
  es: Client;
  log: ToolingLog;
}): Promise<void> => {
  try {
    await removeLegacyTransforms({
      namespace: 'default',
      esClient: es,
    });
  } catch (e) {
    log.warning(`Error deleting legacy transforms: ${e.message}`);
  }
};

export const clearLegacyDashboards = async ({
  supertest,
  log,
}: {
  supertest: SuperTest.Agent;
  log: ToolingLog;
}): Promise<void> => {
  try {
    await supertest
      .post(
        '/internal/risk_score/prebuilt_content/saved_objects/_bulk_delete/hostRiskScoreDashboards'
      )
      .set('kbn-xsrf', 'true')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .send();

    await supertest
      .post(
        '/internal/risk_score/prebuilt_content/saved_objects/_bulk_delete/userRiskScoreDashboards'
      )
      .set('kbn-xsrf', 'true')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .send();
  } catch (e) {
    log.warning(`Error deleting legacy dashboards: ${e.message}`);
  }
};

export const createLegacyTransforms = async ({ es }: { es: Client }): Promise<void> => {
  const transforms = legacyTransformIds.map((transform) =>
    es.transform.putTransform({
      transform_id: transform,
      source: {
        index: ['.alerts-security.alerts-default'],
      },
      dest: {
        index: 'ml_host_risk_score_default',
      },
      pivot: {
        group_by: {
          'host.name': {
            terms: {
              field: 'host.name',
            },
          },
        },
        aggregations: {
          '@timestamp': {
            max: {
              field: '@timestamp',
            },
          },
        },
      },
      settings: {},
    })
  );

  await Promise.all(transforms);
};

export const getLegacyRiskScoreDashboards = async ({
  kibanaServer,
}: {
  kibanaServer: KbnClient;
}) => {
  const savedObejectLens = await kibanaServer.savedObjects.find({
    type: 'lens',
  });

  return savedObejectLens?.saved_objects.filter((s) => s?.attributes?.title?.includes('Risk'));
};

export const riskEngineRouteHelpersFactory = (supertest: SuperTest.Agent, namespace?: string) => ({
  init: async (expectStatusCode: number = 200) =>
    await supertest
      .post(routeWithNamespace(RISK_ENGINE_INIT_URL, namespace))
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', '1')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .send()
      .expect(expectStatusCode),

  getStatus: async (expectStatusCode: number = 200) =>
    await supertest
      .get(routeWithNamespace(RISK_ENGINE_STATUS_URL, namespace))
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', '1')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .send()
      .expect(expectStatusCode),

  enable: async (expectStatusCode: number = 200) =>
    await supertest
      .post(routeWithNamespace(RISK_ENGINE_ENABLE_URL, namespace))
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', '1')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .send()
      .expect(expectStatusCode),

  disable: async (expectStatusCode: number = 200) =>
    await supertest
      .post(routeWithNamespace(RISK_ENGINE_DISABLE_URL, namespace))
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', '1')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .send()
      .expect(expectStatusCode),

  privileges: async (expectStatusCode: number = 200) =>
    await supertest
      .get(RISK_ENGINE_PRIVILEGES_URL)
      .set('elastic-api-version', '1')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .send()
      .expect(expectStatusCode),

  scheduleNow: async (expectStatusCode: number = 200) =>
    await supertest
      .post(routeWithNamespace(RISK_ENGINE_SCHEDULE_NOW_URL, namespace))
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', '2023-10-31')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .send()
      .expect(expectStatusCode),
});

interface Credentials {
  username: string;
  password: string;
}

export const riskEngineRouteHelpersFactoryNoAuth = (
  supertestWithoutAuth: SupertestWithoutAuthProviderType,
  namespace?: string
) => ({
  privilegesForUser: async ({ username, password }: Credentials) =>
    await supertestWithoutAuth
      .get(RISK_ENGINE_PRIVILEGES_URL)
      .auth(username, password)
      .set('elastic-api-version', '1')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .send()
      .expect(200),
  init: async ({ username, password }: Credentials, expectStatusCode: number = 200) =>
    await supertestWithoutAuth
      .post(routeWithNamespace(RISK_ENGINE_INIT_URL, namespace))
      .auth(username, password)
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', '1')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .send()
      .expect(expectStatusCode),
  enable: async ({ username, password }: Credentials, expectStatusCode: number = 200) =>
    await supertestWithoutAuth
      .post(routeWithNamespace(RISK_ENGINE_ENABLE_URL, namespace))
      .auth(username, password)
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', '1')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .send()
      .expect(expectStatusCode),
  disable: async ({ username, password }: Credentials, expectStatusCode: number = 200) =>
    await supertestWithoutAuth
      .post(routeWithNamespace(RISK_ENGINE_DISABLE_URL, namespace))
      .auth(username, password)
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', '1')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .send()
      .expect(expectStatusCode),
});

export const installLegacyRiskScore = async ({ supertest }: { supertest: SuperTest.Agent }) => {
  await supertest
    .post('/internal/risk_score')
    .set('kbn-xsrf', 'true')
    .set(ELASTIC_HTTP_VERSION_HEADER, '1')
    .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
    .send({ riskScoreEntity: 'host' })
    .expect(200);

  await supertest
    .post('/internal/risk_score')
    .set('kbn-xsrf', 'true')
    .set(ELASTIC_HTTP_VERSION_HEADER, '1')
    .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
    .send({ riskScoreEntity: 'user' })
    .expect(200);

  await supertest
    .post(
      '/internal/risk_score/prebuilt_content/saved_objects/_bulk_create/hostRiskScoreDashboards'
    )
    .set('kbn-xsrf', 'true')
    .set(ELASTIC_HTTP_VERSION_HEADER, '1')
    .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
    .send()
    .expect(200);

  await supertest
    .post(
      '/internal/risk_score/prebuilt_content/saved_objects/_bulk_create/userRiskScoreDashboards'
    )
    .set('kbn-xsrf', 'true')
    .set(ELASTIC_HTTP_VERSION_HEADER, '1')
    .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
    .send()
    .expect(200);
};
