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
import type { RiskScore } from '@kbn/security-solution-plugin/server/lib/risk_engine/types';

import {
  createRule,
  waitForSignalsToBePresent,
  waitForRuleSuccess,
  getRuleForSignalTesting,
  countDownTest,
  waitFor,
} from '../../../utils';

export const sanitizeScores = (scores: Array<Partial<RiskScore>>): Array<Partial<RiskScore>> =>
  scores.map((item) => {
    delete item['@timestamp'];
    delete item.riskiestInputs;
    delete item.notes;
    delete item.alertsScore;
    delete item.otherScore;
    return item;
  });

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
): Promise<RiskScore[]> => {
  const results = await es.search({
    index: 'risk-score.risk-score-default',
  });
  return results.hits.hits.map((hit) => hit._source as RiskScore);
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
