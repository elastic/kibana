/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import expect from '@kbn/expect';
import {
  ALERT_REASON,
  ALERT_RULE_UUID,
  ALERT_WORKFLOW_STATUS,
  ALERT_WORKFLOW_TAGS,
  ALERT_WORKFLOW_ASSIGNEE_IDS,
  EVENT_KIND,
} from '@kbn/rule-data-utils';
import { flattenWithPrefix } from '@kbn/securitysolution-rules';

import { get } from 'lodash';

import { EqlRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { Ancestor } from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_types/types';
import {
  ALERT_ANCESTORS,
  ALERT_DEPTH,
  ALERT_ORIGINAL_TIME,
  ALERT_ORIGINAL_EVENT,
  ALERT_ORIGINAL_EVENT_CATEGORY,
  ALERT_GROUP_ID,
} from '@kbn/security-solution-plugin/common/field_maps/field_names';
import { getMaxSignalsWarning as getMaxAlertsWarning } from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_types/utils/utils';
import { ENABLE_ASSET_CRITICALITY_SETTING } from '@kbn/security-solution-plugin/common/constants';
import {
  getEqlRuleForAlertTesting,
  getOpenAlerts,
  getPreviewAlerts,
  previewRule,
  dataGeneratorFactory,
} from '../../../../utils';
import {
  createRule,
  deleteAllRules,
  deleteAllAlerts,
} from '../../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { EsArchivePathBuilder } from '../../../../../../es_archive_path_builder';

/**
 * Specific AGENT_ID to use for some of the tests. If the archiver changes and you see errors
 * here, update this to a new value of a chosen auditbeat record and update the tests values.
 */
const AGENT_ID = 'a1d7b39c-f898-4dbe-a761-efb61939302d';
const specificQueryForTests = `configuration where agent.id=="${AGENT_ID}"`;

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');
  const kibanaServer = getService('kibanaServer');

  // TODO: add a new service for loading archiver files similar to "getService('es')"
  const config = getService('config');
  const isServerless = config.get('serverless');
  const dataPathBuilder = new EsArchivePathBuilder(isServerless);
  const auditPath = dataPathBuilder.getPath('auditbeat/hosts');

  describe('@ess @serverless EQL type rules', () => {
    const { indexListOfDocuments } = dataGeneratorFactory({
      es,
      index: 'ecs_compliant',
      log,
    });

    before(async () => {
      await esArchiver.load(auditPath);
      await esArchiver.load(
        'x-pack/test/functional/es_archives/security_solution/timestamp_override_6'
      );
      await esArchiver.load('x-pack/test/functional/es_archives/security_solution/ecs_compliant');
    });

    after(async () => {
      await esArchiver.unload(auditPath);
      await esArchiver.unload(
        'x-pack/test/functional/es_archives/security_solution/timestamp_override_6'
      );
      await esArchiver.unload('x-pack/test/functional/es_archives/security_solution/ecs_compliant');
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
    });

    // First test creates a real rule - remaining tests use preview API
    it('generates a correctly formatted alert from EQL non-sequence queries', async () => {
      const rule: EqlRuleCreateProps = {
        ...getEqlRuleForAlertTesting(['auditbeat-*']),
        query: specificQueryForTests,
      };
      const createdRule = await createRule(supertest, log, rule);
      const alerts = await getOpenAlerts(supertest, log, es, createdRule);
      expect(alerts.hits.hits.length).eql(1);
      const fullAlert = alerts.hits.hits[0]._source;
      if (!fullAlert) {
        return expect(fullAlert).to.be.ok();
      }

      expect(fullAlert).eql({
        ...fullAlert,
        agent: {
          ephemeral_id: '0010d67a-14f7-41da-be30-489fea735967',
          hostname: 'suricata-zeek-sensor-toronto',
          id: AGENT_ID,
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
          'configuration event on suricata-zeek-sensor-toronto created high alert Alert Testing Query.',
        [ALERT_RULE_UUID]: fullAlert[ALERT_RULE_UUID],
        [ALERT_ORIGINAL_TIME]: fullAlert[ALERT_ORIGINAL_TIME],
        [ALERT_WORKFLOW_STATUS]: 'open',
        [ALERT_WORKFLOW_TAGS]: [],
        [ALERT_WORKFLOW_ASSIGNEE_IDS]: [],
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

    it('generates up to max_alerts for non-sequence EQL queries', async () => {
      const maxAlerts = 200;
      const rule: EqlRuleCreateProps = {
        ...getEqlRuleForAlertTesting(['auditbeat-*']),
        max_signals: maxAlerts,
      };
      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId, size: maxAlerts * 2 });
      expect(previewAlerts.length).eql(maxAlerts);
    });

    it('generates max alerts warning when circuit breaker is hit', async () => {
      const rule: EqlRuleCreateProps = {
        ...getEqlRuleForAlertTesting(['auditbeat-*']),
      };
      const { logs } = await previewRule({ supertest, rule });
      expect(logs[0].warnings).contain(getMaxAlertsWarning());
    });

    it('uses the provided event_category_override', async () => {
      const rule: EqlRuleCreateProps = {
        ...getEqlRuleForAlertTesting(['auditbeat-*']),
        query: `config_change where agent.id=="${AGENT_ID}"`,
        event_category_override: 'auditd.message_type',
      };
      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });
      expect(previewAlerts.length).eql(1);
      const fullAlert = previewAlerts[0]._source;
      if (!fullAlert) {
        return expect(fullAlert).to.be.ok();
      }

      expect(fullAlert).eql({
        ...fullAlert,
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
          'configuration event on suricata-zeek-sensor-toronto created high alert Alert Testing Query.',
        [ALERT_RULE_UUID]: fullAlert[ALERT_RULE_UUID],
        [ALERT_ORIGINAL_TIME]: fullAlert[ALERT_ORIGINAL_TIME],
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
        ...getEqlRuleForAlertTesting(['fake.index.1']),
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
        ...getEqlRuleForAlertTesting(['fake.index.1']),
        query: 'any where true',
        tiebreaker_field: 'locale',
      };
      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });
      expect(previewAlerts.length).eql(3);

      const createdAtHits = previewAlerts.map((hit) => hit._source?.locale);
      expect(createdAtHits).to.eql(['es', 'pt', 'ua']);
    });

    it('generates building block alerts from EQL sequences in the expected form', async () => {
      const rule: EqlRuleCreateProps = {
        ...getEqlRuleForAlertTesting(['auditbeat-*']),
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
      const fullAlert = buildingBlock?._source;
      if (!fullAlert) {
        return expect(fullAlert).to.be.ok();
      }

      expect(fullAlert).eql({
        ...fullAlert,
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
          'anomoly event with process bro, by root on zeek-sensor-amsterdam created high alert Alert Testing Query.',
        [ALERT_RULE_UUID]: fullAlert[ALERT_RULE_UUID],
        [ALERT_GROUP_ID]: fullAlert[ALERT_GROUP_ID],
        [ALERT_ORIGINAL_TIME]: fullAlert[ALERT_ORIGINAL_TIME],
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

    it('generates shell alerts from EQL sequences in the expected form', async () => {
      const rule: EqlRuleCreateProps = {
        ...getEqlRuleForAlertTesting(['auditbeat-*']),
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
          'event by root on zeek-sensor-amsterdam created high alert Alert Testing Query.',
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

    it('ensures common fields are present in generated shell alert', async () => {
      const id = uuidv4();
      const doc1 = {
        id,
        agent: {
          name: 'agent-1',
          type: 'auditbeat',
          version: '8.13.0',
        },
        client: {
          ip: ['127.0.0.1', '127.0.0.2'],
        },
        'host.name': 'host-0',
      };

      const doc2 = {
        id,
        agent: {
          name: 'agent-0',
          type: 'auditbeat',
          version: '8.13.0',
        },
        client: {
          ip: ['127.0.0.1', '127.0.0.3'],
        },
        'host.name': 'host-0',
      };

      await indexListOfDocuments([
        { '@timestamp': '2020-10-28T06:15:00.000Z', ...doc1 },
        { '@timestamp': '2020-10-28T06:16:00.000Z', ...doc2 },
      ]);

      const rule: EqlRuleCreateProps = {
        ...getEqlRuleForAlertTesting(['ecs_compliant']),
        query: `sequence [any where id == "${id}" ] [any where true]`,
        from: 'now-35m',
        interval: '30m',
      };
      const { previewId } = await previewRule({
        supertest,
        rule,
        timeframeEnd: new Date('2020-10-28T06:30:00.000Z'),
      });

      const previewAlerts = await getPreviewAlerts({ es, previewId, sort: ['agent.name'] });

      expect(previewAlerts).to.have.length(3);

      const buildingBlockAlerts = previewAlerts.filter(
        (alert) => alert._source?.['kibana.alert.building_block_type']
      );
      const shellAlert = previewAlerts.filter(
        (alert) => !alert._source?.['kibana.alert.building_block_type']
      )[0];

      // check building block alert retains all fields from source documents
      // alerts sorted by agent.name, so we assert it against agent-0 document
      expect(buildingBlockAlerts[0]._source).eql({
        ...buildingBlockAlerts[0]._source,
        ...doc2,
      });

      expect(buildingBlockAlerts[1]._source).eql({
        ...buildingBlockAlerts[1]._source,
        ...doc1,
      });

      // shell alert should have only common properties from building block alerts
      expect(shellAlert._source?.agent).eql({
        type: 'auditbeat',
        version: '8.13.0',
        // agent name is absent as this field is not common
      });
      // only common values in array are present
      expect(shellAlert._source?.client).eql({ ip: ['127.0.0.1'] });
      expect(shellAlert._source?.['host.name']).be('host-0');
    });

    it('generates up to max_alerts with an EQL rule', async () => {
      const maxAlerts = 200;
      const rule: EqlRuleCreateProps = {
        ...getEqlRuleForAlertTesting(['auditbeat-*']),
        query: 'sequence by host.name [any where true] [any where true]',
        max_signals: maxAlerts,
      };
      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId, size: maxAlerts * 5 });
      // For EQL rules, max_alerts is the maximum number of detected sequences: each sequence has a building block
      // alert for each event in the sequence, so max_alerts=200 results in 400 building blocks in addition to
      // 200 regular alerts
      expect(previewAlerts.length).eql(maxAlerts * 3);
      const shellAlerts = previewAlerts.filter((alert) => alert._source?.[ALERT_DEPTH] === 2);
      const buildingBlocks = previewAlerts.filter((alert) => alert._source?.[ALERT_DEPTH] === 1);
      expect(shellAlerts.length).eql(maxAlerts);
      expect(buildingBlocks.length).eql(maxAlerts * 2);
    });

    it('generates alerts when an index name contains special characters to encode', async () => {
      const rule: EqlRuleCreateProps = {
        ...getEqlRuleForAlertTesting(['auditbeat-*', '<my-index-{now/d}*>']),
        query: specificQueryForTests,
      };
      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });
      expect(previewAlerts.length).eql(1);
    });

    it('uses the provided filters', async () => {
      const rule: EqlRuleCreateProps = {
        ...getEqlRuleForAlertTesting(['auditbeat-*']),
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
        await esArchiver.load('x-pack/test/functional/es_archives/entity/risks');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/entity/risks');
      });

      it('should be enriched with host risk score', async () => {
        const rule: EqlRuleCreateProps = {
          ...getEqlRuleForAlertTesting(['auditbeat-*']),
          query: specificQueryForTests,
        };
        const { previewId } = await previewRule({ supertest, rule });
        const previewAlerts = await getPreviewAlerts({ es, previewId });
        expect(previewAlerts.length).eql(1);
        const fullAlert = previewAlerts[0]._source;
        if (!fullAlert) {
          return expect(fullAlert).to.be.ok();
        }
        expect(fullAlert?.host?.risk?.calculated_level).to.eql('Critical');
        expect(fullAlert?.host?.risk?.calculated_score_norm).to.eql(96);
      });
    });

    describe('with asset criticality', async () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/asset_criticality');
        await kibanaServer.uiSettings.update({
          [ENABLE_ASSET_CRITICALITY_SETTING]: true,
        });
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/asset_criticality');
      });

      it('should be enriched alert with criticality_level', async () => {
        const rule: EqlRuleCreateProps = {
          ...getEqlRuleForAlertTesting(['auditbeat-*']),
          query: specificQueryForTests,
        };

        const { previewId } = await previewRule({ supertest, rule });
        const previewAlerts = await getPreviewAlerts({ es, previewId });
        const fullAlert = previewAlerts[0]._source;
        expect(fullAlert?.['host.asset.criticality']).to.eql('high_impact');
      });
    });

    describe('using data with a @timestamp field', () => {
      const expectedWarning =
        'This rule reached the maximum alert limit for the rule execution. Some alerts were not created.';

      it('specifying only timestamp_field results in alert creation with an expected warning', async () => {
        const rule: EqlRuleCreateProps = {
          ...getEqlRuleForAlertTesting(['auditbeat-*']),
          timestamp_field: 'event.created',
        };

        const {
          previewId,
          logs: [_log],
        } = await previewRule({ supertest, rule });

        expect(_log.errors).to.be.empty();
        expect(_log.warnings).to.eql([expectedWarning]);

        const previewAlerts = await getPreviewAlerts({ es, previewId });
        expect(previewAlerts.length).to.be.greaterThan(0);
      });

      it('specifying only timestamp_override results in alert creation with an expected warning', async () => {
        const rule: EqlRuleCreateProps = {
          ...getEqlRuleForAlertTesting(['auditbeat-*']),
          timestamp_override: 'event.created',
        };

        const {
          previewId,
          logs: [_log],
        } = await previewRule({ supertest, rule });

        expect(_log.errors).to.be.empty();
        expect(_log.warnings).to.eql([expectedWarning]);

        const previewAlerts = await getPreviewAlerts({ es, previewId });
        expect(previewAlerts.length).to.be.greaterThan(0);
      });

      it('specifying both timestamp_override and timestamp_field results in alert creation with an expected warning', async () => {
        const rule: EqlRuleCreateProps = {
          ...getEqlRuleForAlertTesting(['auditbeat-*']),
          timestamp_field: 'event.created',
          timestamp_override: 'event.created',
        };

        const {
          previewId,
          logs: [_log],
        } = await previewRule({ supertest, rule });

        expect(_log.errors).to.be.empty();
        expect(_log.warnings).to.eql([expectedWarning]);

        const previewAlerts = await getPreviewAlerts({ es, previewId });
        expect(previewAlerts.length).to.be.greaterThan(0);
      });
    });

    describe('using data without a @timestamp field', () => {
      before(async () => {
        await esArchiver.load(
          'x-pack/test/functional/es_archives/security_solution/no_at_timestamp_field'
        );
      });

      after(async () => {
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/security_solution/no_at_timestamp_field'
        );
      });

      it('specifying only timestamp_field results in a warning, and no alerts are generated', async () => {
        const rule: EqlRuleCreateProps = {
          ...getEqlRuleForAlertTesting(['no_at_timestamp_field']),
          timestamp_field: 'event.ingested',
        };

        const {
          previewId,
          logs: [_log],
        } = await previewRule({ supertest, rule });

        expect(_log.errors).to.be.empty();
        expect(_log.warnings).to.contain(
          'The following indices are missing the timestamp field "@timestamp": ["no_at_timestamp_field"]'
        );

        const previewAlerts = await getPreviewAlerts({ es, previewId });
        expect(previewAlerts).to.be.empty();
      });

      it('specifying only timestamp_override results in an error, and no alerts are generated', async () => {
        const rule: EqlRuleCreateProps = {
          ...getEqlRuleForAlertTesting(['no_at_timestamp_field']),
          timestamp_override: 'event.ingested',
        };

        const {
          previewId,
          logs: [_log],
        } = await previewRule({ supertest, rule });

        expect(_log.errors).to.contain(
          'An error occurred during rule execution: message: "verification_exception\n\tRoot causes:\n\t\tverification_exception: Found 1 problem\nline -1:-1: Unknown column [@timestamp]"'
        );

        const previewAlerts = await getPreviewAlerts({ es, previewId });
        expect(previewAlerts).to.be.empty();
      });

      it('specifying both timestamp_override and timestamp_field results in alert creation with no warnings or errors', async () => {
        const rule: EqlRuleCreateProps = {
          ...getEqlRuleForAlertTesting(['no_at_timestamp_field']),
          timestamp_field: 'event.ingested',
          timestamp_override: 'event.ingested',
        };

        const {
          previewId,
          logs: [_log],
        } = await previewRule({ supertest, rule });

        expect(_log.errors).to.be.empty();
        expect(_log.warnings).to.be.empty();
        const previewAlerts = await getPreviewAlerts({ es, previewId });

        expect(previewAlerts).to.have.length(3);
      });
    });
  });
};
