/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { orderBy } from 'lodash';

import {
  EqlCreateSchema,
  QueryCreateSchema,
} from '../../../../plugins/security_solution/common/detection_engine/schemas/request';
import { DEFAULT_SIGNALS_INDEX } from '../../../../plugins/security_solution/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createRule,
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getRuleForSignalTesting,
  getSignalsByIds,
  getSignalsByRuleIds,
  getSimpleRule,
  waitForRuleSuccess,
  waitForSignalsToBePresent,
} from '../../utils';

/**
 * Specific _id to use for some of the tests. If the archiver changes and you see errors
 * here, update this to a new value of a chosen auditbeat record and update the tests values.
 */
export const ID = 'BhbXBmkBR346wHgn4PeZ';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('Generating signals from source indexes', () => {
    beforeEach(async () => {
      await createSignalsIndex(supertest);
    });

    afterEach(async () => {
      await deleteSignalsIndex(supertest);
      await deleteAllAlerts(supertest);
    });

    describe('Signals from audit beat are of the expected structure', () => {
      beforeEach(async () => {
        await esArchiver.load('auditbeat/hosts');
      });

      afterEach(async () => {
        await esArchiver.unload('auditbeat/hosts');
      });

      it('should have the specific audit record for _id or none of these tests below will pass', async () => {
        const rule: QueryCreateSchema = {
          ...getRuleForSignalTesting(['auditbeat-*']),
          query: `_id:${ID}`,
        };
        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);
        const signalsOpen = await getSignalsByIds(supertest, [id]);
        expect(signalsOpen.hits.hits.length).greaterThan(0);
      });

      it('should have recorded the rule_id within the signal', async () => {
        const rule: QueryCreateSchema = {
          ...getRuleForSignalTesting(['auditbeat-*']),
          query: `_id:${ID}`,
        };
        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);
        const signalsOpen = await getSignalsByIds(supertest, [id]);
        expect(signalsOpen.hits.hits[0]._source.signal.rule.rule_id).eql(getSimpleRule().rule_id);
      });

      it('should query and get back expected signal structure using a basic KQL query', async () => {
        const rule: QueryCreateSchema = {
          ...getRuleForSignalTesting(['auditbeat-*']),
          query: `_id:${ID}`,
        };
        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);
        const signalsOpen = await getSignalsByIds(supertest, [id]);
        // remove rule to cut down on touch points for test changes when the rule format changes
        const { rule: removedRule, ...signalNoRule } = signalsOpen.hits.hits[0]._source.signal;
        expect(signalNoRule).eql({
          parents: [
            {
              id: 'BhbXBmkBR346wHgn4PeZ',
              type: 'event',
              index: 'auditbeat-8.0.0-2019.02.19-000001',
              depth: 0,
            },
          ],
          ancestors: [
            {
              id: 'BhbXBmkBR346wHgn4PeZ',
              type: 'event',
              index: 'auditbeat-8.0.0-2019.02.19-000001',
              depth: 0,
            },
          ],
          status: 'open',
          depth: 1,
          parent: {
            id: 'BhbXBmkBR346wHgn4PeZ',
            type: 'event',
            index: 'auditbeat-8.0.0-2019.02.19-000001',
            depth: 0,
          },
          original_time: '2019-02-19T17:40:03.790Z',
          original_event: {
            action: 'socket_closed',
            dataset: 'socket',
            kind: 'event',
            module: 'system',
          },
        });
      });

      it('should query and get back expected signal structure when it is a signal on a signal', async () => {
        const rule: QueryCreateSchema = {
          ...getRuleForSignalTesting(['auditbeat-*']),
          query: `_id:${ID}`,
        };
        const { id: createdId } = await createRule(supertest, rule);
        await waitForRuleSuccess(supertest, createdId);
        await waitForSignalsToBePresent(supertest, 1, [createdId]);

        // Run signals on top of that 1 signal which should create a single signal (on top of) a signal
        const ruleForSignals: QueryCreateSchema = {
          ...getRuleForSignalTesting([`${DEFAULT_SIGNALS_INDEX}*`]),
          rule_id: 'signal-on-signal',
        };

        const { id } = await createRule(supertest, ruleForSignals);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);

        // Get our single signal on top of a signal
        const signalsOpen = await getSignalsByRuleIds(supertest, ['signal-on-signal']);

        // remove rule to cut down on touch points for test changes when the rule format changes
        const { rule: removedRule, ...signalNoRule } = signalsOpen.hits.hits[0]._source.signal;
        expect(signalNoRule).eql({
          parents: [
            {
              rule: signalNoRule.parents[0].rule, // rule id is always changing so skip testing it
              id: 'acf538fc082adf970012be166527c4d9fc120f0015f145e0a466a3ceb32db606',
              type: 'signal',
              index: '.siem-signals-default-000001',
              depth: 1,
            },
          ],
          ancestors: [
            {
              id: 'BhbXBmkBR346wHgn4PeZ',
              type: 'event',
              index: 'auditbeat-8.0.0-2019.02.19-000001',
              depth: 0,
            },
            {
              rule: signalNoRule.ancestors[1].rule, // rule id is always changing so skip testing it
              id: 'acf538fc082adf970012be166527c4d9fc120f0015f145e0a466a3ceb32db606',
              type: 'signal',
              index: '.siem-signals-default-000001',
              depth: 1,
            },
          ],
          status: 'open',
          depth: 2,
          parent: {
            rule: signalNoRule.parent?.rule, // parent.rule is always changing so skip testing it
            id: 'acf538fc082adf970012be166527c4d9fc120f0015f145e0a466a3ceb32db606',
            type: 'signal',
            index: '.siem-signals-default-000001',
            depth: 1,
          },
          original_time: signalNoRule.original_time, // original_time will always be changing sine it's based on a signal created here, so skip testing it
          original_event: {
            action: 'socket_closed',
            dataset: 'socket',
            kind: 'signal',
            module: 'system',
          },
        });
      });

      describe('EQL Rules', () => {
        it('generates signals from EQL sequences in the expected form', async () => {
          const rule: EqlCreateSchema = {
            ...getRuleForSignalTesting(['auditbeat-*']),
            rule_id: 'eql-rule',
            type: 'eql',
            language: 'eql',
            query: 'sequence by host.name [any where true] [any where true]',
          };
          const { id } = await createRule(supertest, rule);
          await waitForRuleSuccess(supertest, id);
          await waitForSignalsToBePresent(supertest, 1, [id]);
          const signals = await getSignalsByRuleIds(supertest, ['eql-rule']);
          const signal = signals.hits.hits[0]._source.signal;

          expect(signal).eql({
            rule: signal.rule,
            group: signal.group,
            original_time: signal.original_time,
            status: 'open',
            depth: 1,
            ancestors: [
              {
                depth: 0,
                id: 'UBXOBmkBR346wHgnLP8T',
                index: 'auditbeat-8.0.0-2019.02.19-000001',
                type: 'event',
              },
            ],
            original_event: {
              action: 'boot',
              dataset: 'login',
              kind: 'event',
              module: 'system',
              origin: '/var/log/wtmp',
            },
            parent: {
              depth: 0,
              id: 'UBXOBmkBR346wHgnLP8T',
              index: 'auditbeat-8.0.0-2019.02.19-000001',
              type: 'event',
            },
            parents: [
              {
                depth: 0,
                id: 'UBXOBmkBR346wHgnLP8T',
                index: 'auditbeat-8.0.0-2019.02.19-000001',
                type: 'event',
              },
            ],
          });
        });

        it('generates building block signals from EQL sequences in the expected form', async () => {
          const rule: EqlCreateSchema = {
            ...getRuleForSignalTesting(['auditbeat-*']),
            rule_id: 'eql-rule',
            type: 'eql',
            language: 'eql',
            query: 'sequence by host.name [any where true] [any where true]',
          };
          const { id } = await createRule(supertest, rule);
          await waitForRuleSuccess(supertest, id);
          await waitForSignalsToBePresent(supertest, 1, [id]);
          const signalsOpen = await getSignalsByRuleIds(supertest, ['eql-rule']);
          const sequenceSignal = signalsOpen.hits.hits.find(
            (signal) => signal._source.signal.depth === 2
          );
          const signal = sequenceSignal!._source.signal;
          const eventIds = signal.parents.map((event) => event.id);

          expect(signal).eql({
            status: 'open',
            depth: 2,
            group: signal.group,
            rule: signal.rule,
            ancestors: [
              {
                depth: 0,
                id: 'UBXOBmkBR346wHgnLP8T',
                index: 'auditbeat-8.0.0-2019.02.19-000001',
                type: 'event',
              },
              {
                depth: 1,
                id: eventIds[0],
                index: '.siem-signals-default',
                rule: signal.rule.id,
                type: 'signal',
              },
              {
                depth: 0,
                id: 'URXOBmkBR346wHgnLP8T',
                index: 'auditbeat-8.0.0-2019.02.19-000001',
                type: 'event',
              },
              {
                depth: 1,
                id: eventIds[1],
                index: '.siem-signals-default',
                rule: signal.rule.id,
                type: 'signal',
              },
            ],
            parents: [
              {
                depth: 1,
                id: eventIds[0],
                index: '.siem-signals-default',
                rule: signal.rule.id,
                type: 'signal',
              },
              {
                depth: 1,
                id: eventIds[1],
                index: '.siem-signals-default',
                rule: signal.rule.id,
                type: 'signal',
              },
            ],
          });
        });
      });
    });

    /**
     * These are a set of tests for whenever someone sets up their source
     * index to have a name and mapping clash against "signal" with a numeric value.
     * You should see the "signal" name/clash being copied to "original_signal"
     * underneath the signal object and no errors when they do have a clash.
     */
    describe('Signals generated from name clashes', () => {
      beforeEach(async () => {
        await esArchiver.load('signals/numeric_name_clash');
      });

      afterEach(async () => {
        await esArchiver.unload('signals/numeric_name_clash');
      });

      it('should have the specific audit record for _id or none of these tests below will pass', async () => {
        const rule: QueryCreateSchema = {
          ...getRuleForSignalTesting(['signal_name_clash']),
          query: '_id:1',
        };

        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);
        const signalsOpen = await getSignalsByIds(supertest, [id]);
        expect(signalsOpen.hits.hits.length).greaterThan(0);
      });

      it('should have recorded the rule_id within the signal', async () => {
        const rule: QueryCreateSchema = {
          ...getRuleForSignalTesting(['signal_name_clash']),
          query: '_id:1',
        };

        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);
        const signalsOpen = await getSignalsByIds(supertest, [id]);
        expect(signalsOpen.hits.hits[0]._source.signal.rule.rule_id).eql(getSimpleRule().rule_id);
      });

      it('should query and get back expected signal structure using a basic KQL query', async () => {
        const rule: QueryCreateSchema = {
          ...getRuleForSignalTesting(['signal_name_clash']),
          query: '_id:1',
        };
        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);
        const signalsOpen = await getSignalsByIds(supertest, [id]);
        // remove rule to cut down on touch points for test changes when the rule format changes
        const { rule: removedRule, ...signalNoRule } = signalsOpen.hits.hits[0]._source.signal;
        expect(signalNoRule).eql({
          parents: [
            {
              id: '1',
              type: 'event',
              index: 'signal_name_clash',
              depth: 0,
            },
          ],
          ancestors: [
            {
              id: '1',
              type: 'event',
              index: 'signal_name_clash',
              depth: 0,
            },
          ],
          status: 'open',
          depth: 1,
          parent: {
            id: '1',
            type: 'event',
            index: 'signal_name_clash',
            depth: 0,
          },
          original_time: '2020-10-28T05:08:53.000Z',
          original_signal: 1,
        });
      });

      it('should query and get back expected signal structure when it is a signal on a signal', async () => {
        const rule: QueryCreateSchema = {
          ...getRuleForSignalTesting(['signal_name_clash']),
          query: '_id:1',
        };
        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);

        // Run signals on top of that 1 signal which should create a single signal (on top of) a signal
        const ruleForSignals: QueryCreateSchema = {
          ...getRuleForSignalTesting([`${DEFAULT_SIGNALS_INDEX}*`]),
          rule_id: 'signal-on-signal',
        };
        const { id: createdId } = await createRule(supertest, ruleForSignals);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [createdId]);

        // Get our single signal on top of a signal
        const signalsOpen = await getSignalsByRuleIds(supertest, ['signal-on-signal']);

        // remove rule to cut down on touch points for test changes when the rule format changes
        const { rule: removedRule, ...signalNoRule } = signalsOpen.hits.hits[0]._source.signal;

        expect(signalNoRule).eql({
          parents: [
            {
              rule: signalNoRule.parents[0].rule, // rule id is always changing so skip testing it
              id: 'b63bcc90b9393f94899991397a3c2df2f3f5c6ebf56440434500f1e1419df7c9',
              type: 'signal',
              index: '.siem-signals-default-000001',
              depth: 1,
            },
          ],
          ancestors: [
            {
              id: '1',
              type: 'event',
              index: 'signal_name_clash',
              depth: 0,
            },
            {
              rule: signalNoRule.ancestors[1].rule, // rule id is always changing so skip testing it
              id: 'b63bcc90b9393f94899991397a3c2df2f3f5c6ebf56440434500f1e1419df7c9',
              type: 'signal',
              index: '.siem-signals-default-000001',
              depth: 1,
            },
          ],
          status: 'open',
          depth: 2,
          parent: {
            rule: signalNoRule.parent?.rule, // parent.rule is always changing so skip testing it
            id: 'b63bcc90b9393f94899991397a3c2df2f3f5c6ebf56440434500f1e1419df7c9',
            type: 'signal',
            index: '.siem-signals-default-000001',
            depth: 1,
          },
          original_time: signalNoRule.original_time, // original_time will always be changing sine it's based on a signal created here, so skip testing it
          original_event: {
            kind: 'signal',
          },
        });
      });
    });

    /**
     * These are a set of tests for whenever someone sets up their source
     * index to have a name and mapping clash against "signal" with an object value.
     * You should see the "signal" object/clash being copied to "original_signal" underneath
     * the signal object and no errors when they do have a clash.
     */
    describe('Signals generated from object clashes', () => {
      beforeEach(async () => {
        await esArchiver.load('signals/object_clash');
      });

      afterEach(async () => {
        await esArchiver.unload('signals/object_clash');
      });

      it('should have the specific audit record for _id or none of these tests below will pass', async () => {
        const rule: QueryCreateSchema = {
          ...getRuleForSignalTesting(['signal_object_clash']),
          query: '_id:1',
        };
        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);
        const signalsOpen = await getSignalsByIds(supertest, [id]);
        expect(signalsOpen.hits.hits.length).greaterThan(0);
      });

      it('should have recorded the rule_id within the signal', async () => {
        const rule: QueryCreateSchema = {
          ...getRuleForSignalTesting(['signal_object_clash']),
          query: '_id:1',
        };
        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);
        const signalsOpen = await getSignalsByIds(supertest, [id]);
        expect(signalsOpen.hits.hits[0]._source.signal.rule.rule_id).eql(getSimpleRule().rule_id);
      });

      it('should query and get back expected signal structure using a basic KQL query', async () => {
        const rule: QueryCreateSchema = {
          ...getRuleForSignalTesting(['signal_object_clash']),
          query: '_id:1',
        };
        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);
        const signalsOpen = await getSignalsByIds(supertest, [id]);
        // remove rule to cut down on touch points for test changes when the rule format changes
        const { rule: removedRule, ...signalNoRule } = signalsOpen.hits.hits[0]._source.signal;
        expect(signalNoRule).eql({
          parents: [
            {
              id: '1',
              type: 'event',
              index: 'signal_object_clash',
              depth: 0,
            },
          ],
          ancestors: [
            {
              id: '1',
              type: 'event',
              index: 'signal_object_clash',
              depth: 0,
            },
          ],
          status: 'open',
          depth: 1,
          parent: {
            id: '1',
            type: 'event',
            index: 'signal_object_clash',
            depth: 0,
          },
          original_time: '2020-10-28T05:08:53.000Z',
          original_signal: {
            child_1: {
              child_2: {
                value: 'some_value',
              },
            },
          },
        });
      });

      it('should query and get back expected signal structure when it is a signal on a signal', async () => {
        const rule: QueryCreateSchema = {
          ...getRuleForSignalTesting(['signal_object_clash']),
          query: '_id:1',
        };
        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);

        // Run signals on top of that 1 signal which should create a single signal (on top of) a signal
        const ruleForSignals: QueryCreateSchema = {
          ...getRuleForSignalTesting([`${DEFAULT_SIGNALS_INDEX}*`]),
          rule_id: 'signal-on-signal',
        };
        const { id: createdId } = await createRule(supertest, ruleForSignals);
        await waitForRuleSuccess(supertest, createdId);
        await waitForSignalsToBePresent(supertest, 1, [createdId]);

        // Get our single signal on top of a signal
        const signalsOpen = await getSignalsByRuleIds(supertest, ['signal-on-signal']);

        // remove rule to cut down on touch points for test changes when the rule format changes
        const { rule: removedRule, ...signalNoRule } = signalsOpen.hits.hits[0]._source.signal;

        expect(signalNoRule).eql({
          parents: [
            {
              rule: signalNoRule.parents[0].rule, // rule id is always changing so skip testing it
              id: 'd2114ed6553816f87d6707b5bc50b88751db73b0f4930433d0890474804aa179',
              type: 'signal',
              index: '.siem-signals-default-000001',
              depth: 1,
            },
          ],
          ancestors: [
            {
              id: '1',
              type: 'event',
              index: 'signal_object_clash',
              depth: 0,
            },
            {
              rule: signalNoRule.ancestors[1].rule, // rule id is always changing so skip testing it
              id: 'd2114ed6553816f87d6707b5bc50b88751db73b0f4930433d0890474804aa179',
              type: 'signal',
              index: '.siem-signals-default-000001',
              depth: 1,
            },
          ],
          status: 'open',
          depth: 2,
          parent: {
            rule: signalNoRule.parent?.rule, // parent.rule is always changing so skip testing it
            id: 'd2114ed6553816f87d6707b5bc50b88751db73b0f4930433d0890474804aa179',
            type: 'signal',
            index: '.siem-signals-default-000001',
            depth: 1,
          },
          original_time: signalNoRule.original_time, // original_time will always be changing sine it's based on a signal created here, so skip testing it
          original_event: {
            kind: 'signal',
          },
        });
      });
    });

    /**
     * Here we test the functionality of Severity and Risk Score overrides (also called "mappings"
     * in the code). If the rule specifies a mapping, then the final Severity or Risk Score
     * value of the signal will be taken from the mapped field of the source event.
     */
    describe('Signals generated from events with custom severity and risk score fields', () => {
      beforeEach(async () => {
        await esArchiver.load('signals/severity_risk_overrides');
      });

      afterEach(async () => {
        await esArchiver.unload('signals/severity_risk_overrides');
      });

      const executeRuleAndGetSignals = async (rule: QueryCreateSchema) => {
        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccess(supertest, id);
        await waitForSignalsToBePresent(supertest, 4, [id]);
        const signalsResponse = await getSignalsByIds(supertest, [id]);
        const signals = signalsResponse.hits.hits.map((hit) => hit._source);
        const signalsOrderedByEventId = orderBy(signals, 'signal.parent.id', 'asc');
        return signalsOrderedByEventId;
      };

      it('should get default severity and risk score if there is no mapping', async () => {
        const rule: QueryCreateSchema = {
          ...getRuleForSignalTesting(['signal_overrides']),
          severity: 'medium',
          risk_score: 75,
        };

        const signals = await executeRuleAndGetSignals(rule);

        expect(signals.length).equal(4);
        signals.forEach((s) => {
          expect(s.signal.rule.severity).equal('medium');
          expect(s.signal.rule.severity_mapping).eql([]);

          expect(s.signal.rule.risk_score).equal(75);
          expect(s.signal.rule.risk_score_mapping).eql([]);
        });
      });

      it('should get overridden severity if the rule has a mapping for it', async () => {
        const rule: QueryCreateSchema = {
          ...getRuleForSignalTesting(['signal_overrides']),
          severity: 'medium',
          severity_mapping: [
            { field: 'my_severity', operator: 'equals', value: 'sev_900', severity: 'high' },
            { field: 'my_severity', operator: 'equals', value: 'sev_max', severity: 'critical' },
          ],
          risk_score: 75,
        };

        const signals = await executeRuleAndGetSignals(rule);
        const severities = signals.map((s) => ({
          id: s.signal.parent?.id,
          value: s.signal.rule.severity,
        }));

        expect(signals.length).equal(4);
        expect(severities).eql([
          { id: '1', value: 'high' },
          { id: '2', value: 'critical' },
          { id: '3', value: 'critical' },
          { id: '4', value: 'critical' },
        ]);

        signals.forEach((s) => {
          expect(s.signal.rule.risk_score).equal(75);
          expect(s.signal.rule.risk_score_mapping).eql([]);
          expect(s.signal.rule.severity_mapping).eql([
            { field: 'my_severity', operator: 'equals', value: 'sev_900', severity: 'high' },
            { field: 'my_severity', operator: 'equals', value: 'sev_max', severity: 'critical' },
          ]);
        });
      });

      it('should get overridden risk score if the rule has a mapping for it', async () => {
        const rule: QueryCreateSchema = {
          ...getRuleForSignalTesting(['signal_overrides']),
          severity: 'medium',
          risk_score: 75,
          risk_score_mapping: [
            { field: 'my_risk', operator: 'equals', value: '', risk_score: undefined },
          ],
        };

        const signals = await executeRuleAndGetSignals(rule);
        const riskScores = signals.map((s) => ({
          id: s.signal.parent?.id,
          value: s.signal.rule.risk_score,
        }));

        expect(signals.length).equal(4);
        expect(riskScores).eql([
          { id: '1', value: 31.14 },
          { id: '2', value: 32.14 },
          { id: '3', value: 33.14 },
          { id: '4', value: 34.14 },
        ]);

        signals.forEach((s) => {
          expect(s.signal.rule.severity).equal('medium');
          expect(s.signal.rule.severity_mapping).eql([]);
          expect(s.signal.rule.risk_score_mapping).eql([
            { field: 'my_risk', operator: 'equals', value: '' },
          ]);
        });
      });

      it('should get overridden severity and risk score if the rule has both mappings', async () => {
        const rule: QueryCreateSchema = {
          ...getRuleForSignalTesting(['signal_overrides']),
          severity: 'medium',
          severity_mapping: [
            { field: 'my_severity', operator: 'equals', value: 'sev_900', severity: 'high' },
            { field: 'my_severity', operator: 'equals', value: 'sev_max', severity: 'critical' },
          ],
          risk_score: 75,
          risk_score_mapping: [
            { field: 'my_risk', operator: 'equals', value: '', risk_score: undefined },
          ],
        };

        const signals = await executeRuleAndGetSignals(rule);
        const values = signals.map((s) => ({
          id: s.signal.parent?.id,
          severity: s.signal.rule.severity,
          risk: s.signal.rule.risk_score,
        }));

        expect(signals.length).equal(4);
        expect(values).eql([
          { id: '1', severity: 'high', risk: 31.14 },
          { id: '2', severity: 'critical', risk: 32.14 },
          { id: '3', severity: 'critical', risk: 33.14 },
          { id: '4', severity: 'critical', risk: 34.14 },
        ]);

        signals.forEach((s) => {
          expect(s.signal.rule.severity_mapping).eql([
            { field: 'my_severity', operator: 'equals', value: 'sev_900', severity: 'high' },
            { field: 'my_severity', operator: 'equals', value: 'sev_max', severity: 'critical' },
          ]);
          expect(s.signal.rule.risk_score_mapping).eql([
            { field: 'my_risk', operator: 'equals', value: '' },
          ]);
        });
      });
    });
  });
};
