/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  ALERT_REASON,
  ALERT_RULE_UUID,
  ALERT_WORKFLOW_STATUS,
  EVENT_KIND,
} from '@kbn/rule-data-utils';
import { flattenWithPrefix } from '@kbn/securitysolution-rules';

import { get } from 'lodash';

import { EqlRuleCreateProps } from '@kbn/security-solution-plugin/common/detection_engine/rule_schema';
import { Ancestor } from '@kbn/security-solution-plugin/server/lib/detection_engine/signals/types';
import {
  ALERT_ANCESTORS,
  ALERT_DEPTH,
  ALERT_ORIGINAL_TIME,
  ALERT_ORIGINAL_EVENT,
  ALERT_ORIGINAL_EVENT_CATEGORY,
  ALERT_GROUP_ID,
} from '@kbn/security-solution-plugin/common/field_maps/field_names';
import {
  createRule,
  deleteAllAlerts,
  deleteSignalsIndex,
  getEqlRuleForSignalTesting,
  getOpenSignals,
  getPreviewAlerts,
  previewRule,
} from '../../utils';
import { FtrProviderContext } from '../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');

  describe('EQL type rules', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/hosts');
      await esArchiver.load(
        'x-pack/test/functional/es_archives/security_solution/timestamp_override_6'
      );
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/hosts');
      await esArchiver.unload(
        'x-pack/test/functional/es_archives/security_solution/timestamp_override_6'
      );
      await deleteSignalsIndex(supertest, log);
      await deleteAllAlerts(supertest, log);
    });

    // First test creates a real rule - remaining tests use preview API
    it('generates a correctly formatted signal from EQL non-sequence queries', async () => {
      const rule: EqlRuleCreateProps = {
        ...getEqlRuleForSignalTesting(['auditbeat-*']),
        query: 'configuration where agent.id=="a1d7b39c-f898-4dbe-a761-efb61939302d"',
      };
      const createdRule = await createRule(supertest, log, rule);
      const alerts = await getOpenSignals(supertest, log, es, createdRule);
      expect(alerts.hits.hits.length).eql(1);
      const fullSignal = alerts.hits.hits[0]._source;
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
      const maxSignals = 200;
      const rule: EqlRuleCreateProps = {
        ...getEqlRuleForSignalTesting(['auditbeat-*']),
        max_signals: maxSignals,
      };
      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId, size: maxSignals * 2 });
      expect(previewAlerts.length).eql(maxSignals);
    });

    it('uses the provided event_category_override', async () => {
      const rule: EqlRuleCreateProps = {
        ...getEqlRuleForSignalTesting(['auditbeat-*']),
        query: 'config_change where agent.id=="a1d7b39c-f898-4dbe-a761-efb61939302d"',
        event_category_override: 'auditd.message_type',
      };
      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });
      expect(previewAlerts.length).eql(1);
      const fullSignal = previewAlerts[0]._source;
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

    it('uses the provided timestamp_field', async () => {
      const rule: EqlRuleCreateProps = {
        ...getEqlRuleForSignalTesting(['fake.index.1']),
        query: 'any where true',
        timestamp_field: 'created_at',
      };
      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });
      expect(previewAlerts.length).eql(3);

      const createdAtHits = previewAlerts.map((hit) => hit._source?.created_at).sort();
      expect(createdAtHits).to.eql([1622676785, 1622676790, 1622676795]);
    });

    it('uses the provided tiebreaker_field', async () => {
      const rule: EqlRuleCreateProps = {
        ...getEqlRuleForSignalTesting(['fake.index.1']),
        query: 'any where true',
        tiebreaker_field: 'locale',
      };
      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });
      expect(previewAlerts.length).eql(3);

      const createdAtHits = previewAlerts.map((hit) => hit._source?.locale);
      expect(createdAtHits).to.eql(['es', 'pt', 'ua']);
    });

    it('generates building block signals from EQL sequences in the expected form', async () => {
      const rule: EqlRuleCreateProps = {
        ...getEqlRuleForSignalTesting(['auditbeat-*']),
        query: 'sequence by host.name [anomoly where true] [any where true]', // TODO: spelling
      };
      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });
      const buildingBlock = previewAlerts.find(
        (alert) =>
          alert._source?.[ALERT_DEPTH] === 1 &&
          get(alert._source, ALERT_ORIGINAL_EVENT_CATEGORY) === 'anomoly'
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
      const rule: EqlRuleCreateProps = {
        ...getEqlRuleForSignalTesting(['auditbeat-*']),
        query: 'sequence by host.name [anomoly where true] [any where true]',
      };
      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });
      const sequenceAlert = previewAlerts.find((alert) => alert._source?.[ALERT_DEPTH] === 2);
      const source = sequenceAlert?._source;
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
      const maxSignals = 200;
      const rule: EqlRuleCreateProps = {
        ...getEqlRuleForSignalTesting(['auditbeat-*']),
        query: 'sequence by host.name [any where true] [any where true]',
        max_signals: maxSignals,
      };
      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId, size: maxSignals * 5 });
      // For EQL rules, max_signals is the maximum number of detected sequences: each sequence has a building block
      // alert for each event in the sequence, so max_signals=200 results in 400 building blocks in addition to
      // 200 regular alerts
      expect(previewAlerts.length).eql(maxSignals * 3);
      const shellSignals = previewAlerts.filter((alert) => alert._source?.[ALERT_DEPTH] === 2);
      const buildingBlocks = previewAlerts.filter((alert) => alert._source?.[ALERT_DEPTH] === 1);
      expect(shellSignals.length).eql(maxSignals);
      expect(buildingBlocks.length).eql(maxSignals * 2);
    });

    it('generates signals when an index name contains special characters to encode', async () => {
      const rule: EqlRuleCreateProps = {
        ...getEqlRuleForSignalTesting(['auditbeat-*', '<my-index-{now/d}*>']),
        query: 'configuration where agent.id=="a1d7b39c-f898-4dbe-a761-efb61939302d"',
      };
      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });
      expect(previewAlerts.length).eql(1);
    });

    it('uses the provided filters', async () => {
      const rule: EqlRuleCreateProps = {
        ...getEqlRuleForSignalTesting(['auditbeat-*']),
        query: 'any where true',
        filters: [
          {
            meta: {
              alias: null,
              negate: false,
              disabled: false,
              type: 'phrase',
              key: 'source.ip',
              params: {
                query: '46.148.18.163',
              },
            },
            query: {
              match_phrase: {
                'source.ip': '46.148.18.163',
              },
            },
          },
          {
            meta: {
              alias: null,
              negate: false,
              disabled: false,
              type: 'phrase',
              key: 'event.action',
              params: {
                query: 'error',
              },
            },
            query: {
              match_phrase: {
                'event.action': 'error',
              },
            },
          },
        ],
      };
      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });
      expect(previewAlerts.length).eql(2);
    });

    describe('with host risk index', async () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/entity/host_risk');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/entity/host_risk');
      });

      it('should be enriched with host risk score', async () => {
        const rule: EqlRuleCreateProps = {
          ...getEqlRuleForSignalTesting(['auditbeat-*']),
          query: 'configuration where agent.id=="a1d7b39c-f898-4dbe-a761-efb61939302d"',
        };
        const { previewId } = await previewRule({ supertest, rule });
        const previewAlerts = await getPreviewAlerts({ es, previewId });
        expect(previewAlerts.length).eql(1);
        const fullSignal = previewAlerts[0]._source;
        if (!fullSignal) {
          return expect(fullSignal).to.be.ok();
        }
        expect(fullSignal?.host?.risk?.calculated_level).to.eql('Critical');
        expect(fullSignal?.host?.risk?.calculated_score_norm).to.eql(96);
      });
    });
  });
};
