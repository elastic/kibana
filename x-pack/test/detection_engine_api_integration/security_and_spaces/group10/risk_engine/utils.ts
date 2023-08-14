/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type SuperTest from 'supertest';
import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { EcsRiskScore, RiskScore } from '@kbn/security-solution-plugin/common/risk_engine';
import { riskEngineConfigurationTypeName } from '@kbn/security-solution-plugin/server/lib/risk_engine/saved_object';
import type { KbnClient } from '@kbn/test';
import {
  createRule,
  waitForSignalsToBePresent,
  waitForRuleSuccess,
  getRuleForSignalTesting,
  countDownTest,
  waitFor,
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
  ({ supertest, log }: { supertest: SuperTest.SuperTest<SuperTest.Test>; log: ToolingLog }) =>
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
    const { id } = await createRule(supertest, log, {
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
    });
    await waitForRuleSuccess({ supertest, log, id });
    await waitForSignalsToBePresent(supertest, log, alerts, [id]);
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

export const readRiskScores = async (
  es: Client,
  index: string[] = ['risk-score.risk-score-default']
): Promise<EcsRiskScore[]> => {
  const results = await es.search({
    index: 'risk-score.risk-score-default',
  });
  return results.hits.hits.map((hit) => hit._source as EcsRiskScore);
};

export const waitForRiskScoresToBePresent = async (
  es: Client,
  log: ToolingLog,
  index: string[] = ['risk-score.risk-score-default']
): Promise<void> => {
  await waitFor(
    async () => {
      const riskScores = await readRiskScores(es, index);
      return riskScores.length > 0;
    },
    'waitForRiskScoresToBePresent',
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

export const createTransforms = async ({ es }: { es: Client }): Promise<void> => {
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
