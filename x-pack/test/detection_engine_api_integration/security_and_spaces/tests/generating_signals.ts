/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { orderBy, get } from 'lodash';

import {
  EqlCreateSchema,
  QueryCreateSchema,
  SavedQueryCreateSchema,
  ThresholdCreateSchema,
} from '../../../../plugins/security_solution/common/detection_engine/schemas/request';
import { DEFAULT_SIGNALS_INDEX } from '../../../../plugins/security_solution/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createRule,
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getOpenSignals,
  getRuleForSignalTesting,
  getSignalsByIds,
  getSignalsByRuleIds,
  getSimpleRule,
  waitForRuleSuccessOrStatus,
  waitForSignalsToBePresent,
} from '../../utils';
import { SIGNALS_TEMPLATE_VERSION } from '../../../../plugins/security_solution/server/lib/detection_engine/routes/index/get_signals_template';

/**
 * Specific _id to use for some of the tests. If the archiver changes and you see errors
 * here, update this to a new value of a chosen auditbeat record and update the tests values.
 */
export const ID = 'BhbXBmkBR346wHgn4PeZ';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

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
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);
        const signalsOpen = await getSignalsByIds(supertest, [id]);
        expect(signalsOpen.hits.hits.length).greaterThan(0);
      });

      it('should abide by max_signals > 100', async () => {
        const maxSignals = 500;
        const rule: QueryCreateSchema = {
          ...getRuleForSignalTesting(['auditbeat-*']),
          max_signals: maxSignals,
        };
        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, maxSignals, [id]);
        const signalsOpen = await getSignalsByIds(supertest, [id], maxSignals);
        expect(signalsOpen.hits.hits.length).equal(maxSignals);
      });

      it('should have recorded the rule_id within the signal', async () => {
        const rule: QueryCreateSchema = {
          ...getRuleForSignalTesting(['auditbeat-*']),
          query: `_id:${ID}`,
        };
        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccessOrStatus(supertest, id);
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
        await waitForRuleSuccessOrStatus(supertest, id);
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
          _meta: {
            version: SIGNALS_TEMPLATE_VERSION,
          },
        });
      });

      it('should query and get back expected signal structure using a saved query rule', async () => {
        const rule: SavedQueryCreateSchema = {
          ...getRuleForSignalTesting(['auditbeat-*']),
          type: 'saved_query',
          query: `_id:${ID}`,
          saved_id: 'doesnt-exist',
        };
        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccessOrStatus(supertest, id);
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
          _meta: {
            version: SIGNALS_TEMPLATE_VERSION,
          },
        });
      });

      it('should query and get back expected signal structure when it is a signal on a signal', async () => {
        const rule: QueryCreateSchema = {
          ...getRuleForSignalTesting(['auditbeat-*']),
          query: `_id:${ID}`,
        };
        const { id: createdId } = await createRule(supertest, rule);
        await waitForRuleSuccessOrStatus(supertest, createdId);
        await waitForSignalsToBePresent(supertest, 1, [createdId]);

        // Run signals on top of that 1 signal which should create a single signal (on top of) a signal
        const ruleForSignals: QueryCreateSchema = {
          ...getRuleForSignalTesting([`${DEFAULT_SIGNALS_INDEX}*`]),
          rule_id: 'signal-on-signal',
        };

        const { id } = await createRule(supertest, ruleForSignals);
        await waitForRuleSuccessOrStatus(supertest, id);
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
          _meta: {
            version: SIGNALS_TEMPLATE_VERSION,
          },
        });
      });

      describe('EQL Rules', () => {
        it('generates a correctly formatted signal from EQL non-sequence queries', async () => {
          const rule: EqlCreateSchema = {
            ...getRuleForSignalTesting(['auditbeat-*']),
            rule_id: 'eql-rule',
            type: 'eql',
            language: 'eql',
            query: 'configuration where agent.id=="a1d7b39c-f898-4dbe-a761-efb61939302d"',
          };
          const { id } = await createRule(supertest, rule);
          await waitForRuleSuccessOrStatus(supertest, id);
          await waitForSignalsToBePresent(supertest, 1, [id]);
          const signals = await getSignalsByRuleIds(supertest, ['eql-rule']);
          expect(signals.hits.hits.length).eql(1);
          const fullSignal = signals.hits.hits[0]._source;

          expect(fullSignal).eql({
            '@timestamp': fullSignal['@timestamp'],
            agent: {
              ephemeral_id: '0010d67a-14f7-41da-be30-489fea735967',
              hostname: 'suricata-zeek-sensor-toronto',
              id: 'a1d7b39c-f898-4dbe-a761-efb61939302d',
              type: 'auditbeat',
              version: '8.0.0',
            },
            auditd: {
              data: {
                audit_enabled: '1',
                old: '1',
              },
              message_type: 'config_change',
              result: 'success',
              sequence: 1496,
              session: 'unset',
              summary: {
                actor: {
                  primary: 'unset',
                },
                object: {
                  primary: '1',
                  type: 'audit-config',
                },
              },
            },
            cloud: {
              instance: {
                id: '133555295',
              },
              provider: 'digitalocean',
              region: 'tor1',
            },
            ecs: {
              version: '1.0.0-beta2',
            },
            event: {
              action: 'changed-audit-configuration',
              category: 'configuration',
              module: 'auditd',
              kind: 'signal',
            },
            host: {
              architecture: 'x86_64',
              containerized: false,
              hostname: 'suricata-zeek-sensor-toronto',
              id: '8cc95778cce5407c809480e8e32ad76b',
              name: 'suricata-zeek-sensor-toronto',
              os: {
                codename: 'bionic',
                family: 'debian',
                kernel: '4.15.0-45-generic',
                name: 'Ubuntu',
                platform: 'ubuntu',
                version: '18.04.2 LTS (Bionic Beaver)',
              },
            },
            service: {
              type: 'auditd',
            },
            user: {
              audit: {
                id: 'unset',
              },
            },
            signal: {
              rule: fullSignal.signal.rule,
              original_time: fullSignal.signal.original_time,
              status: 'open',
              depth: 1,
              ancestors: [
                {
                  depth: 0,
                  id: '9xbRBmkBR346wHgngz2D',
                  index: 'auditbeat-8.0.0-2019.02.19-000001',
                  type: 'event',
                },
              ],
              original_event: {
                action: 'changed-audit-configuration',
                category: 'configuration',
                module: 'auditd',
              },
              parent: {
                depth: 0,
                id: '9xbRBmkBR346wHgngz2D',
                index: 'auditbeat-8.0.0-2019.02.19-000001',
                type: 'event',
              },
              parents: [
                {
                  depth: 0,
                  id: '9xbRBmkBR346wHgngz2D',
                  index: 'auditbeat-8.0.0-2019.02.19-000001',
                  type: 'event',
                },
              ],
              _meta: {
                version: SIGNALS_TEMPLATE_VERSION,
              },
            },
          });
        });

        it('generates up to max_signals for non-sequence EQL queries', async () => {
          const rule: EqlCreateSchema = {
            ...getRuleForSignalTesting(['auditbeat-*']),
            rule_id: 'eql-rule',
            type: 'eql',
            language: 'eql',
            query: 'any where true',
          };
          const { id } = await createRule(supertest, rule);
          await waitForRuleSuccessOrStatus(supertest, id);
          await waitForSignalsToBePresent(supertest, 100, [id]);
          const signals = await getSignalsByIds(supertest, [id], 1000);
          const filteredSignals = signals.hits.hits.filter(
            (signal) => signal._source.signal.depth === 1
          );
          expect(filteredSignals.length).eql(100);
        });

        it('uses the provided event_category_override', async () => {
          const rule: EqlCreateSchema = {
            ...getRuleForSignalTesting(['auditbeat-*']),
            rule_id: 'eql-rule',
            type: 'eql',
            language: 'eql',
            query: 'config_change where agent.id=="a1d7b39c-f898-4dbe-a761-efb61939302d"',
            event_category_override: 'auditd.message_type',
          };
          const { id } = await createRule(supertest, rule);
          await waitForRuleSuccessOrStatus(supertest, id);
          await waitForSignalsToBePresent(supertest, 1, [id]);
          const signals = await getSignalsByRuleIds(supertest, ['eql-rule']);
          expect(signals.hits.hits.length).eql(1);
          const fullSignal = signals.hits.hits[0]._source;

          expect(fullSignal).eql({
            '@timestamp': fullSignal['@timestamp'],
            agent: {
              ephemeral_id: '0010d67a-14f7-41da-be30-489fea735967',
              hostname: 'suricata-zeek-sensor-toronto',
              id: 'a1d7b39c-f898-4dbe-a761-efb61939302d',
              type: 'auditbeat',
              version: '8.0.0',
            },
            auditd: {
              data: {
                audit_enabled: '1',
                old: '1',
              },
              message_type: 'config_change',
              result: 'success',
              sequence: 1496,
              session: 'unset',
              summary: {
                actor: {
                  primary: 'unset',
                },
                object: {
                  primary: '1',
                  type: 'audit-config',
                },
              },
            },
            cloud: {
              instance: {
                id: '133555295',
              },
              provider: 'digitalocean',
              region: 'tor1',
            },
            ecs: {
              version: '1.0.0-beta2',
            },
            event: {
              action: 'changed-audit-configuration',
              category: 'configuration',
              module: 'auditd',
              kind: 'signal',
            },
            host: {
              architecture: 'x86_64',
              containerized: false,
              hostname: 'suricata-zeek-sensor-toronto',
              id: '8cc95778cce5407c809480e8e32ad76b',
              name: 'suricata-zeek-sensor-toronto',
              os: {
                codename: 'bionic',
                family: 'debian',
                kernel: '4.15.0-45-generic',
                name: 'Ubuntu',
                platform: 'ubuntu',
                version: '18.04.2 LTS (Bionic Beaver)',
              },
            },
            service: {
              type: 'auditd',
            },
            user: {
              audit: {
                id: 'unset',
              },
            },
            signal: {
              rule: fullSignal.signal.rule,
              original_time: fullSignal.signal.original_time,
              status: 'open',
              depth: 1,
              ancestors: [
                {
                  depth: 0,
                  id: '9xbRBmkBR346wHgngz2D',
                  index: 'auditbeat-8.0.0-2019.02.19-000001',
                  type: 'event',
                },
              ],
              original_event: {
                action: 'changed-audit-configuration',
                category: 'configuration',
                module: 'auditd',
              },
              parent: {
                depth: 0,
                id: '9xbRBmkBR346wHgngz2D',
                index: 'auditbeat-8.0.0-2019.02.19-000001',
                type: 'event',
              },
              parents: [
                {
                  depth: 0,
                  id: '9xbRBmkBR346wHgngz2D',
                  index: 'auditbeat-8.0.0-2019.02.19-000001',
                  type: 'event',
                },
              ],
              _meta: {
                version: SIGNALS_TEMPLATE_VERSION,
              },
            },
          });
        });

        it('generates building block signals from EQL sequences in the expected form', async () => {
          const rule: EqlCreateSchema = {
            ...getRuleForSignalTesting(['auditbeat-*']),
            rule_id: 'eql-rule',
            type: 'eql',
            language: 'eql',
            query: 'sequence by host.name [anomoly where true] [any where true]',
          };
          const { id } = await createRule(supertest, rule);
          await waitForRuleSuccessOrStatus(supertest, id);
          await waitForSignalsToBePresent(supertest, 3, [id]);
          const signals = await getSignalsByRuleIds(supertest, ['eql-rule']);
          const buildingBlock = signals.hits.hits.find(
            (signal) =>
              signal._source.signal.depth === 1 &&
              get(signal._source, 'signal.original_event.category') === 'anomoly'
          );
          expect(buildingBlock).not.eql(undefined);
          const signal = buildingBlock!._source.signal;

          expect(signal).eql({
            rule: signal.rule,
            group: signal.group,
            original_time: signal.original_time,
            status: 'open',
            depth: 1,
            ancestors: [
              {
                depth: 0,
                id: 'VhXOBmkBR346wHgnLP8T',
                index: 'auditbeat-8.0.0-2019.02.19-000001',
                type: 'event',
              },
            ],
            original_event: {
              action: 'changed-promiscuous-mode-on-device',
              category: 'anomoly',
              module: 'auditd',
            },
            parent: {
              depth: 0,
              id: 'VhXOBmkBR346wHgnLP8T',
              index: 'auditbeat-8.0.0-2019.02.19-000001',
              type: 'event',
            },
            parents: [
              {
                depth: 0,
                id: 'VhXOBmkBR346wHgnLP8T',
                index: 'auditbeat-8.0.0-2019.02.19-000001',
                type: 'event',
              },
            ],
            _meta: {
              version: SIGNALS_TEMPLATE_VERSION,
            },
          });
        });

        it('generates shell signals from EQL sequences in the expected form', async () => {
          const rule: EqlCreateSchema = {
            ...getRuleForSignalTesting(['auditbeat-*']),
            rule_id: 'eql-rule',
            type: 'eql',
            language: 'eql',
            query: 'sequence by host.name [anomoly where true] [any where true]',
          };
          const { id } = await createRule(supertest, rule);
          await waitForRuleSuccessOrStatus(supertest, id);
          await waitForSignalsToBePresent(supertest, 3, [id]);
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
                id: 'VhXOBmkBR346wHgnLP8T',
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
                id: '4hbXBmkBR346wHgn6fdp',
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
            _meta: {
              version: SIGNALS_TEMPLATE_VERSION,
            },
          });
        });

        it('generates up to max_signals with an EQL rule', async () => {
          const rule: EqlCreateSchema = {
            ...getRuleForSignalTesting(['auditbeat-*']),
            rule_id: 'eql-rule',
            type: 'eql',
            language: 'eql',
            query: 'sequence by host.name [any where true] [any where true]',
          };
          const { id } = await createRule(supertest, rule);
          await waitForRuleSuccessOrStatus(supertest, id);
          // For EQL rules, max_signals is the maximum number of detected sequences: each sequence has a building block
          // alert for each event in the sequence, so max_signals=100 results in 200 building blocks in addition to
          // 100 regular alerts
          await waitForSignalsToBePresent(supertest, 300, [id]);
          const signalsOpen = await getSignalsByIds(supertest, [id], 1000);
          expect(signalsOpen.hits.hits.length).eql(300);
          const shellSignals = signalsOpen.hits.hits.filter(
            (signal) => signal._source.signal.depth === 2
          );
          const buildingBlocks = signalsOpen.hits.hits.filter(
            (signal) => signal._source.signal.depth === 1
          );
          expect(shellSignals.length).eql(100);
          expect(buildingBlocks.length).eql(200);
        });
      });

      describe('Threshold Rules', () => {
        it('generates 1 signal from Threshold rules when threshold is met', async () => {
          const ruleId = 'threshold-rule';
          const rule: ThresholdCreateSchema = {
            ...getRuleForSignalTesting(['auditbeat-*']),
            rule_id: ruleId,
            type: 'threshold',
            language: 'kuery',
            query: '*:*',
            threshold: {
              field: 'host.id',
              value: 700,
            },
          };
          const { id } = await createRule(supertest, rule);
          await waitForRuleSuccessOrStatus(supertest, id);
          await waitForSignalsToBePresent(supertest, 1, [id]);
          const signalsOpen = await getSignalsByRuleIds(supertest, [ruleId]);
          expect(signalsOpen.hits.hits.length).eql(1);
          const signal = signalsOpen.hits.hits[0];
          expect(signal._source.signal.threshold_result).eql({
            terms: [
              {
                field: 'host.id',
                value: '8cc95778cce5407c809480e8e32ad76b',
              },
            ],
            count: 788,
            from: '1900-01-01T00:00:00.000Z',
          });
        });

        it('generates 2 signals from Threshold rules when threshold is met', async () => {
          const ruleId = 'threshold-rule';
          const rule: ThresholdCreateSchema = {
            ...getRuleForSignalTesting(['auditbeat-*']),
            rule_id: ruleId,
            type: 'threshold',
            language: 'kuery',
            query: '*:*',
            threshold: {
              field: 'host.id',
              value: 100,
            },
          };
          const { id } = await createRule(supertest, rule);
          await waitForRuleSuccessOrStatus(supertest, id);
          await waitForSignalsToBePresent(supertest, 2, [id]);
          const signalsOpen = await getSignalsByRuleIds(supertest, [ruleId]);
          expect(signalsOpen.hits.hits.length).eql(2);
        });

        it('applies the provided query before bucketing ', async () => {
          const ruleId = 'threshold-rule';
          const rule: ThresholdCreateSchema = {
            ...getRuleForSignalTesting(['auditbeat-*']),
            rule_id: ruleId,
            type: 'threshold',
            language: 'kuery',
            query: 'host.id:"2ab45fc1c41e4c84bbd02202a7e5761f"',
            threshold: {
              field: 'process.name',
              value: 21,
            },
          };
          const { id } = await createRule(supertest, rule);
          await waitForRuleSuccessOrStatus(supertest, id);
          await waitForSignalsToBePresent(supertest, 1, [id]);
          const signalsOpen = await getSignalsByRuleIds(supertest, [ruleId]);
          expect(signalsOpen.hits.hits.length).eql(1);
        });

        it('generates no signals from Threshold rules when threshold is met and cardinality is not met', async () => {
          const ruleId = 'threshold-rule';
          const rule: ThresholdCreateSchema = {
            ...getRuleForSignalTesting(['auditbeat-*']),
            rule_id: ruleId,
            type: 'threshold',
            language: 'kuery',
            query: '*:*',
            threshold: {
              field: 'host.id',
              value: 100,
              cardinality: [
                {
                  field: 'destination.ip',
                  value: 100,
                },
              ],
            },
          };
          const createdRule = await createRule(supertest, rule);
          const signalsOpen = await getOpenSignals(supertest, es, createdRule);
          expect(signalsOpen.hits.hits.length).eql(0);
        });

        it('generates no signals from Threshold rules when cardinality is met and threshold is not met', async () => {
          const ruleId = 'threshold-rule';
          const rule: ThresholdCreateSchema = {
            ...getRuleForSignalTesting(['auditbeat-*']),
            rule_id: ruleId,
            type: 'threshold',
            language: 'kuery',
            query: '*:*',
            threshold: {
              field: 'host.id',
              value: 1000,
              cardinality: [
                {
                  field: 'destination.ip',
                  value: 5,
                },
              ],
            },
          };
          const createdRule = await createRule(supertest, rule);
          const signalsOpen = await getOpenSignals(supertest, es, createdRule);
          expect(signalsOpen.hits.hits.length).eql(0);
        });

        it('generates signals from Threshold rules when threshold and cardinality are both met', async () => {
          const ruleId = 'threshold-rule';
          const rule: ThresholdCreateSchema = {
            ...getRuleForSignalTesting(['auditbeat-*']),
            rule_id: ruleId,
            type: 'threshold',
            language: 'kuery',
            query: '*:*',
            threshold: {
              field: 'host.id',
              value: 100,
              cardinality: [
                {
                  field: 'destination.ip',
                  value: 5,
                },
              ],
            },
          };
          const createdRule = await createRule(supertest, rule);
          const signalsOpen = await getOpenSignals(supertest, es, createdRule);
          expect(signalsOpen.hits.hits.length).eql(1);
          const signal = signalsOpen.hits.hits[0];
          expect(signal._source.signal.threshold_result).eql({
            terms: [
              {
                field: 'host.id',
                value: '8cc95778cce5407c809480e8e32ad76b',
              },
            ],
            cardinality: [
              {
                field: 'destination.ip',
                value: 7,
              },
            ],
            count: 788,
            from: '1900-01-01T00:00:00.000Z',
          });
        });

        it('should not generate signals if only one field meets the threshold requirement', async () => {
          const ruleId = 'threshold-rule';
          const rule: ThresholdCreateSchema = {
            ...getRuleForSignalTesting(['auditbeat-*']),
            rule_id: ruleId,
            type: 'threshold',
            language: 'kuery',
            query: '*:*',
            threshold: {
              field: ['host.id', 'process.name'],
              value: 22,
            },
          };
          const createdRule = await createRule(supertest, rule);
          const signalsOpen = await getOpenSignals(supertest, es, createdRule);
          expect(signalsOpen.hits.hits.length).eql(0);
        });

        it('generates signals from Threshold rules when bucketing by multiple fields', async () => {
          const ruleId = 'threshold-rule';
          const rule: ThresholdCreateSchema = {
            ...getRuleForSignalTesting(['auditbeat-*']),
            rule_id: ruleId,
            type: 'threshold',
            language: 'kuery',
            query: '*:*',
            threshold: {
              field: ['host.id', 'process.name', 'event.module'],
              value: 21,
            },
          };
          const createdRule = await createRule(supertest, rule);
          const signalsOpen = await getOpenSignals(supertest, es, createdRule);
          expect(signalsOpen.hits.hits.length).eql(1);
          const signal = signalsOpen.hits.hits[0];
          expect(signal._source.signal.threshold_result).eql({
            terms: [
              {
                field: 'event.module',
                value: 'system',
              },
              {
                field: 'host.id',
                value: '2ab45fc1c41e4c84bbd02202a7e5761f',
              },
              {
                field: 'process.name',
                value: 'sshd',
              },
            ],
            count: 21,
            from: '1900-01-01T00:00:00.000Z',
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
        await waitForRuleSuccessOrStatus(supertest, id);
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
        await waitForRuleSuccessOrStatus(supertest, id);
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
        await waitForRuleSuccessOrStatus(supertest, id);
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
          _meta: {
            version: SIGNALS_TEMPLATE_VERSION,
          },
        });
      });

      it('should query and get back expected signal structure when it is a signal on a signal', async () => {
        const rule: QueryCreateSchema = {
          ...getRuleForSignalTesting(['signal_name_clash']),
          query: '_id:1',
        };
        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);

        // Run signals on top of that 1 signal which should create a single signal (on top of) a signal
        const ruleForSignals: QueryCreateSchema = {
          ...getRuleForSignalTesting([`${DEFAULT_SIGNALS_INDEX}*`]),
          rule_id: 'signal-on-signal',
        };
        const { id: createdId } = await createRule(supertest, ruleForSignals);
        await waitForRuleSuccessOrStatus(supertest, id);
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
          _meta: {
            version: SIGNALS_TEMPLATE_VERSION,
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
        await waitForRuleSuccessOrStatus(supertest, id);
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
        await waitForRuleSuccessOrStatus(supertest, id);
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
        await waitForRuleSuccessOrStatus(supertest, id);
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
          _meta: {
            version: SIGNALS_TEMPLATE_VERSION,
          },
        });
      });

      it('should query and get back expected signal structure when it is a signal on a signal', async () => {
        const rule: QueryCreateSchema = {
          ...getRuleForSignalTesting(['signal_object_clash']),
          query: '_id:1',
        };
        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccessOrStatus(supertest, id);
        await waitForSignalsToBePresent(supertest, 1, [id]);

        // Run signals on top of that 1 signal which should create a single signal (on top of) a signal
        const ruleForSignals: QueryCreateSchema = {
          ...getRuleForSignalTesting([`${DEFAULT_SIGNALS_INDEX}*`]),
          rule_id: 'signal-on-signal',
        };
        const { id: createdId } = await createRule(supertest, ruleForSignals);
        await waitForRuleSuccessOrStatus(supertest, createdId);
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
          _meta: {
            version: SIGNALS_TEMPLATE_VERSION,
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
        await waitForRuleSuccessOrStatus(supertest, id);
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

    describe('Signals generated from events with timestamp override field and ensures search_after continues to work when documents are missing timestamp override field', () => {
      beforeEach(async () => {
        await createSignalsIndex(supertest);
        await esArchiver.load('auditbeat/hosts');
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest);
        await deleteAllAlerts(supertest);
        await esArchiver.unload('auditbeat/hosts');
      });

      /**
       * This represents our worst case scenario where this field is not mapped on any index
       * We want to check that our logic continues to function within the constraints of search after
       * Elasticsearch returns java's long.MAX_VALUE for unmapped date fields
       * Javascript does not support numbers this large, but without passing in a number of this size
       * The search_after will continue to return the same results and not iterate to the next set
       * So to circumvent this limitation of javascript we return the stringified version of Java's
       * Long.MAX_VALUE so that search_after does not enter into an infinite loop.
       *
       * ref: https://github.com/elastic/elasticsearch/issues/28806#issuecomment-369303620
       */
      it('should generate 200 signals when timestamp override does not exist', async () => {
        const rule: QueryCreateSchema = {
          ...getRuleForSignalTesting(['auditbeat-*']),
          timestamp_override: 'event.fakeingested',
          max_signals: 200,
        };

        const { id } = await createRule(supertest, rule);
        await waitForRuleSuccessOrStatus(supertest, id, 'partial failure');
        await waitForSignalsToBePresent(supertest, 200, [id]);
        const signalsResponse = await getSignalsByIds(supertest, [id], 200);
        const signals = signalsResponse.hits.hits.map((hit) => hit._source);

        expect(signals.length).equal(200);
      });
    });

    /**
     * Here we test the functionality of timestamp overrides. If the rule specifies a timestamp override,
     * then the documents will be queried and sorted using the timestamp override field.
     * If no timestamp override field exists in the indices but one was provided to the rule,
     * the rule's query will additionally search for events using the `@timestamp` field
     */
    describe('Signals generated from events with timestamp override field', async () => {
      beforeEach(async () => {
        await deleteSignalsIndex(supertest);
        await createSignalsIndex(supertest);
        await esArchiver.load('security_solution/timestamp_override_1');
        await esArchiver.load('security_solution/timestamp_override_2');
        await esArchiver.load('security_solution/timestamp_override_3');
        await esArchiver.load('security_solution/timestamp_override_4');
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest);
        await deleteAllAlerts(supertest);
        await esArchiver.unload('security_solution/timestamp_override_1');
        await esArchiver.unload('security_solution/timestamp_override_2');
        await esArchiver.unload('security_solution/timestamp_override_3');
        await esArchiver.unload('security_solution/timestamp_override_4');
      });

      it('should generate signals with event.ingested, @timestamp and (event.ingested + timestamp)', async () => {
        const rule: QueryCreateSchema = {
          ...getRuleForSignalTesting(['myfa*']),
          timestamp_override: 'event.ingested',
        };

        const { id } = await createRule(supertest, rule);

        await waitForRuleSuccessOrStatus(supertest, id, 'partial failure');
        await waitForSignalsToBePresent(supertest, 3, [id]);
        const signalsResponse = await getSignalsByIds(supertest, [id], 3);
        const signals = signalsResponse.hits.hits.map((hit) => hit._source);
        const signalsOrderedByEventId = orderBy(signals, 'signal.parent.id', 'asc');

        expect(signalsOrderedByEventId.length).equal(3);
      });

      it('should generate 2 signals with @timestamp', async () => {
        const rule: QueryCreateSchema = getRuleForSignalTesting(['myfa*']);

        const { id } = await createRule(supertest, rule);

        await waitForRuleSuccessOrStatus(supertest, id, 'partial failure');
        await waitForSignalsToBePresent(supertest, 2, [id]);
        const signalsResponse = await getSignalsByIds(supertest, [id]);
        const signals = signalsResponse.hits.hits.map((hit) => hit._source);
        const signalsOrderedByEventId = orderBy(signals, 'signal.parent.id', 'asc');

        expect(signalsOrderedByEventId.length).equal(2);
      });

      it('should generate 2 signals when timestamp override does not exist', async () => {
        const rule: QueryCreateSchema = {
          ...getRuleForSignalTesting(['myfa*']),
          timestamp_override: 'event.fakeingestfield',
        };
        const { id } = await createRule(supertest, rule);

        await waitForRuleSuccessOrStatus(supertest, id, 'partial failure');
        await waitForSignalsToBePresent(supertest, 2, [id]);
        const signalsResponse = await getSignalsByIds(supertest, [id, id]);
        const signals = signalsResponse.hits.hits.map((hit) => hit._source);
        const signalsOrderedByEventId = orderBy(signals, 'signal.parent.id', 'asc');

        expect(signalsOrderedByEventId.length).equal(2);
      });
    });
  });
};
