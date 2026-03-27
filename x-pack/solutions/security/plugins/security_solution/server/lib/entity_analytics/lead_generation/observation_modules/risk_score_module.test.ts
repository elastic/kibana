/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createRiskScoreModule } from './risk_score_module';
import type { LeadEntity } from '../types';

const createEntityWithRisk = (
  type: string,
  name: string,
  scoreNorm: number,
  level: string,
  privileged = false
): LeadEntity => ({
  record: {
    entity: {
      id: `euid-${name}`,
      name,
      type,
      risk: { calculated_score_norm: scoreNorm, calculated_level: level },
      attributes: { privileged },
    },
  } as never,
  type,
  name,
  id: `euid-${name}`,
});

describe('RiskScoreModule', () => {
  const logger = loggingSystemMock.createLogger();
  const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
  const spaceId = 'default';

  beforeEach(() => {
    jest.clearAllMocks();
    esClient.search.mockResolvedValue({
      hits: { hits: [] },
      aggregations: {},
    } as never);
  });

  it('is always enabled', () => {
    const module = createRiskScoreModule({ esClient, logger, spaceId });
    expect(module.isEnabled()).toBe(true);
  });

  describe('current risk level observations', () => {
    it('produces a critical observation for Critical calculated_level', async () => {
      const entity = createEntityWithRisk('user', 'alice', 95, 'Critical');
      const module = createRiskScoreModule({ esClient, logger, spaceId });

      const observations = await module.collect([entity]);

      const riskObs = observations.find((o) => o.type === 'high_risk_score');
      expect(riskObs).toBeDefined();
      expect(riskObs!.severity).toBe('critical');
      expect(riskObs!.score).toBe(95);
    });

    it('produces a high observation for High calculated_level', async () => {
      const entity = createEntityWithRisk('user', 'bob', 75, 'High');
      const module = createRiskScoreModule({ esClient, logger, spaceId });

      const observations = await module.collect([entity]);

      const riskObs = observations.find((o) => o.type === 'high_risk_score');
      expect(riskObs).toBeDefined();
      expect(riskObs!.severity).toBe('high');
    });

    it('produces a medium observation for Moderate calculated_level', async () => {
      const entity = createEntityWithRisk('host', 'server-01', 55, 'Moderate');
      const module = createRiskScoreModule({ esClient, logger, spaceId });

      const observations = await module.collect([entity]);

      const riskObs = observations.find((o) => o.type === 'moderate_risk_score');
      expect(riskObs).toBeDefined();
      expect(riskObs!.severity).toBe('medium');
    });

    it('does not produce a risk level observation for Low calculated_level', async () => {
      const entity = createEntityWithRisk('user', 'charlie', 25, 'Low');
      const module = createRiskScoreModule({ esClient, logger, spaceId });

      const observations = await module.collect([entity]);

      const riskObs = observations.filter(
        (o) =>
          o.type === 'high_risk_score' ||
          o.type === 'moderate_risk_score' ||
          o.type === 'low_risk_score'
      );
      expect(riskObs).toHaveLength(0);
    });

    it('does not produce a risk level observation for Unknown calculated_level', async () => {
      const entity = createEntityWithRisk('user', 'dave', 10, 'Unknown');
      const module = createRiskScoreModule({ esClient, logger, spaceId });

      const observations = await module.collect([entity]);

      const riskObs = observations.filter(
        (o) =>
          o.type === 'high_risk_score' ||
          o.type === 'moderate_risk_score' ||
          o.type === 'low_risk_score'
      );
      expect(riskObs).toHaveLength(0);
    });
  });

  describe('privileged entity observations', () => {
    it('produces a privileged_high_risk observation for privileged entity with score >= 70', async () => {
      const entity = createEntityWithRisk('user', 'admin', 85, 'High', true);
      const module = createRiskScoreModule({ esClient, logger, spaceId });

      const observations = await module.collect([entity]);

      const privObs = observations.find((o) => o.type === 'privileged_high_risk');
      expect(privObs).toBeDefined();
      expect(privObs!.severity).toBe('critical');
      expect(privObs!.metadata.is_privileged).toBe(true);
    });

    it('does not produce privileged_high_risk for non-privileged entity', async () => {
      const entity = createEntityWithRisk('user', 'regular', 85, 'High', false);
      const module = createRiskScoreModule({ esClient, logger, spaceId });

      const observations = await module.collect([entity]);

      expect(observations.find((o) => o.type === 'privileged_high_risk')).toBeUndefined();
    });

    it('does not produce privileged_high_risk for privileged entity with low score', async () => {
      const entity = createEntityWithRisk('user', 'admin', 50, 'Moderate', true);
      const module = createRiskScoreModule({ esClient, logger, spaceId });

      const observations = await module.collect([entity]);

      expect(observations.find((o) => o.type === 'privileged_high_risk')).toBeUndefined();
    });
  });

  describe('risk escalation observations', () => {
    it('detects a 24h escalation when delta >= 10', async () => {
      const entity = createEntityWithRisk('user', 'alice', 80, 'High');
      esClient.search.mockResolvedValue({
        hits: { hits: [] },
        aggregations: {
          by_entity: {
            buckets: [
              {
                key: 'alice',
                scores_over_time: {
                  buckets: [{ avg_score: { value: 65 } }],
                },
              },
            ],
          },
        },
      } as never);

      const module = createRiskScoreModule({ esClient, logger, spaceId });
      const observations = await module.collect([entity]);

      const esc = observations.find((o) => o.type === 'risk_escalation_24h');
      expect(esc).toBeDefined();
      expect(esc!.metadata.delta).toBe(15);
    });

    it('does not produce escalation when history is insufficient', async () => {
      const entity = createEntityWithRisk('user', 'alice', 80, 'High');
      esClient.search.mockResolvedValue({
        hits: { hits: [] },
        aggregations: { by_entity: { buckets: [] } },
      } as never);

      const module = createRiskScoreModule({ esClient, logger, spaceId });
      const observations = await module.collect([entity]);

      const escalations = observations.filter((o) => o.type.startsWith('risk_escalation'));
      expect(escalations).toHaveLength(0);
    });
  });

  it('skips entities without risk data', async () => {
    const entity: LeadEntity = {
      record: { entity: { id: 'euid-no-risk', name: 'no-risk', type: 'user' } } as never,
      type: 'user',
      name: 'no-risk',
      id: 'euid-no-risk',
    };
    const module = createRiskScoreModule({ esClient, logger, spaceId });

    const observations = await module.collect([entity]);

    expect(observations).toHaveLength(0);
  });
});
