/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { v4 as uuidv4 } from 'uuid';
import SuperTest from 'supertest';
import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { EcsRiskScore, RiskScore } from '@kbn/security-solution-plugin/common/risk_engine';
import { riskEngineConfigurationTypeName } from '@kbn/security-solution-plugin/server/lib/risk_engine/saved_object';
import type { KbnClient } from '@kbn/test';
import {
  RISK_ENGINE_INIT_URL,
  RISK_ENGINE_DISABLE_URL,
  RISK_ENGINE_ENABLE_URL,
  RISK_ENGINE_STATUS_URL,
} from '@kbn/security-solution-plugin/common/constants';
import {
  createRule,
  waitForSignalsToBePresent,
  waitForRuleSuccess,
  getRuleForSignalTesting,
  countDownTest,
  waitFor,
  routeWithNamespace,
} from '../../../utils';

const sanitizeScore = (score: Partial<RiskScore>): Partial<RiskScore> => {
  delete score['@timestamp'];
  delete score.inputs;
  delete score.notes;
  // delete score.category_1_score;
  return score;
};

export const sanitizeScores = (scores: Array<Partial<RiskScore>>): Array<Partial<RiskScore>> =>
  scores.map(sanitizeScore);

export const normalizeScores = (scores: Array<Partial<EcsRiskScore>>): Array<Partial<RiskScore>> =>
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
    supertest: SuperTest.SuperTest<SuperTest.Test>;
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
    const rule = getRuleForSignalTesting(['ecs_compliant']);
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
    await waitForSignalsToBePresent(supertest, log, alerts, [id], namespace);
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
    log.error(`Error deleting risk score indices: ${e.message}`);
  }
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
    log.error(`Error deleting risk_score_latest_transform_default: ${e.message}`);
  }
};

export const clearLegacyTransforms = async ({
  es,
  log,
}: {
  es: Client;
  log: ToolingLog;
}): Promise<void> => {
  const transforms = legacyTransformIds.map((transform) =>
    es.transform.deleteTransform({
      transform_id: transform,
      force: true,
    })
  );
  try {
    await Promise.all(transforms);
  } catch (e) {
    log.error(`Error deleting legacy transforms: ${e.message}`);
  }
};

export const clearLegacyDashboards = async ({
  supertest,
  log,
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  log: ToolingLog;
}): Promise<void> => {
  try {
    await supertest
      .post(
        '/internal/risk_score/prebuilt_content/saved_objects/_bulk_delete/hostRiskScoreDashboards'
      )
      .set('kbn-xsrf', 'true')
      .send()
      .expect(200);

    await supertest
      .post(
        '/internal/risk_score/prebuilt_content/saved_objects/_bulk_delete/userRiskScoreDashboards'
      )
      .set('kbn-xsrf', 'true')
      .send()
      .expect(200);
  } catch (e) {
    log.error(`Error deleting legacy dashboards: ${e.message}`);
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

export const riskEngineRouteHelpersFactory = (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  namespace?: string
) => ({
  init: async () =>
    await supertest
      .post(routeWithNamespace(RISK_ENGINE_INIT_URL, namespace))
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', '1')
      .send()
      .expect(200),

  getStatus: async () =>
    await supertest
      .get(routeWithNamespace(RISK_ENGINE_STATUS_URL, namespace))
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', '1')
      .send()
      .expect(200),

  enable: async () =>
    await supertest
      .post(routeWithNamespace(RISK_ENGINE_ENABLE_URL, namespace))
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', '1')
      .send()
      .expect(200),

  disable: async () =>
    await supertest
      .post(routeWithNamespace(RISK_ENGINE_DISABLE_URL, namespace))
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', '1')
      .send()
      .expect(200),
});

export const installLegacyRiskScore = async ({
  supertest,
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
}) => {
  await supertest
    .post('/internal/risk_score')
    .set('kbn-xsrf', 'true')
    .set(ELASTIC_HTTP_VERSION_HEADER, '1')
    .send({ riskScoreEntity: 'host' })
    .expect(200);

  await supertest
    .post('/internal/risk_score')
    .set('kbn-xsrf', 'true')
    .set(ELASTIC_HTTP_VERSION_HEADER, '1')
    .send({ riskScoreEntity: 'user' })
    .expect(200);

  await supertest
    .post(
      '/internal/risk_score/prebuilt_content/saved_objects/_bulk_create/hostRiskScoreDashboards'
    )
    .set('kbn-xsrf', 'true')
    .set(ELASTIC_HTTP_VERSION_HEADER, '1')
    .send()
    .expect(200);

  await supertest
    .post(
      '/internal/risk_score/prebuilt_content/saved_objects/_bulk_create/userRiskScoreDashboards'
    )
    .set('kbn-xsrf', 'true')
    .set(ELASTIC_HTTP_VERSION_HEADER, '1')
    .send()
    .expect(200);
};
