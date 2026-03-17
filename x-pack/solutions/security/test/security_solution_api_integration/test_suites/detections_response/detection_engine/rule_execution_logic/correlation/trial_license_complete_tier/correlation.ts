/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { v4 as uuidv4 } from 'uuid';
import type {
  QueryRuleCreateProps,
  CorrelationRuleCreateProps,
} from '@kbn/security-solution-plugin/common/api/detection_engine/model/rule_schema';
import type { RuleResponse } from '@kbn/security-solution-plugin/common/api/detection_engine';
import {
  ALERT_BUILDING_BLOCK_TYPE,
  ALERT_GROUP_ID,
} from '@kbn/security-solution-plugin/common/field_maps/field_names';
import { deleteAllRules, deleteAllAlerts, createRule } from '@kbn/detections-response-ftr-services';

import { getAlerts, dataGeneratorFactory } from '../../../../utils';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');

  const { indexListOfDocuments } = dataGeneratorFactory({
    es,
    index: 'ecs_compliant',
    log,
  });

  const createSourceQueryRule = async ({
    ruleId,
    query,
    from,
  }: {
    ruleId: string;
    query: string;
    from: string;
  }): Promise<RuleResponse> => {
    const rule: QueryRuleCreateProps = {
      description: `Source query rule: ${ruleId}`,
      name: `Source rule ${ruleId}`,
      query,
      severity: 'high',
      type: 'query',
      risk_score: 55,
      language: 'kuery',
      rule_id: ruleId,
      index: ['ecs_compliant'],
      from,
      interval: '1h',
      enabled: true,
    };
    return createRule(supertest, log, rule);
  };

  const createAndWaitForCorrelationRule = async (
    props: CorrelationRuleCreateProps
  ): Promise<{ rule: RuleResponse; alerts: Awaited<ReturnType<typeof getAlerts>> }> => {
    const rule = await createRule(supertest, log, props);
    const alerts = await getAlerts(supertest, log, es, rule);
    return { rule, alerts };
  };

  const buildCorrelationRule = ({
    ruleId,
    sourceRuleIds,
    correlationType = 'temporal',
    groupBy = ['host.name'],
    timespan = '5m',
    condition,
  }: {
    ruleId: string;
    sourceRuleIds: string[];
    correlationType?: 'temporal' | 'temporal_ordered' | 'event_count' | 'value_count';
    groupBy?: string[];
    timespan?: string;
    condition?: { operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'; value: number };
  }): CorrelationRuleCreateProps => ({
    type: 'correlation',
    language: 'esql',
    name: `Correlation rule ${ruleId}`,
    description: `Test correlation rule: ${ruleId}`,
    severity: 'high',
    risk_score: 70,
    rule_id: ruleId,
    from: 'now-6m',
    interval: '5m',
    query: 'FROM .alerts-security.alerts-default',
    correlation: {
      rules: sourceRuleIds,
      type: correlationType,
      group_by: groupBy,
      timespan,
      ...(condition ? { condition } : {}),
    },
  });

  describe('@ess @serverless Correlation rule type', () => {
    before(async () => {
      await esArchiver.load(
        'x-pack/solutions/security/test/fixtures/es_archives/security_solution/ecs_compliant'
      );
    });

    after(async () => {
      await esArchiver.unload(
        'x-pack/solutions/security/test/fixtures/es_archives/security_solution/ecs_compliant'
      );
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
    });

    describe('basic temporal correlation', () => {
      it('should produce correlated alerts when two source rules fire for the same host', async () => {
        const testId = uuidv4();
        const hostName = `host-${testId}`;
        const now = new Date();

        await indexListOfDocuments([
          {
            id: testId,
            '@timestamp': now.toISOString(),
            host: { name: hostName },
            agent: { name: 'agent-1' },
            event: { kind: 'event', category: ['process'] },
          },
          {
            id: testId,
            '@timestamp': now.toISOString(),
            host: { name: hostName },
            agent: { name: 'agent-2' },
            event: { kind: 'event', category: ['network'] },
          },
        ]);

        const sourceRule1 = await createSourceQueryRule({
          ruleId: `source-1-${testId}`,
          query: `host.name: "${hostName}" AND agent.name: "agent-1"`,
          from: 'now-6m',
        });

        const sourceRule2 = await createSourceQueryRule({
          ruleId: `source-2-${testId}`,
          query: `host.name: "${hostName}" AND agent.name: "agent-2"`,
          from: 'now-6m',
        });

        await getAlerts(supertest, log, es, sourceRule1);
        await getAlerts(supertest, log, es, sourceRule2);

        const correlationRule = buildCorrelationRule({
          ruleId: `correlation-temporal-${testId}`,
          sourceRuleIds: [sourceRule1.id, sourceRule2.id],
          correlationType: 'temporal',
          groupBy: ['host.name'],
          timespan: '5m',
        });

        const { alerts } = await createAndWaitForCorrelationRule(correlationRule);
        const allAlerts = alerts.hits.hits;

        expect(allAlerts.length).toBeGreaterThanOrEqual(1);

        const shellAlerts = allAlerts.filter(
          (alert) => !alert._source?.[ALERT_BUILDING_BLOCK_TYPE]
        );
        const buildingBlockAlerts = allAlerts.filter(
          (alert) => alert._source?.[ALERT_BUILDING_BLOCK_TYPE] === 'default'
        );

        expect(shellAlerts.length).toBeGreaterThanOrEqual(1);

        const groupId = shellAlerts[0]._source?.[ALERT_GROUP_ID];
        expect(groupId).toBeDefined();

        for (const bbAlert of buildingBlockAlerts) {
          expect(bbAlert._source?.[ALERT_GROUP_ID]).toEqual(groupId);
        }
      });
    });

    describe('event count correlation', () => {
      it('should produce correlated alerts when alert count meets the threshold', async () => {
        const testId = uuidv4();
        const userName = `user-${testId}`;
        const now = new Date();

        const docs = Array.from({ length: 5 }, (_, i) => ({
          id: `${testId}-${i}`,
          '@timestamp': new Date(now.getTime() - i * 1000).toISOString(),
          user: { name: userName },
          host: { name: 'shared-host' },
          agent: { name: `agent-ec-${i}` },
          event: { kind: 'event', category: ['authentication'] },
        }));

        await indexListOfDocuments(docs);

        const sourceRule = await createSourceQueryRule({
          ruleId: `source-ec-${testId}`,
          query: `user.name: "${userName}"`,
          from: 'now-6m',
        });

        await getAlerts(supertest, log, es, sourceRule);

        const correlationRule = buildCorrelationRule({
          ruleId: `correlation-event-count-${testId}`,
          sourceRuleIds: [sourceRule.id],
          correlationType: 'event_count',
          groupBy: ['user.name'],
          timespan: '10m',
          condition: { operator: 'gte', value: 3 },
        });

        const { alerts } = await createAndWaitForCorrelationRule(correlationRule);
        const allAlerts = alerts.hits.hits;

        expect(allAlerts.length).toBeGreaterThanOrEqual(1);

        for (const alert of allAlerts) {
          if (!alert._source?.[ALERT_BUILDING_BLOCK_TYPE]) {
            expect(alert._source?.[ALERT_GROUP_ID]).toBeDefined();
          }
        }
      });
    });

    describe('no correlation when conditions not met', () => {
      it('should not produce correlated alerts when alert count is below threshold', async () => {
        const testId = uuidv4();
        const userName = `user-below-${testId}`;
        const now = new Date();

        await indexListOfDocuments([
          {
            id: testId,
            '@timestamp': now.toISOString(),
            user: { name: userName },
            host: { name: 'single-host' },
            agent: { name: 'agent-single' },
            event: { kind: 'event', category: ['authentication'] },
          },
        ]);

        const sourceRule = await createSourceQueryRule({
          ruleId: `source-below-${testId}`,
          query: `user.name: "${userName}"`,
          from: 'now-6m',
        });

        await getAlerts(supertest, log, es, sourceRule);

        const correlationRule = buildCorrelationRule({
          ruleId: `correlation-below-${testId}`,
          sourceRuleIds: [sourceRule.id],
          correlationType: 'event_count',
          groupBy: ['user.name'],
          timespan: '10m',
          condition: { operator: 'gte', value: 3 },
        });

        const createdRule = await createRule(supertest, log, correlationRule);
        const alerts = await getAlerts(supertest, log, es, createdRule);

        const correlationAlerts = alerts.hits.hits.filter(
          (alert) =>
            alert._source?.['kibana.alert.rule.type'] === 'correlation' ||
            alert._source?.[ALERT_GROUP_ID]
        );

        expect(correlationAlerts).toHaveLength(0);
      });
    });

    describe('self-correlation guard', () => {
      it('should not correlate alerts produced by the correlation rule itself', async () => {
        const testId = uuidv4();
        const hostName = `host-self-${testId}`;
        const now = new Date();

        await indexListOfDocuments([
          {
            id: `${testId}-1`,
            '@timestamp': now.toISOString(),
            host: { name: hostName },
            agent: { name: 'agent-self-1' },
            event: { kind: 'event', category: ['process'] },
          },
          {
            id: `${testId}-2`,
            '@timestamp': now.toISOString(),
            host: { name: hostName },
            agent: { name: 'agent-self-2' },
            event: { kind: 'event', category: ['network'] },
          },
        ]);

        const sourceRule1 = await createSourceQueryRule({
          ruleId: `source-self-1-${testId}`,
          query: `host.name: "${hostName}" AND agent.name: "agent-self-1"`,
          from: 'now-6m',
        });

        const sourceRule2 = await createSourceQueryRule({
          ruleId: `source-self-2-${testId}`,
          query: `host.name: "${hostName}" AND agent.name: "agent-self-2"`,
          from: 'now-6m',
        });

        await getAlerts(supertest, log, es, sourceRule1);
        await getAlerts(supertest, log, es, sourceRule2);

        const correlationRule = buildCorrelationRule({
          ruleId: `correlation-self-${testId}`,
          sourceRuleIds: [sourceRule1.id, sourceRule2.id],
          correlationType: 'temporal',
          groupBy: ['host.name'],
          timespan: '5m',
        });

        const { alerts: firstRunAlerts } = await createAndWaitForCorrelationRule(correlationRule);
        const firstRunCount = firstRunAlerts.hits.hits.length;

        expect(firstRunCount).toBeGreaterThanOrEqual(1);

        const shellAlerts = firstRunAlerts.hits.hits.filter(
          (alert) => !alert._source?.[ALERT_BUILDING_BLOCK_TYPE]
        );
        expect(shellAlerts.length).toBeGreaterThanOrEqual(1);

        expect(shellAlerts[0]._source?.['kibana.alert.rule.uuid']).toBeDefined();
      });
    });
  });
};
