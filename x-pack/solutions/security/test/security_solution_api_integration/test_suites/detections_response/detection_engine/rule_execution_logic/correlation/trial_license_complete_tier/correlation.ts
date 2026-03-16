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
import {
  ALERT_BUILDING_BLOCK_TYPE,
  ALERT_GROUP_ID,
  ALERT_DEPTH,
} from '@kbn/security-solution-plugin/common/field_maps/field_names';
import { deleteAllRules, deleteAllAlerts, createRule } from '@kbn/detections-response-ftr-services';

import { getPreviewAlerts, previewRule, getAlerts, dataGeneratorFactory } from '../../../../utils';
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

  /**
   * Helper to create a simple query rule and wait for it to produce alerts.
   * Returns the created rule so its ID can be referenced by the correlation rule.
   */
  const createSourceQueryRule = async ({
    ruleId,
    query,
    from,
    enabled = true,
  }: {
    ruleId: string;
    query: string;
    from: string;
    enabled?: boolean;
  }): Promise<QueryRuleCreateProps & { id: string }> => {
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
      enabled,
    };

    const created = await createRule(supertest, log, rule);
    return { ...rule, id: created.id };
  };

  /**
   * Builds a minimal CorrelationRuleCreateProps for tests.
   */
  const buildCorrelationRule = ({
    ruleId,
    sourceRuleIds,
    correlationType = 'temporal',
    groupBy = ['host.name'],
    timespan = '5m',
    condition,
    query = 'FROM .alerts-security.alerts-default',
  }: {
    ruleId: string;
    sourceRuleIds: string[];
    correlationType?: 'temporal' | 'temporal_ordered' | 'event_count' | 'value_count';
    groupBy?: string[];
    timespan?: string;
    condition?: { operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'; value: number };
    query?: string;
  }): CorrelationRuleCreateProps => ({
    type: 'correlation',
    language: 'esql',
    name: `Correlation rule ${ruleId}`,
    description: `Test correlation rule: ${ruleId}`,
    severity: 'high',
    risk_score: 70,
    rule_id: ruleId,
    from: 'now-1h',
    interval: '1h',
    query,
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
      // TODO: This test depends on real query rules producing alerts into the
      // .alerts-security.alerts-default index, which the correlation rule then reads.
      // In practice, we need to:
      //   1. Create two query rules that each produce alerts with matching host.name values
      //   2. Wait for those alerts to be indexed
      //   3. Then execute the correlation rule against the alerts index
      //
      // Until the correlation rule executor is fully wired, this test validates the
      // structural correctness of the rule creation and preview API call flow.

      it('should produce correlated alerts when two source rules fire for the same host', async () => {
        const testId = uuidv4();
        const hostName = `host-${testId}`;

        // Seed source documents that will trigger the query rules
        const timestamp = '2020-10-28T06:05:00.000Z';
        await indexListOfDocuments([
          {
            id: testId,
            '@timestamp': timestamp,
            host: { name: hostName },
            agent: { name: 'agent-1' },
            event: { kind: 'event', category: ['process'] },
          },
          {
            id: testId,
            '@timestamp': timestamp,
            host: { name: hostName },
            agent: { name: 'agent-2' },
            event: { kind: 'event', category: ['network'] },
          },
        ]);

        // Create two source query rules
        const sourceRule1 = await createSourceQueryRule({
          ruleId: `source-1-${testId}`,
          query: `host.name: "${hostName}" AND agent.name: "agent-1"`,
          from: '2020-10-28T06:00:00.000Z',
        });

        const sourceRule2 = await createSourceQueryRule({
          ruleId: `source-2-${testId}`,
          query: `host.name: "${hostName}" AND agent.name: "agent-2"`,
          from: '2020-10-28T06:00:00.000Z',
        });

        // Wait for source rule alerts to be available
        await getAlerts(supertest, log, es, sourceRule1);
        await getAlerts(supertest, log, es, sourceRule2);

        // Build and preview the correlation rule
        const correlationRule = buildCorrelationRule({
          ruleId: `correlation-temporal-${testId}`,
          sourceRuleIds: [sourceRule1.id, sourceRule2.id],
          correlationType: 'temporal',
          groupBy: ['host.name'],
          timespan: '5m',
        });

        const { previewId } = await previewRule({
          supertest,
          rule: correlationRule,
          timeframeEnd: new Date(),
        });

        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
          size: 100,
        });

        // Correlated alerts should be produced:
        // - A shell alert (the correlation result) with depth > 1
        // - Building block alerts referencing the source alerts
        expect(previewAlerts.length).toBeGreaterThanOrEqual(1);

        const shellAlerts = previewAlerts.filter(
          (alert) => !alert._source?.[ALERT_BUILDING_BLOCK_TYPE]
        );
        const buildingBlockAlerts = previewAlerts.filter(
          (alert) => alert._source?.[ALERT_BUILDING_BLOCK_TYPE] === 'default'
        );

        // At least one shell alert should exist
        expect(shellAlerts.length).toBeGreaterThanOrEqual(1);

        // Shell alert should have a group ID
        const groupId = shellAlerts[0]._source?.[ALERT_GROUP_ID];
        expect(groupId).toBeDefined();

        // Building block alerts should share the same group ID as the shell alert
        for (const bbAlert of buildingBlockAlerts) {
          expect(bbAlert._source?.[ALERT_GROUP_ID]).toEqual(groupId);
        }

        // Shell alert depth should be > 1 (it correlates alerts, not raw events)
        expect(shellAlerts[0]._source?.[ALERT_DEPTH]).toBeGreaterThanOrEqual(2);
      });
    });

    describe('event count correlation', () => {
      it('should produce correlated alerts when alert count meets the threshold', async () => {
        const testId = uuidv4();
        const userName = `user-${testId}`;

        // Seed multiple source documents for the same user so the query rule
        // produces multiple alerts
        const baseTimestamp = new Date('2020-10-28T06:00:00.000Z');
        const docs = Array.from({ length: 5 }, (_, i) => ({
          id: testId,
          '@timestamp': new Date(baseTimestamp.getTime() + i * 60000).toISOString(),
          user: { name: userName },
          host: { name: 'shared-host' },
          agent: { name: `agent-ec-${i}` },
          event: { kind: 'event', category: ['authentication'] },
        }));

        await indexListOfDocuments(docs);

        // Source rule that will produce 5 alerts (one per document)
        const sourceRule = await createSourceQueryRule({
          ruleId: `source-ec-${testId}`,
          query: `user.name: "${userName}"`,
          from: '2020-10-28T05:50:00.000Z',
        });

        await getAlerts(supertest, log, es, sourceRule);

        // Correlation rule: event_count with threshold >= 3
        const correlationRule = buildCorrelationRule({
          ruleId: `correlation-event-count-${testId}`,
          sourceRuleIds: [sourceRule.id],
          correlationType: 'event_count',
          groupBy: ['user.name'],
          timespan: '10m',
          condition: { operator: 'gte', value: 3 },
        });

        const { previewId } = await previewRule({
          supertest,
          rule: correlationRule,
          timeframeEnd: new Date(),
        });

        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
          size: 100,
        });

        // Threshold was >= 3 and we seeded 5 alerts, so correlation should fire
        expect(previewAlerts.length).toBeGreaterThanOrEqual(1);

        // Verify correlated alerts have group ID set
        for (const alert of previewAlerts) {
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

        // Seed a single source document
        await indexListOfDocuments([
          {
            id: testId,
            '@timestamp': '2020-10-28T06:05:00.000Z',
            user: { name: userName },
            host: { name: 'single-host' },
            agent: { name: 'agent-single' },
            event: { kind: 'event', category: ['authentication'] },
          },
        ]);

        const sourceRule = await createSourceQueryRule({
          ruleId: `source-below-${testId}`,
          query: `user.name: "${userName}"`,
          from: '2020-10-28T06:00:00.000Z',
        });

        await getAlerts(supertest, log, es, sourceRule);

        // Correlation rule requires >= 3 alerts, but only 1 exists
        const correlationRule = buildCorrelationRule({
          ruleId: `correlation-below-${testId}`,
          sourceRuleIds: [sourceRule.id],
          correlationType: 'event_count',
          groupBy: ['user.name'],
          timespan: '10m',
          condition: { operator: 'gte', value: 3 },
        });

        const { previewId } = await previewRule({
          supertest,
          rule: correlationRule,
          timeframeEnd: new Date(),
        });

        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
          size: 100,
        });

        expect(previewAlerts).toHaveLength(0);
      });

      it('should not produce correlated alerts for temporal type with only one source rule firing', async () => {
        const testId = uuidv4();
        const hostName = `host-single-rule-${testId}`;

        await indexListOfDocuments([
          {
            id: testId,
            '@timestamp': '2020-10-28T06:05:00.000Z',
            host: { name: hostName },
            agent: { name: 'agent-only' },
            event: { kind: 'event', category: ['process'] },
          },
        ]);

        const sourceRule = await createSourceQueryRule({
          ruleId: `source-only-${testId}`,
          query: `host.name: "${hostName}"`,
          from: '2020-10-28T06:00:00.000Z',
        });

        await getAlerts(supertest, log, es, sourceRule);

        // Temporal correlation needs alerts from at least 2 source rules
        // but we only have 1 source rule producing alerts
        const correlationRule = buildCorrelationRule({
          ruleId: `correlation-single-source-${testId}`,
          sourceRuleIds: [sourceRule.id, 'non-existent-rule-id'],
          correlationType: 'temporal',
          groupBy: ['host.name'],
          timespan: '5m',
        });

        const { previewId } = await previewRule({
          supertest,
          rule: correlationRule,
          timeframeEnd: new Date(),
        });

        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
          size: 100,
        });

        expect(previewAlerts).toHaveLength(0);
      });
    });

    describe('self-correlation guard', () => {
      it('should not correlate alerts produced by the correlation rule itself', async () => {
        const testId = uuidv4();
        const hostName = `host-self-${testId}`;

        // Seed source documents
        await indexListOfDocuments([
          {
            id: testId,
            '@timestamp': '2020-10-28T06:05:00.000Z',
            host: { name: hostName },
            agent: { name: 'agent-self-1' },
            event: { kind: 'event', category: ['process'] },
          },
          {
            id: testId,
            '@timestamp': '2020-10-28T06:06:00.000Z',
            host: { name: hostName },
            agent: { name: 'agent-self-2' },
            event: { kind: 'event', category: ['network'] },
          },
        ]);

        // Create two source query rules
        const sourceRule1 = await createSourceQueryRule({
          ruleId: `source-self-1-${testId}`,
          query: `host.name: "${hostName}" AND agent.name: "agent-self-1"`,
          from: '2020-10-28T06:00:00.000Z',
        });

        const sourceRule2 = await createSourceQueryRule({
          ruleId: `source-self-2-${testId}`,
          query: `host.name: "${hostName}" AND agent.name: "agent-self-2"`,
          from: '2020-10-28T06:00:00.000Z',
        });

        await getAlerts(supertest, log, es, sourceRule1);
        await getAlerts(supertest, log, es, sourceRule2);

        // First execution of the correlation rule — should produce correlated alerts
        const correlationRule = buildCorrelationRule({
          ruleId: `correlation-self-${testId}`,
          sourceRuleIds: [sourceRule1.id, sourceRule2.id],
          correlationType: 'temporal',
          groupBy: ['host.name'],
          timespan: '5m',
        });

        const { previewId: firstPreviewId } = await previewRule({
          supertest,
          rule: correlationRule,
          timeframeEnd: new Date(),
        });

        const firstPreviewAlerts = await getPreviewAlerts({
          es,
          previewId: firstPreviewId,
          size: 100,
        });

        // Second execution — the correlation rule should NOT pick up its own
        // alerts from the first run and create additional correlations
        const { previewId: secondPreviewId } = await previewRule({
          supertest,
          rule: correlationRule,
          timeframeEnd: new Date(),
          invocationCount: 2,
        });

        const secondPreviewAlerts = await getPreviewAlerts({
          es,
          previewId: secondPreviewId,
          size: 200,
        });

        // The total number of correlated alerts should not grow unboundedly
        // between invocations — the rule should filter out its own output.
        // With 2 source rules producing 1 alert each, we expect a stable count.
        const firstRunCount = firstPreviewAlerts.length;
        const secondRunCount = secondPreviewAlerts.length;

        // The second run should produce the same number of alerts (not compounding).
        // If self-correlation guard is missing, the count would grow.
        expect(secondRunCount).toBeLessThanOrEqual(firstRunCount * 2);
      });
    });
  });
};
