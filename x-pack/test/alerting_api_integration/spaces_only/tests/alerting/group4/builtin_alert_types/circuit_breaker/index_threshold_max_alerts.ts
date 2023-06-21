/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { ESTestIndexTool, ES_TEST_INDEX_NAME } from '@kbn/alerting-api-integration-helpers';
import { Spaces } from '../../../../../scenarios';
import { FtrProviderContext } from '../../../../../../common/ftr_provider_context';
import { getUrlPrefix, ObjectRemover, getEventLog } from '../../../../../../common/lib';
import { createEsDocumentsWithGroups } from '../../../create_test_data';

const RULE_INTERVAL_SECONDS = 6;
const RULE_INTERVALS_TO_WRITE = 1;
const RULE_INTERVAL_MILLIS = RULE_INTERVAL_SECONDS * 1000;

// eslint-disable-next-line import/no-default-export
export default function maxAlertsRuleTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');
  const es = getService('es');
  const esTestIndexTool = new ESTestIndexTool(es, retry);

  describe('index threshold rule that hits max alerts circuit breaker', () => {
    const objectRemover = new ObjectRemover(supertest);

    beforeEach(async () => {
      await esTestIndexTool.destroy();

      await esTestIndexTool.setup();
    });

    afterEach(async () => {
      await objectRemover.removeAll();
      await esTestIndexTool.destroy();
    });

    it('persist existing alerts to next execution if circuit breaker is hit', async () => {
      // write some documents in groups 0, 1, 2, 3, 4
      await createEsDocumentsInGroups(5, getEndDate());

      // create a rule that will always fire for each group
      const ruleId = await createIndexThresholdRule({
        name: 'always fire',
        aggType: 'max',
        aggField: 'testedValue',
        groupBy: 'top',
        termField: 'group',
        termSize: 50,
        thresholdComparator: '>=',
        threshold: [0],
      });

      // make sure rule executes once before adding more documents
      await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId: Spaces.space1.id,
          type: 'alert',
          id: ruleId,
          provider: 'alerting',
          actions: new Map([['execute', { gte: 1 }]]),
        });
      });

      // circuit breaker value is 20 so write some more docs for 20+ groups
      // with a group offset value of 2 so that we won't see groups 0 or 1 in this set
      // this should trigger the circuit breaker and while we'd expect groups 0 and 1
      // to recover under normal conditions, they should stay active because the
      // circuit breaker hit
      await createEsDocumentsInGroups(22, getEndDate(), 2);

      // get the events we're expecting
      const events = await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId: Spaces.space1.id,
          type: 'alert',
          id: ruleId,
          provider: 'alerting',
          actions: new Map([
            ['execute', { gte: 2 }],
            ['new-instance', { gte: 1 }],
            ['active-instance', { gte: 1 }],
          ]),
        });
      });

      // execute events
      const executeEvents = events.filter((event) => event?.event?.action === 'execute');
      // earliest execute event should have 5 active, 5 new alerts
      const firstExecuteEvent = executeEvents[0];
      expect(firstExecuteEvent?.event?.outcome).to.eql('success');
      expect(firstExecuteEvent?.kibana?.alerting?.status).to.eql('active');
      expect(
        firstExecuteEvent?.kibana?.alert?.rule?.execution?.metrics?.alert_counts?.active
      ).to.eql(5);
      expect(firstExecuteEvent?.kibana?.alert?.rule?.execution?.metrics?.alert_counts?.new).to.eql(
        5
      );
      expect(
        firstExecuteEvent?.kibana?.alert?.rule?.execution?.metrics?.alert_counts?.recovered
      ).to.eql(0);

      // second execute event should have warning status and active alerts should be at max (20)
      // should have 15 new alerts (5 existing from previous run + 15 added until max hit)
      // should have no recovered alerts
      const secondExecuteEvent = executeEvents[1];
      expect(secondExecuteEvent?.event?.outcome).to.eql('success');
      expect(secondExecuteEvent?.event?.reason).to.eql('maxAlerts');
      expect(secondExecuteEvent?.kibana?.alerting?.status).to.eql('warning');
      expect(
        secondExecuteEvent?.kibana?.alert?.rule?.execution?.metrics?.alert_counts?.active
      ).to.eql(20);
      expect(secondExecuteEvent?.kibana?.alert?.rule?.execution?.metrics?.alert_counts?.new).to.eql(
        15
      );
      expect(
        secondExecuteEvent?.kibana?.alert?.rule?.execution?.metrics?.alert_counts?.recovered
      ).to.eql(0);

      // get execution uuid for second execute event and get all active instances for this uuid
      const executionUuid = secondExecuteEvent?.kibana?.alert?.rule?.execution?.uuid;
      const activeAlerts = events.filter(
        (event) =>
          event?.kibana?.alert?.rule?.execution?.uuid === executionUuid &&
          event?.event?.action === 'active-instance'
      );
      const activeAlertIds = activeAlerts.map((alert) => alert?.kibana?.alerting?.instance_id);

      // active alert ids should include all 5 alert ids from the first execution
      expect(activeAlertIds.includes('group-0')).to.be(true);
      expect(activeAlertIds.includes('group-1')).to.be(true);
      expect(activeAlertIds.includes('group-2')).to.be(true);
      expect(activeAlertIds.includes('group-3')).to.be(true);
      expect(activeAlertIds.includes('group-4')).to.be(true);

      // create more es documents that will fall under the circuit breaker
      // offset by 2 so we expect groups 0 and 1 to finally recover
      // it looks like alerts were reported in reverse order (group-23, 22, 21, down to 9)
      // so all the 15 new alerts will recover, leading to 17 recovered alerts
      // so our active alerts will be groups 2, 3, 4, 5 and 6 with groups 5 and 6 as new alerts
      await createEsDocumentsInGroups(5, getEndDate(), 2);

      const recoveredEvents = await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId: Spaces.space1.id,
          type: 'alert',
          id: ruleId,
          provider: 'alerting',
          actions: new Map([['recovered-instance', { gte: 17 }]]),
        });
      });

      // because the "execute" event is written at the end of execution
      // after getting the correct number of recovered-instance events, we're often not
      // getting the final "execute" event. use the execution UUID to grab it directly

      const recoveredEventExecutionUuid = recoveredEvents[0]?.kibana?.alert?.rule?.execution?.uuid;

      const finalExecuteEvents = await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId: Spaces.space1.id,
          type: 'alert',
          id: ruleId,
          provider: 'alerting',
          filter: `kibana.alert.rule.execution.uuid:(${recoveredEventExecutionUuid})`,
          actions: new Map([['execute', { gte: 1 }]]),
        });
      });

      // get the latest execute event
      const finalExecuteEvent = finalExecuteEvents[0];
      expect(finalExecuteEvent?.event?.outcome).to.eql('success');
      expect(finalExecuteEvent?.kibana?.alerting?.status).to.eql('active');
      expect(finalExecuteEvent?.event?.reason).to.be(undefined);
      expect(
        finalExecuteEvent?.kibana?.alert?.rule?.execution?.metrics?.alert_counts?.active
      ).to.be(5);
      expect(finalExecuteEvent?.kibana?.alert?.rule?.execution?.metrics?.alert_counts?.new).to.be(
        2
      );
      expect(
        finalExecuteEvent?.kibana?.alert?.rule?.execution?.metrics?.alert_counts?.recovered
      ).to.be(17);

      const recoveredAlertIds = recoveredEvents.map(
        (alert) => alert?.kibana?.alerting?.instance_id
      );

      expect(recoveredAlertIds.includes('group-0')).to.be(true);
      expect(recoveredAlertIds.includes('group-1')).to.be(true);
    });

    interface CreateRuleParams {
      name: string;
      aggType: string;
      aggField?: string;
      timeField?: string;
      timeWindowSize?: number;
      groupBy: 'all' | 'top';
      termField?: string;
      termSize?: number;
      thresholdComparator: string;
      threshold: number[];
      notifyWhen?: string;
      indexName?: string;
    }

    async function createIndexThresholdRule(params: CreateRuleParams): Promise<string> {
      const { status, body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: params.name,
          consumer: 'alerts',
          enabled: true,
          rule_type_id: '.index-threshold',
          schedule: { interval: `${RULE_INTERVAL_SECONDS}s` },
          actions: [],
          notify_when: 'onActiveAlert',
          params: {
            index: params.indexName || ES_TEST_INDEX_NAME,
            timeField: params.timeField || 'date',
            aggType: params.aggType,
            aggField: params.aggField,
            groupBy: params.groupBy,
            termField: params.termField,
            termSize: params.termSize,
            timeWindowSize: params.timeWindowSize ?? RULE_INTERVAL_SECONDS * 5,
            timeWindowUnit: 's',
            thresholdComparator: params.thresholdComparator,
            threshold: params.threshold,
          },
        });

      expect(status).to.be(200);

      const ruleId = createdRule.id;
      objectRemover.add(Spaces.space1.id, ruleId, 'rule', 'alerting');

      return ruleId;
    }

    async function createEsDocumentsInGroups(
      groups: number,
      endDate: string,
      groupOffset: number = 0
    ) {
      await createEsDocumentsWithGroups({
        es,
        esTestIndexTool,
        endDate,
        intervals: RULE_INTERVALS_TO_WRITE,
        intervalMillis: RULE_INTERVAL_MILLIS,
        groups,
        indexName: ES_TEST_INDEX_NAME,
        groupOffset,
      });
    }

    function getEndDate() {
      const endDateMillis = Date.now() + (RULE_INTERVALS_TO_WRITE - 1) * RULE_INTERVAL_MILLIS;
      return new Date(endDateMillis).toISOString();
    }
  });
}
