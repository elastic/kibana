/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  ALERT_REASON,
  ALERT_RISK_SCORE,
  ALERT_RULE_NAME,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_RULE_ID,
  ALERT_RULE_RULE_NAME_OVERRIDE,
  ALERT_RULE_UUID,
  ALERT_SEVERITY,
  ALERT_WORKFLOW_STATUS,
  EVENT_ACTION,
  EVENT_KIND,
} from '@kbn/rule-data-utils';
import { flattenWithPrefix } from '@kbn/securitysolution-rules';

import { orderBy, get } from 'lodash';

import { RuleExecutionStatus } from '../../../../plugins/security_solution/common/detection_engine/schemas/common';
import {
  EqlCreateSchema,
  QueryCreateSchema,
  SavedQueryCreateSchema,
  ThresholdCreateSchema,
} from '../../../../plugins/security_solution/common/detection_engine/schemas/request';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createRule,
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getEqlRuleForSignalTesting,
  getOpenSignals,
  getRuleForSignalTesting,
  getSignalsByIds,
  getSignalsByRuleIds,
  getSimpleRule,
  getThresholdRuleForSignalTesting,
  waitForRuleSuccessOrStatus,
  waitForSignalsToBePresent,
} from '../../utils';
import { Ancestor } from '../../../../plugins/security_solution/server/lib/detection_engine/signals/types';
import {
  ALERT_ANCESTORS,
  ALERT_DEPTH,
  ALERT_ORIGINAL_TIME,
  ALERT_ORIGINAL_EVENT,
  ALERT_ORIGINAL_EVENT_CATEGORY,
  ALERT_GROUP_ID,
  ALERT_THRESHOLD_RESULT,
} from '../../../../plugins/security_solution/common/field_maps/field_names';
import { DETECTION_ENGINE_RULES_URL } from '../../../../plugins/security_solution/common/constants';

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
  const log = getService('log');

  describe('Generating signals from source indexes', () => {
    beforeEach(async () => {
      await deleteSignalsIndex(supertest, log);
      await createSignalsIndex(supertest, log);
    });

    afterEach(async () => {
      await deleteSignalsIndex(supertest, log);
      await deleteAllAlerts(supertest, log);
    });

    describe('Signals from audit beat are of the expected structure', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/hosts');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/hosts');
      });

      it('should have the specific audit record for _id or none of these tests below will pass', async () => {
        const rule: QueryCreateSchema = {
          ...getRuleForSignalTesting(['auditbeat-*']),
          query: `_id:${ID}`,
        };
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 1, [id]);
        const signalsOpen = await getSignalsByIds(supertest, log, [id]);
        expect(signalsOpen.hits.hits.length).greaterThan(0);
      });

      it('should abide by max_signals > 100', async () => {
        const maxSignals = 500;
        const rule: QueryCreateSchema = {
          ...getRuleForSignalTesting(['auditbeat-*']),
          max_signals: maxSignals,
        };
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, maxSignals, [id]);
        const signalsOpen = await getSignalsByIds(supertest, log, [id], maxSignals);
        expect(signalsOpen.hits.hits.length).equal(maxSignals);
      });

      it('should have recorded the rule_id within the signal', async () => {
        const rule: QueryCreateSchema = {
          ...getRuleForSignalTesting(['auditbeat-*']),
          query: `_id:${ID}`,
        };
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 1, [id]);
        const signalsOpen = await getSignalsByIds(supertest, log, [id]);
        expect(signalsOpen.hits.hits[0]._source![ALERT_RULE_RULE_ID]).eql(getSimpleRule().rule_id);
      });

      it('should query and get back expected signal structure using a basic KQL query', async () => {
        const rule: QueryCreateSchema = {
          ...getRuleForSignalTesting(['auditbeat-*']),
          query: `_id:${ID}`,
        };
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 1, [id]);
        const signalsOpen = await getSignalsByIds(supertest, log, [id]);
        const signal = signalsOpen.hits.hits[0]._source!;

        expect(signal).eql({
          ...signal,
          [ALERT_ANCESTORS]: [
            {
              id: 'BhbXBmkBR346wHgn4PeZ',
              type: 'event',
              index: 'auditbeat-8.0.0-2019.02.19-000001',
              depth: 0,
            },
          ],
          [ALERT_WORKFLOW_STATUS]: 'open',
          [ALERT_DEPTH]: 1,
          [ALERT_ORIGINAL_TIME]: '2019-02-19T17:40:03.790Z',
          ...flattenWithPrefix(ALERT_ORIGINAL_EVENT, {
            action: 'socket_closed',
            dataset: 'socket',
            kind: 'event',
            module: 'system',
          }),
        });
      });

      it('should query and get back expected signal structure using a saved query rule', async () => {
        const rule: SavedQueryCreateSchema = {
          ...getRuleForSignalTesting(['auditbeat-*']),
          type: 'saved_query',
          query: `_id:${ID}`,
          saved_id: 'doesnt-exist',
        };
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 1, [id]);
        const signalsOpen = await getSignalsByIds(supertest, log, [id]);
        const signal = signalsOpen.hits.hits[0]._source!;
        expect(signal).eql({
          ...signal,
          [ALERT_ANCESTORS]: [
            {
              id: 'BhbXBmkBR346wHgn4PeZ',
              type: 'event',
              index: 'auditbeat-8.0.0-2019.02.19-000001',
              depth: 0,
            },
          ],
          [ALERT_WORKFLOW_STATUS]: 'open',
          [ALERT_DEPTH]: 1,
          [ALERT_ORIGINAL_TIME]: '2019-02-19T17:40:03.790Z',
          ...flattenWithPrefix(ALERT_ORIGINAL_EVENT, {
            action: 'socket_closed',
            dataset: 'socket',
            kind: 'event',
            module: 'system',
          }),
        });
      });

      it('should query and get back expected signal structure when it is a signal on a signal', async () => {
        const rule: QueryCreateSchema = {
          ...getRuleForSignalTesting(['auditbeat-*']),
          query: `_id:${ID}`,
        };
        const { id: createdId } = await createRule(supertest, log, rule);
        await waitForRuleSuccessOrStatus(supertest, log, createdId);
        await waitForSignalsToBePresent(supertest, log, 1, [createdId]);

        // Run signals on top of that 1 signal which should create a single signal (on top of) a signal
        const ruleForSignals: QueryCreateSchema = {
          ...getRuleForSignalTesting([`.alerts-security.alerts-default*`]),
          rule_id: 'signal-on-signal',
        };

        const { id } = await createRule(supertest, log, ruleForSignals);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 1, [id]);

        // Get our single signal on top of a signal
        const signalsOpen = await getSignalsByRuleIds(supertest, log, ['signal-on-signal']);

        const signal = signalsOpen.hits.hits[0]._source!;
        expect(signal).eql({
          ...signal,
          [ALERT_ANCESTORS]: [
            {
              id: 'BhbXBmkBR346wHgn4PeZ',
              type: 'event',
              index: 'auditbeat-8.0.0-2019.02.19-000001',
              depth: 0,
            },
            {
              ...(signal[ALERT_ANCESTORS] as Ancestor[])[1],
              type: 'signal',
              index: '.internal.alerts-security.alerts-default-000001',
              depth: 1,
            },
          ],
          [ALERT_WORKFLOW_STATUS]: 'open',
          [ALERT_DEPTH]: 2,
          [ALERT_ORIGINAL_TIME]: signal[ALERT_ORIGINAL_TIME], // original_time will always be changing sine it's based on a signal created here, so skip testing it
          ...flattenWithPrefix(ALERT_ORIGINAL_EVENT, {
            action: 'socket_closed',
            dataset: 'socket',
            kind: 'signal',
            module: 'system',
          }),
        });
      });

      describe('EQL Rules', () => {
        it('generates a correctly formatted signal from EQL non-sequence queries', async () => {
          const rule: EqlCreateSchema = {
            ...getEqlRuleForSignalTesting(['auditbeat-*']),
            query: 'configuration where agent.id=="a1d7b39c-f898-4dbe-a761-efb61939302d"',
          };
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 1, [id]);
          const signals = await getSignalsByIds(supertest, log, [id]);
          expect(signals.hits.hits.length).eql(1);
          const fullSignal = signals.hits.hits[0]._source;
          if (!fullSignal) {
            return expect(fullSignal).to.be.ok();
          }

          expect(fullSignal).eql({
            ...fullSignal,
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
            ...flattenWithPrefix('event', {
              action: 'changed-audit-configuration',
              category: 'configuration',
              module: 'auditd',
              kind: 'signal',
            }),
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
            [ALERT_REASON]:
              'configuration event on suricata-zeek-sensor-toronto created high alert Signal Testing Query.',
            [ALERT_RULE_UUID]: fullSignal[ALERT_RULE_UUID],
            [ALERT_ORIGINAL_TIME]: fullSignal[ALERT_ORIGINAL_TIME],
            [ALERT_WORKFLOW_STATUS]: 'open',
            [ALERT_DEPTH]: 1,
            [ALERT_ANCESTORS]: [
              {
                depth: 0,
                id: '9xbRBmkBR346wHgngz2D',
                index: 'auditbeat-8.0.0-2019.02.19-000001',
                type: 'event',
              },
            ],
            ...flattenWithPrefix(ALERT_ORIGINAL_EVENT, {
              action: 'changed-audit-configuration',
              category: 'configuration',
              module: 'auditd',
            }),
          });
        });

        it('generates up to max_signals for non-sequence EQL queries', async () => {
          const rule: EqlCreateSchema = getEqlRuleForSignalTesting(['auditbeat-*']);
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 100, [id]);
          const signals = await getSignalsByIds(supertest, log, [id], 1000);
          const filteredSignals = signals.hits.hits.filter(
            (signal) => signal._source?.[ALERT_DEPTH] === 1
          );
          expect(filteredSignals.length).eql(100);
        });

        it('uses the provided event_category_override', async () => {
          const rule: EqlCreateSchema = {
            ...getEqlRuleForSignalTesting(['auditbeat-*']),
            query: 'config_change where agent.id=="a1d7b39c-f898-4dbe-a761-efb61939302d"',
            event_category_override: 'auditd.message_type',
          };
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 1, [id]);
          const signals = await getSignalsByIds(supertest, log, [id]);
          expect(signals.hits.hits.length).eql(1);
          const fullSignal = signals.hits.hits[0]._source;
          if (!fullSignal) {
            return expect(fullSignal).to.be.ok();
          }

          expect(fullSignal).eql({
            ...fullSignal,
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
            ...flattenWithPrefix('event', {
              action: 'changed-audit-configuration',
              category: 'configuration',
              module: 'auditd',
              kind: 'signal',
            }),
            service: {
              type: 'auditd',
            },
            user: {
              audit: {
                id: 'unset',
              },
            },
            [ALERT_REASON]:
              'configuration event on suricata-zeek-sensor-toronto created high alert Signal Testing Query.',
            [ALERT_RULE_UUID]: fullSignal[ALERT_RULE_UUID],
            [ALERT_ORIGINAL_TIME]: fullSignal[ALERT_ORIGINAL_TIME],
            [ALERT_WORKFLOW_STATUS]: 'open',
            [ALERT_DEPTH]: 1,
            [ALERT_ANCESTORS]: [
              {
                depth: 0,
                id: '9xbRBmkBR346wHgngz2D',
                index: 'auditbeat-8.0.0-2019.02.19-000001',
                type: 'event',
              },
            ],
            ...flattenWithPrefix(ALERT_ORIGINAL_EVENT, {
              action: 'changed-audit-configuration',
              category: 'configuration',
              module: 'auditd',
            }),
          });
        });

        it('generates building block signals from EQL sequences in the expected form', async () => {
          const rule: EqlCreateSchema = {
            ...getEqlRuleForSignalTesting(['auditbeat-*']),
            query: 'sequence by host.name [anomoly where true] [any where true]', // TODO: spelling
          };
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 3, [id]);
          const signals = await getSignalsByIds(supertest, log, [id]);
          const buildingBlock = signals.hits.hits.find(
            (signal) =>
              signal._source?.[ALERT_DEPTH] === 1 &&
              get(signal._source, ALERT_ORIGINAL_EVENT_CATEGORY) === 'anomoly'
          );
          expect(buildingBlock).not.eql(undefined);
          const fullSignal = buildingBlock?._source;
          if (!fullSignal) {
            return expect(fullSignal).to.be.ok();
          }

          expect(fullSignal).eql({
            ...fullSignal,
            agent: {
              ephemeral_id: '1b4978a0-48be-49b1-ac96-323425b389ab',
              hostname: 'zeek-sensor-amsterdam',
              id: 'e52588e6-7aa3-4c89-a2c4-d6bc5c286db1',
              type: 'auditbeat',
              version: '8.0.0',
            },
            auditd: {
              data: {
                a0: '3',
                a1: '107',
                a2: '1',
                a3: '7ffc186b58e0',
                arch: 'x86_64',
                auid: 'unset',
                dev: 'eth0',
                exit: '0',
                gid: '0',
                old_prom: '0',
                prom: '256',
                ses: 'unset',
                syscall: 'setsockopt',
                tty: '(none)',
                uid: '0',
              },
              message_type: 'anom_promiscuous',
              result: 'success',
              sequence: 1392,
              session: 'unset',
              summary: {
                actor: {
                  primary: 'unset',
                  secondary: 'root',
                },
                how: '/usr/bin/bro',
                object: {
                  primary: 'eth0',
                  type: 'network-device',
                },
              },
            },
            cloud: { instance: { id: '133551048' }, provider: 'digitalocean', region: 'ams3' },
            ecs: { version: '1.0.0-beta2' },
            ...flattenWithPrefix('event', {
              action: 'changed-promiscuous-mode-on-device',
              category: 'anomoly',
              module: 'auditd',
              kind: 'signal',
            }),
            host: {
              architecture: 'x86_64',
              containerized: false,
              hostname: 'zeek-sensor-amsterdam',
              id: '2ce8b1e7d69e4a1d9c6bcddc473da9d9',
              name: 'zeek-sensor-amsterdam',
              os: {
                codename: 'bionic',
                family: 'debian',
                kernel: '4.15.0-45-generic',
                name: 'Ubuntu',
                platform: 'ubuntu',
                version: '18.04.2 LTS (Bionic Beaver)',
              },
            },
            process: {
              executable: '/usr/bin/bro',
              name: 'bro',
              pid: 30157,
              ppid: 30151,
              title:
                '/usr/bin/bro -i eth0 -U .status -p broctl -p broctl-live -p standalone -p local -p bro local.bro broctl broctl/standalone broctl',
            },
            service: { type: 'auditd' },
            user: {
              audit: { id: 'unset' },
              effective: {
                group: {
                  id: '0',
                  name: 'root',
                },
                id: '0',
                name: 'root',
              },
              filesystem: {
                group: {
                  id: '0',
                  name: 'root',
                },
                id: '0',
                name: 'root',
              },
              group: { id: '0', name: 'root' },
              id: '0',
              name: 'root',
              saved: {
                group: {
                  id: '0',
                  name: 'root',
                },
                id: '0',
                name: 'root',
              },
            },
            [ALERT_REASON]:
              'anomoly event with process bro, by root on zeek-sensor-amsterdam created high alert Signal Testing Query.',
            [ALERT_RULE_UUID]: fullSignal[ALERT_RULE_UUID],
            [ALERT_GROUP_ID]: fullSignal[ALERT_GROUP_ID],
            [ALERT_ORIGINAL_TIME]: fullSignal[ALERT_ORIGINAL_TIME],
            [ALERT_WORKFLOW_STATUS]: 'open',
            [ALERT_DEPTH]: 1,
            [ALERT_ANCESTORS]: [
              {
                depth: 0,
                id: 'VhXOBmkBR346wHgnLP8T',
                index: 'auditbeat-8.0.0-2019.02.19-000001',
                type: 'event',
              },
            ],
            ...flattenWithPrefix(ALERT_ORIGINAL_EVENT, {
              action: 'changed-promiscuous-mode-on-device',
              category: 'anomoly',
              module: 'auditd',
            }),
          });
        });

        it('generates shell signals from EQL sequences in the expected form', async () => {
          const rule: EqlCreateSchema = {
            ...getEqlRuleForSignalTesting(['auditbeat-*']),
            query: 'sequence by host.name [anomoly where true] [any where true]',
          };
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 3, [id]);
          const signalsOpen = await getSignalsByIds(supertest, log, [id]);
          const sequenceSignal = signalsOpen.hits.hits.find(
            (signal) => signal._source?.[ALERT_DEPTH] === 2
          );
          const source = sequenceSignal?._source;
          if (!source) {
            return expect(source).to.be.ok();
          }
          const eventIds = (source?.[ALERT_ANCESTORS] as Ancestor[])
            .filter((event) => event.depth === 1)
            .map((event) => event.id);
          expect(source).eql({
            ...source,
            agent: {
              ephemeral_id: '1b4978a0-48be-49b1-ac96-323425b389ab',
              hostname: 'zeek-sensor-amsterdam',
              id: 'e52588e6-7aa3-4c89-a2c4-d6bc5c286db1',
              type: 'auditbeat',
              version: '8.0.0',
            },
            auditd: { session: 'unset', summary: { actor: { primary: 'unset' } } },
            cloud: { instance: { id: '133551048' }, provider: 'digitalocean', region: 'ams3' },
            ecs: { version: '1.0.0-beta2' },
            [EVENT_KIND]: 'signal',
            host: {
              architecture: 'x86_64',
              containerized: false,
              hostname: 'zeek-sensor-amsterdam',
              id: '2ce8b1e7d69e4a1d9c6bcddc473da9d9',
              name: 'zeek-sensor-amsterdam',
              os: {
                codename: 'bionic',
                family: 'debian',
                kernel: '4.15.0-45-generic',
                name: 'Ubuntu',
                platform: 'ubuntu',
                version: '18.04.2 LTS (Bionic Beaver)',
              },
            },
            service: { type: 'auditd' },
            user: { audit: { id: 'unset' }, id: '0', name: 'root' },
            [ALERT_WORKFLOW_STATUS]: 'open',
            [ALERT_DEPTH]: 2,
            [ALERT_GROUP_ID]: source[ALERT_GROUP_ID],
            [ALERT_REASON]:
              'event by root on zeek-sensor-amsterdam created high alert Signal Testing Query.',
            [ALERT_RULE_UUID]: source[ALERT_RULE_UUID],
            [ALERT_ANCESTORS]: [
              {
                depth: 0,
                id: 'VhXOBmkBR346wHgnLP8T',
                index: 'auditbeat-8.0.0-2019.02.19-000001',
                type: 'event',
              },
              {
                depth: 1,
                id: eventIds[0],
                index: '',
                rule: source[ALERT_RULE_UUID],
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
                index: '',
                rule: source[ALERT_RULE_UUID],
                type: 'signal',
              },
            ],
          });
        });

        it('generates up to max_signals with an EQL rule', async () => {
          const rule: EqlCreateSchema = {
            ...getEqlRuleForSignalTesting(['auditbeat-*']),
            query: 'sequence by host.name [any where true] [any where true]',
          };
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          // For EQL rules, max_signals is the maximum number of detected sequences: each sequence has a building block
          // alert for each event in the sequence, so max_signals=100 results in 200 building blocks in addition to
          // 100 regular alerts
          await waitForSignalsToBePresent(supertest, log, 300, [id]);
          const signalsOpen = await getSignalsByIds(supertest, log, [id], 1000);
          expect(signalsOpen.hits.hits.length).eql(300);
          const shellSignals = signalsOpen.hits.hits.filter(
            (signal) => signal._source?.[ALERT_DEPTH] === 2
          );
          const buildingBlocks = signalsOpen.hits.hits.filter(
            (signal) => signal._source?.[ALERT_DEPTH] === 1
          );
          expect(shellSignals.length).eql(100);
          expect(buildingBlocks.length).eql(200);
        });

        it('generates signals when an index name contains special characters to encode', async () => {
          const rule: EqlCreateSchema = {
            ...getEqlRuleForSignalTesting(['auditbeat-*', '<my-index-{now/d}*>']),
            query: 'configuration where agent.id=="a1d7b39c-f898-4dbe-a761-efb61939302d"',
          };
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 1, [id]);
          const signals = await getSignalsByIds(supertest, log, [id]);
          expect(signals.hits.hits.length).eql(1);
        });
      });

      describe('Threshold Rules', () => {
        it('generates 1 signal from Threshold rules when threshold is met', async () => {
          const rule: ThresholdCreateSchema = {
            ...getThresholdRuleForSignalTesting(['auditbeat-*']),
            threshold: {
              field: ['host.id'],
              value: 700,
            },
          };
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 1, [id]);
          const signalsOpen = await getSignalsByIds(supertest, log, [id]);
          expect(signalsOpen.hits.hits.length).eql(1);
          const fullSignal = signalsOpen.hits.hits[0]._source;
          if (!fullSignal) {
            return expect(fullSignal).to.be.ok();
          }
          const eventIds = (fullSignal?.[ALERT_ANCESTORS] as Ancestor[]).map((event) => event.id);
          expect(fullSignal).eql({
            ...fullSignal,
            'host.id': '8cc95778cce5407c809480e8e32ad76b',
            [EVENT_KIND]: 'signal',
            [ALERT_ANCESTORS]: [
              {
                depth: 0,
                id: eventIds[0],
                index: 'auditbeat-*',
                type: 'event',
              },
            ],
            [ALERT_WORKFLOW_STATUS]: 'open',
            [ALERT_REASON]: 'event created high alert Signal Testing Query.',
            [ALERT_RULE_UUID]: fullSignal[ALERT_RULE_UUID],
            [ALERT_ORIGINAL_TIME]: fullSignal[ALERT_ORIGINAL_TIME],
            [ALERT_DEPTH]: 1,
            [ALERT_THRESHOLD_RESULT]: {
              terms: [
                {
                  field: 'host.id',
                  value: '8cc95778cce5407c809480e8e32ad76b',
                },
              ],
              count: 788,
              from: '2019-02-19T07:12:05.332Z',
            },
          });
        });

        it('generates 2 signals from Threshold rules when threshold is met', async () => {
          const rule: ThresholdCreateSchema = {
            ...getThresholdRuleForSignalTesting(['auditbeat-*']),
            threshold: {
              field: 'host.id',
              value: 100,
            },
          };
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 2, [id]);
          const signalsOpen = await getSignalsByIds(supertest, log, [id]);
          expect(signalsOpen.hits.hits.length).eql(2);
        });

        it('applies the provided query before bucketing ', async () => {
          const rule: ThresholdCreateSchema = {
            ...getThresholdRuleForSignalTesting(['auditbeat-*']),
            query: 'host.id:"2ab45fc1c41e4c84bbd02202a7e5761f"',
            threshold: {
              field: 'process.name',
              value: 21,
            },
          };
          const { id } = await createRule(supertest, log, rule);
          await waitForRuleSuccessOrStatus(supertest, log, id);
          await waitForSignalsToBePresent(supertest, log, 1, [id]);
          const signalsOpen = await getSignalsByIds(supertest, log, [id]);
          expect(signalsOpen.hits.hits.length).eql(1);
        });

        it('generates no signals from Threshold rules when threshold is met and cardinality is not met', async () => {
          const rule: ThresholdCreateSchema = {
            ...getThresholdRuleForSignalTesting(['auditbeat-*']),
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
          const createdRule = await createRule(supertest, log, rule);
          const signalsOpen = await getOpenSignals(supertest, log, es, createdRule);
          expect(signalsOpen.hits.hits.length).eql(0);
        });

        it('generates no signals from Threshold rules when cardinality is met and threshold is not met', async () => {
          const rule: ThresholdCreateSchema = {
            ...getThresholdRuleForSignalTesting(['auditbeat-*']),
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
          const createdRule = await createRule(supertest, log, rule);
          const signalsOpen = await getOpenSignals(supertest, log, es, createdRule);
          expect(signalsOpen.hits.hits.length).eql(0);
        });

        it('generates signals from Threshold rules when threshold and cardinality are both met', async () => {
          const rule: ThresholdCreateSchema = {
            ...getThresholdRuleForSignalTesting(['auditbeat-*']),
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
          const createdRule = await createRule(supertest, log, rule);
          const signalsOpen = await getOpenSignals(supertest, log, es, createdRule);
          expect(signalsOpen.hits.hits.length).eql(1);
          const fullSignal = signalsOpen.hits.hits[0]._source;
          if (!fullSignal) {
            return expect(fullSignal).to.be.ok();
          }
          const eventIds = (fullSignal?.[ALERT_ANCESTORS] as Ancestor[]).map((event) => event.id);
          expect(fullSignal).eql({
            ...fullSignal,
            'host.id': '8cc95778cce5407c809480e8e32ad76b',
            [EVENT_KIND]: 'signal',
            [ALERT_ANCESTORS]: [
              {
                depth: 0,
                id: eventIds[0],
                index: 'auditbeat-*',
                type: 'event',
              },
            ],
            [ALERT_WORKFLOW_STATUS]: 'open',
            [ALERT_REASON]: `event created high alert Signal Testing Query.`,
            [ALERT_RULE_UUID]: fullSignal[ALERT_RULE_UUID],
            [ALERT_ORIGINAL_TIME]: fullSignal[ALERT_ORIGINAL_TIME],
            [ALERT_DEPTH]: 1,
            [ALERT_THRESHOLD_RESULT]: {
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
              from: '2019-02-19T07:12:05.332Z',
            },
          });
        });

        it('should not generate signals if only one field meets the threshold requirement', async () => {
          const rule: ThresholdCreateSchema = {
            ...getThresholdRuleForSignalTesting(['auditbeat-*']),
            threshold: {
              field: ['host.id', 'process.name'],
              value: 22,
            },
          };
          const createdRule = await createRule(supertest, log, rule);
          const signalsOpen = await getOpenSignals(supertest, log, es, createdRule);
          expect(signalsOpen.hits.hits.length).eql(0);
        });

        it('generates signals from Threshold rules when bucketing by multiple fields', async () => {
          const rule: ThresholdCreateSchema = {
            ...getThresholdRuleForSignalTesting(['auditbeat-*']),
            threshold: {
              field: ['host.id', 'process.name', 'event.module'],
              value: 21,
            },
          };
          const createdRule = await createRule(supertest, log, rule);
          const signalsOpen = await getOpenSignals(supertest, log, es, createdRule);
          expect(signalsOpen.hits.hits.length).eql(1);
          const fullSignal = signalsOpen.hits.hits[0]._source;
          if (!fullSignal) {
            return expect(fullSignal).to.be.ok();
          }
          const eventIds = (fullSignal[ALERT_ANCESTORS] as Ancestor[]).map((event) => event.id);
          expect(fullSignal).eql({
            ...fullSignal,
            'event.module': 'system',
            'host.id': '2ab45fc1c41e4c84bbd02202a7e5761f',
            'process.name': 'sshd',
            [EVENT_KIND]: 'signal',
            [ALERT_ANCESTORS]: [
              {
                depth: 0,
                id: eventIds[0],
                index: 'auditbeat-*',
                type: 'event',
              },
            ],
            [ALERT_WORKFLOW_STATUS]: 'open',
            [ALERT_REASON]: `event created high alert Signal Testing Query.`,
            [ALERT_RULE_UUID]: fullSignal[ALERT_RULE_UUID],
            [ALERT_ORIGINAL_TIME]: fullSignal[ALERT_ORIGINAL_TIME],
            [ALERT_DEPTH]: 1,
            [ALERT_THRESHOLD_RESULT]: {
              terms: [
                {
                  field: 'host.id',
                  value: '2ab45fc1c41e4c84bbd02202a7e5761f',
                },
                {
                  field: 'process.name',
                  value: 'sshd',
                },
                {
                  field: 'event.module',
                  value: 'system',
                },
              ],
              count: 21,
              from: '2019-02-19T20:22:03.561Z',
            },
          });
        });
      });
    });

    /**
     * Here we test the functionality of Severity and Risk Score overrides (also called "mappings"
     * in the code). If the rule specifies a mapping, then the final Severity or Risk Score
     * value of the signal will be taken from the mapped field of the source event.
     */
    describe('Signals generated from events with custom severity and risk score fields', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/signals/severity_risk_overrides');
      });

      after(async () => {
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/signals/severity_risk_overrides'
        );
      });

      const executeRuleAndGetSignals = async (rule: QueryCreateSchema) => {
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 4, [id]);
        const signalsResponse = await getSignalsByIds(supertest, log, [id]);
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
          expect(s?.[ALERT_SEVERITY]).equal('medium');
          expect(s?.[ALERT_RULE_PARAMETERS].severity_mapping).eql([]);

          expect(s?.[ALERT_RISK_SCORE]).equal(75);
          expect(s?.[ALERT_RULE_PARAMETERS].risk_score_mapping).eql([]);
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
          id: (s?.[ALERT_ANCESTORS] as Ancestor[])[0].id,
          value: s?.[ALERT_SEVERITY],
        }));

        expect(signals.length).equal(4);
        expect(severities).eql([
          { id: '1', value: 'high' },
          { id: '2', value: 'critical' },
          { id: '3', value: 'critical' },
          { id: '4', value: 'critical' },
        ]);

        signals.forEach((s) => {
          expect(s?.[ALERT_RISK_SCORE]).equal(75);
          expect(s?.[ALERT_RULE_PARAMETERS].risk_score_mapping).eql([]);
          expect(s?.[ALERT_RULE_PARAMETERS].severity_mapping).eql([
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
          id: (s?.[ALERT_ANCESTORS] as Ancestor[])[0].id,
          value: s?.[ALERT_RISK_SCORE],
        }));

        expect(signals.length).equal(4);
        expect(riskScores).eql([
          { id: '1', value: 31.14 },
          { id: '2', value: 32.14 },
          { id: '3', value: 33.14 },
          { id: '4', value: 34.14 },
        ]);

        signals.forEach((s) => {
          expect(s?.[ALERT_SEVERITY]).equal('medium');
          expect(s?.[ALERT_RULE_PARAMETERS].severity_mapping).eql([]);
          expect(s?.[ALERT_RULE_PARAMETERS].risk_score_mapping).eql([
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
          id: (s?.[ALERT_ANCESTORS] as Ancestor[])[0].id,
          severity: s?.[ALERT_SEVERITY],
          risk: s?.[ALERT_RISK_SCORE],
        }));

        expect(signals.length).equal(4);
        expect(values).eql([
          { id: '1', severity: 'high', risk: 31.14 },
          { id: '2', severity: 'critical', risk: 32.14 },
          { id: '3', severity: 'critical', risk: 33.14 },
          { id: '4', severity: 'critical', risk: 34.14 },
        ]);

        signals.forEach((s) => {
          expect(s?.[ALERT_RULE_PARAMETERS].severity_mapping).eql([
            { field: 'my_severity', operator: 'equals', value: 'sev_900', severity: 'high' },
            { field: 'my_severity', operator: 'equals', value: 'sev_max', severity: 'critical' },
          ]);
          expect(s?.[ALERT_RULE_PARAMETERS].risk_score_mapping).eql([
            { field: 'my_risk', operator: 'equals', value: '' },
          ]);
        });
      });
    });

    describe('Signals generated from events with name override field', async () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/hosts');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/hosts');
      });

      beforeEach(async () => {
        await deleteSignalsIndex(supertest, log);
        await createSignalsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest, log);
        await deleteAllAlerts(supertest, log);
      });

      it('should generate signals with name_override field', async () => {
        const rule: QueryCreateSchema = {
          ...getRuleForSignalTesting(['auditbeat-*']),
          rule_name_override: 'event.action',
        };

        const { id } = await createRule(supertest, log, rule);

        await waitForRuleSuccessOrStatus(supertest, log, id);
        await waitForSignalsToBePresent(supertest, log, 1, [id]);
        const signalsResponse = await getSignalsByIds(supertest, log, [id], 1);
        const signals = signalsResponse.hits.hits.map((hit) => hit._source);
        const signalsOrderedByEventId = orderBy(signals, 'signal.parent.id', 'asc');
        const fullSignal = signalsOrderedByEventId[0];
        if (!fullSignal) {
          return expect(fullSignal).to.be.ok();
        }

        expect(fullSignal).eql({
          ...fullSignal,
          [EVENT_ACTION]: 'boot',
          [ALERT_ANCESTORS]: [
            {
              depth: 0,
              id: 'UBXOBmkBR346wHgnLP8T',
              index: 'auditbeat-8.0.0-2019.02.19-000001',
              type: 'event',
            },
          ],
          [ALERT_WORKFLOW_STATUS]: 'open',
          [ALERT_REASON]: `event on zeek-sensor-amsterdam created high alert boot.`,
          [ALERT_RULE_NAME]: 'boot',
          [ALERT_RULE_RULE_NAME_OVERRIDE]: 'event.action',
          [ALERT_DEPTH]: 1,
          ...flattenWithPrefix(ALERT_ORIGINAL_EVENT, {
            action: 'boot',
            dataset: 'login',
            kind: 'event',
            module: 'system',
            origin: '/var/log/wtmp',
          }),
        });
      });
    });

    describe('Signal deduplication', async () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/hosts');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/hosts');
      });

      beforeEach(async () => {
        await deleteSignalsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest, log);
        await deleteAllAlerts(supertest, log);
      });

      it('should not generate duplicate signals', async () => {
        const rule: QueryCreateSchema = {
          ...getRuleForSignalTesting(['auditbeat-*']),
          query: `_id:${ID}`,
        };

        const ruleResponse = await createRule(supertest, log, rule);

        const signals = await getOpenSignals(supertest, log, es, ruleResponse);
        expect(signals.hits.hits.length).to.eql(1);

        const statusResponse = await supertest
          .get(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .query({ id: ruleResponse.id });

        // TODO: https://github.com/elastic/kibana/pull/121644 clean up, make type-safe
        const ruleStatusDate = statusResponse.body?.execution_summary?.last_execution.date;
        const initialStatusDate = new Date(ruleStatusDate);

        const initialSignal = signals.hits.hits[0];

        // Disable the rule then re-enable to trigger another run
        await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({ rule_id: ruleResponse.rule_id, enabled: false })
          .expect(200);

        await supertest
          .patch(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .send({ rule_id: ruleResponse.rule_id, enabled: true })
          .expect(200);

        await waitForRuleSuccessOrStatus(
          supertest,
          log,
          ruleResponse.id,
          RuleExecutionStatus.succeeded,
          initialStatusDate
        );

        const newSignals = await getOpenSignals(supertest, log, es, ruleResponse);
        expect(newSignals.hits.hits.length).to.eql(1);
        expect(newSignals.hits.hits[0]).to.eql(initialSignal);
      });
    });
  });
};
