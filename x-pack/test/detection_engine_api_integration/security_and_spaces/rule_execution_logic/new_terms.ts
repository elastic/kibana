/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { NewTermsRuleCreateProps } from '@kbn/security-solution-plugin/common/detection_engine/rule_schema';
import { orderBy } from 'lodash';
import { getCreateNewTermsRulesSchemaMock } from '@kbn/security-solution-plugin/common/detection_engine/rule_schema/mocks';
import { DetectionAlert } from '@kbn/security-solution-plugin/common/detection_engine/schemas/alerts';
import {
  getNewTermsRuntimeMappings,
  AGG_FIELD_NAME,
} from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_types/new_terms/utils';
import {
  createRule,
  deleteAllAlerts,
  deleteSignalsIndex,
  getOpenSignals,
  getPreviewAlerts,
  previewRule,
  performSearchQuery,
} from '../../utils';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { previewRuleWithExceptionEntries } from '../../utils/preview_rule_with_exception_entries';
import { deleteAllExceptions } from '../../../lists_api_integration/utils';

import { largeArraysBuckets } from './mocks/new_terms';

const removeRandomValuedProperties = (alert: DetectionAlert | undefined) => {
  if (!alert) {
    return undefined;
  }
  const {
    'kibana.version': version,
    'kibana.alert.rule.execution.uuid': execUuid,
    'kibana.alert.rule.uuid': uuid,
    '@timestamp': timestamp,
    'kibana.alert.rule.created_at': createdAt,
    'kibana.alert.rule.updated_at': updatedAt,
    'kibana.alert.uuid': alertUuid,
    ...restOfAlert
  } = alert;
  return restOfAlert;
};

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');

  describe('New terms type rules', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/hosts');
      await esArchiver.load('x-pack/test/functional/es_archives/security_solution/new_terms');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/hosts');
      await esArchiver.unload('x-pack/test/functional/es_archives/security_solution/new_terms');
      await deleteSignalsIndex(supertest, log);
      await deleteAllAlerts(supertest, log);
    });

    // First test creates a real rule - remaining tests use preview API

    // This test also tests that alerts are NOT created for terms that are not new: the host name
    // suricata-sensor-san-francisco appears in a document at 2019-02-19T20:42:08.230Z, but also appears
    // in earlier documents so is not new. An alert should not be generated for that term.
    it('should generate 1 alert with 1 selected field', async () => {
      const rule: NewTermsRuleCreateProps = {
        ...getCreateNewTermsRulesSchemaMock('rule-1', true),
        new_terms_fields: ['host.name'],
        from: '2019-02-19T20:42:00.000Z',
        history_window_start: '2019-01-19T20:42:00.000Z',
      };

      const createdRule = await createRule(supertest, log, rule);
      const alerts = await getOpenSignals(supertest, log, es, createdRule);

      expect(alerts.hits.hits.length).eql(1);
      expect(removeRandomValuedProperties(alerts.hits.hits[0]._source)).eql({
        'kibana.alert.new_terms': ['zeek-newyork-sha-aa8df15'],
        'kibana.alert.rule.category': 'New Terms Rule',
        'kibana.alert.rule.consumer': 'siem',
        'kibana.alert.rule.name': 'Query with a rule id',
        'kibana.alert.rule.producer': 'siem',
        'kibana.alert.rule.rule_type_id': 'siem.newTermsRule',
        'kibana.space_ids': ['default'],
        'kibana.alert.rule.tags': [],
        agent: {
          ephemeral_id: '7cc2091a-72f1-4c63-843b-fdeb622f9c69',
          hostname: 'zeek-newyork-sha-aa8df15',
          id: '4b4462ef-93d2-409c-87a6-299d942e5047',
          type: 'auditbeat',
          version: '8.0.0',
        },
        cloud: { instance: { id: '139865230' }, provider: 'digitalocean', region: 'nyc1' },
        ecs: { version: '1.0.0-beta2' },
        host: {
          architecture: 'x86_64',
          hostname: 'zeek-newyork-sha-aa8df15',
          id: '3729d06ce9964aa98549f41cbd99334d',
          ip: ['157.230.208.30', '10.10.0.6', 'fe80::24ce:f7ff:fede:a571'],
          mac: ['26:ce:f7:de:a5:71'],
          name: 'zeek-newyork-sha-aa8df15',
          os: {
            codename: 'cosmic',
            family: 'debian',
            kernel: '4.18.0-10-generic',
            name: 'Ubuntu',
            platform: 'ubuntu',
            version: '18.10 (Cosmic Cuttlefish)',
          },
        },
        message:
          'Login by user root (UID: 0) on pts/0 (PID: 20638) from 8.42.77.171 (IP: 8.42.77.171)',
        process: { pid: 20638 },
        service: { type: 'system' },
        source: { ip: '8.42.77.171' },
        user: { id: 0, name: 'root', terminal: 'pts/0' },
        'event.action': 'user_login',
        'event.category': 'authentication',
        'event.dataset': 'login',
        'event.kind': 'signal',
        'event.module': 'system',
        'event.origin': '/var/log/wtmp',
        'event.outcome': 'success',
        'event.type': 'authentication_success',
        'kibana.alert.original_time': '2019-02-19T20:42:08.230Z',
        'kibana.alert.ancestors': [
          {
            id: 'x07wJ2oB9v5HJNSHhyxi',
            type: 'event',
            index: 'auditbeat-8.0.0-2019.02.19-000001',
            depth: 0,
          },
        ],
        'kibana.alert.status': 'active',
        'kibana.alert.workflow_status': 'open',
        'kibana.alert.depth': 1,
        'kibana.alert.reason':
          'authentication event with source 8.42.77.171 by root on zeek-newyork-sha-aa8df15 created high alert Query with a rule id.',
        'kibana.alert.severity': 'high',
        'kibana.alert.risk_score': 55,
        'kibana.alert.rule.parameters': {
          description: 'Detecting root and admin users',
          risk_score: 55,
          severity: 'high',
          author: [],
          false_positives: [],
          from: '2019-02-19T20:42:00.000Z',
          rule_id: 'rule-1',
          max_signals: 100,
          risk_score_mapping: [],
          severity_mapping: [],
          threat: [],
          to: 'now',
          references: [],
          version: 1,
          exceptions_list: [],
          immutable: false,
          related_integrations: [],
          required_fields: [],
          setup: '',
          type: 'new_terms',
          query: '*',
          new_terms_fields: ['host.name'],
          history_window_start: '2019-01-19T20:42:00.000Z',
          index: ['auditbeat-*'],
          language: 'kuery',
        },
        'kibana.alert.rule.actions': [],
        'kibana.alert.rule.author': [],
        'kibana.alert.rule.created_by': 'elastic',
        'kibana.alert.rule.description': 'Detecting root and admin users',
        'kibana.alert.rule.enabled': true,
        'kibana.alert.rule.exceptions_list': [],
        'kibana.alert.rule.false_positives': [],
        'kibana.alert.rule.from': '2019-02-19T20:42:00.000Z',
        'kibana.alert.rule.immutable': false,
        'kibana.alert.rule.indices': ['auditbeat-*'],
        'kibana.alert.rule.interval': '5m',
        'kibana.alert.rule.max_signals': 100,
        'kibana.alert.rule.references': [],
        'kibana.alert.rule.risk_score_mapping': [],
        'kibana.alert.rule.rule_id': 'rule-1',
        'kibana.alert.rule.severity_mapping': [],
        'kibana.alert.rule.threat': [],
        'kibana.alert.rule.to': 'now',
        'kibana.alert.rule.type': 'new_terms',
        'kibana.alert.rule.updated_by': 'elastic',
        'kibana.alert.rule.version': 1,
        'kibana.alert.rule.risk_score': 55,
        'kibana.alert.rule.severity': 'high',
        'kibana.alert.original_event.action': 'user_login',
        'kibana.alert.original_event.category': 'authentication',
        'kibana.alert.original_event.dataset': 'login',
        'kibana.alert.original_event.kind': 'event',
        'kibana.alert.original_event.module': 'system',
        'kibana.alert.original_event.origin': '/var/log/wtmp',
        'kibana.alert.original_event.outcome': 'success',
        'kibana.alert.original_event.type': 'authentication_success',
      });
    });

    it('should generate 3 alerts when 1 document has 3 new values', async () => {
      const rule: NewTermsRuleCreateProps = {
        ...getCreateNewTermsRulesSchemaMock('rule-1', true),
        new_terms_fields: ['host.ip'],
        from: '2019-02-19T20:42:00.000Z',
        history_window_start: '2019-01-19T20:42:00.000Z',
      };

      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });

      expect(previewAlerts.length).eql(3);
      const previewAlertsOrderedByHostIp = orderBy(
        previewAlerts,
        '_source.kibana.alert.new_terms',
        'asc'
      );
      expect(previewAlertsOrderedByHostIp[0]._source?.['kibana.alert.new_terms']).eql([
        '10.10.0.6',
      ]);
      expect(previewAlertsOrderedByHostIp[1]._source?.['kibana.alert.new_terms']).eql([
        '157.230.208.30',
      ]);
      expect(previewAlertsOrderedByHostIp[2]._source?.['kibana.alert.new_terms']).eql([
        'fe80::24ce:f7ff:fede:a571',
      ]);
    });

    it('should generate 3 alerts when 1 document has 3 new values for multiple fields', async () => {
      const rule: NewTermsRuleCreateProps = {
        ...getCreateNewTermsRulesSchemaMock('rule-1', true),
        new_terms_fields: ['host.name', 'host.ip'],
        from: '2019-02-19T20:42:00.000Z',
        history_window_start: '2019-01-19T20:42:00.000Z',
      };

      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });

      expect(previewAlerts.length).eql(3);

      const newTerms = orderBy(
        previewAlerts.map((item) => item._source?.['kibana.alert.new_terms']),
        ['0', '1']
      );

      expect(newTerms).eql([
        ['zeek-newyork-sha-aa8df15', '10.10.0.6'],
        ['zeek-newyork-sha-aa8df15', '157.230.208.30'],
        ['zeek-newyork-sha-aa8df15', 'fe80::24ce:f7ff:fede:a571'],
      ]);
    });

    it('should generate 1 alert for unique combination of existing terms', async () => {
      // ensure there are no alerts for single new terms fields, it means values are not new
      const rule: NewTermsRuleCreateProps = {
        ...getCreateNewTermsRulesSchemaMock('rule-1', true),
        index: ['new_terms'],
        new_terms_fields: ['host.name', 'host.ip'],
        from: '2020-10-19T05:00:04.000Z',
        history_window_start: '2020-10-13T05:00:04.000Z',
      };
      // shouldn't be terms for 'host.ip'
      const hostIpPreview = await previewRule({
        supertest,
        rule: { ...rule, new_terms_fields: ['host.ip'] },
      });
      const hostIpPreviewAlerts = await getPreviewAlerts({
        es,
        previewId: hostIpPreview.previewId,
      });
      expect(hostIpPreviewAlerts.length).eql(0);

      // shouldn't be terms for 'host.name'
      const hostNamePreview = await previewRule({
        supertest,
        rule: { ...rule, new_terms_fields: ['host.name'] },
      });
      const hostNamePreviewAlerts = await getPreviewAlerts({
        es,
        previewId: hostNamePreview.previewId,
      });
      expect(hostNamePreviewAlerts.length).eql(0);

      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });

      expect(previewAlerts.length).eql(1);

      expect(previewAlerts[0]._source?.['kibana.alert.new_terms']).eql(['host-0', '127.0.0.2']);
    });

    it('should generate 5 alerts, 1 for each new unique combination in 2 fields', async () => {
      const rule: NewTermsRuleCreateProps = {
        ...getCreateNewTermsRulesSchemaMock('rule-1', true),
        index: ['new_terms'],
        new_terms_fields: ['source.ip', 'tags'],
        from: '2020-10-19T05:00:04.000Z',
        history_window_start: '2020-10-13T05:00:04.000Z',
      };

      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });

      expect(previewAlerts.length).eql(5);

      const newTerms = orderBy(
        previewAlerts.map((item) => item._source?.['kibana.alert.new_terms']),
        ['0', '1']
      );

      expect(newTerms).eql([
        ['192.168.1.1', 'tag-new-1'],
        ['192.168.1.1', 'tag-new-3'],
        ['192.168.1.2', 'tag-2'],
        ['192.168.1.2', 'tag-new-1'],
        ['192.168.1.2', 'tag-new-3'],
      ]);
    });

    it('should generate 1 alert for unique combination of terms, one of which is a number', async () => {
      const rule: NewTermsRuleCreateProps = {
        ...getCreateNewTermsRulesSchemaMock('rule-1', true),
        index: ['new_terms'],
        new_terms_fields: ['user.name', 'user.id'],
        from: '2020-10-19T05:00:04.000Z',
        history_window_start: '2020-10-13T05:00:04.000Z',
      };

      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });

      expect(previewAlerts.length).eql(1);
      expect(previewAlerts[0]._source?.['kibana.alert.new_terms']).eql(['user-0', '1']);
    });

    it('should generate 1 alert for unique combination of terms, one of which is a boolean', async () => {
      const rule: NewTermsRuleCreateProps = {
        ...getCreateNewTermsRulesSchemaMock('rule-1', true),
        index: ['new_terms'],
        new_terms_fields: ['user.name', 'user.enabled'],
        from: '2020-10-19T05:00:04.000Z',
        history_window_start: '2020-10-13T05:00:04.000Z',
      };

      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });

      expect(previewAlerts.length).eql(1);
      expect(previewAlerts[0]._source?.['kibana.alert.new_terms']).eql(['user-0', 'false']);
    });

    it('should generate alerts for every term when history window is small', async () => {
      const rule: NewTermsRuleCreateProps = {
        ...getCreateNewTermsRulesSchemaMock('rule-1', true),
        new_terms_fields: ['host.name'],
        from: '2019-02-19T20:42:00.000Z',
        // Set the history_window_start close to 'from' so we should alert on all terms in the time range
        history_window_start: '2019-02-19T20:41:59.000Z',
      };

      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });

      expect(previewAlerts.length).eql(5);
      const hostNames = previewAlerts
        .map((signal) => signal._source?.['kibana.alert.new_terms'])
        .sort();
      expect(hostNames[0]).eql(['suricata-sensor-amsterdam']);
      expect(hostNames[1]).eql(['suricata-sensor-san-francisco']);
      expect(hostNames[2]).eql(['zeek-newyork-sha-aa8df15']);
      expect(hostNames[3]).eql(['zeek-sensor-amsterdam']);
      expect(hostNames[4]).eql(['zeek-sensor-san-francisco']);
    });

    describe('null values', () => {
      it('should not generate alerts with null values for single field', async () => {
        const rule: NewTermsRuleCreateProps = {
          ...getCreateNewTermsRulesSchemaMock('rule-1', true),
          index: ['new_terms'],
          new_terms_fields: ['possibly_null_field'],
          from: '2020-10-19T05:00:04.000Z',
          history_window_start: '2020-10-13T05:00:04.000Z',
        };

        const { previewId } = await previewRule({ supertest, rule });
        const previewAlerts = await getPreviewAlerts({ es, previewId });

        expect(previewAlerts.length).eql(0);
      });

      it('should not generate alerts with null values for multiple fields', async () => {
        const rule: NewTermsRuleCreateProps = {
          ...getCreateNewTermsRulesSchemaMock('rule-1', true),
          index: ['new_terms'],
          new_terms_fields: ['possibly_null_field', 'host.name'],
          from: '2020-10-19T05:00:04.000Z',
          history_window_start: '2020-10-13T05:00:04.000Z',
        };

        const { previewId } = await previewRule({ supertest, rule });
        const previewAlerts = await getPreviewAlerts({ es, previewId });

        expect(previewAlerts.length).eql(0);
      });
    });

    describe('large arrays values', () => {
      it('should generate alerts for unique values in large array for single field from a single document', async () => {
        const rule: NewTermsRuleCreateProps = {
          ...getCreateNewTermsRulesSchemaMock('rule-1', true),
          index: ['new_terms'],
          new_terms_fields: ['large_array_20'],
          from: '2020-10-19T05:00:04.000Z',
          history_window_start: '2020-10-13T05:00:04.000Z',
        };

        const { previewId } = await previewRule({ supertest, rule });
        const previewAlerts = await getPreviewAlerts({ es, previewId, size: 100 });

        expect(previewAlerts.length).eql(20);
      });

      // There is a limit in ES for a number of emitted values in runtime field (100)
      // This test ensures rule run doesn't fail if processed fields in runtime script generates 100 values, hard limit for ES
      // For this test case: large_array_10 & large_array_5 have 100 unique combination in total
      it('should generate alerts for array fields that have 100 unique combination of values in runtime field', async () => {
        const rule: NewTermsRuleCreateProps = {
          ...getCreateNewTermsRulesSchemaMock('rule-1', true),
          index: ['new_terms'],
          new_terms_fields: ['large_array_10', 'large_array_5'],
          from: '2020-10-19T05:00:04.000Z',
          history_window_start: '2020-10-13T05:00:04.000Z',
        };

        const { previewId } = await previewRule({ supertest, rule });
        const previewAlerts = await getPreviewAlerts({ es, previewId, size: 200 });

        expect(previewAlerts.length).eql(100);
      });

      // There is a limit in ES for a number of emitted values in runtime field (100)
      // This test ensures rule run doesn't fail if processed fields in runtime script generates 200 values
      // In case of this test case: large_array_10 & large_array_20 have 200 unique combination in total
      // Rule run should not fail and should generate alerts
      it('should generate alert for array fields that have more than 200 unique combination of values in runtime field', async () => {
        const rule: NewTermsRuleCreateProps = {
          ...getCreateNewTermsRulesSchemaMock('rule-1', true),
          index: ['new_terms'],
          new_terms_fields: ['large_array_10', 'large_array_20'],
          from: '2020-10-19T05:00:04.000Z',
          history_window_start: '2020-10-13T05:00:04.000Z',
        };

        const { previewId } = await previewRule({ supertest, rule });
        const previewAlerts = await getPreviewAlerts({ es, previewId, size: 200 });

        expect(previewAlerts.length).eql(100);
      });
    });

    describe('timestamp override and fallback', () => {
      before(async () => {
        await esArchiver.load(
          'x-pack/test/functional/es_archives/security_solution/timestamp_fallback'
        );
        await esArchiver.load(
          'x-pack/test/functional/es_archives/security_solution/timestamp_override_3'
        );
      });
      after(async () => {
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/security_solution/timestamp_fallback'
        );
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/security_solution/timestamp_override_3'
        );
      });

      it('should generate the correct alerts', async () => {
        const rule: NewTermsRuleCreateProps = {
          ...getCreateNewTermsRulesSchemaMock('rule-1', true),
          // myfakeindex-3 does not have event.ingested mapped so we can test if the runtime field
          // 'kibana.combined_timestamp' handles unmapped fields properly
          index: ['timestamp-fallback-test', 'myfakeindex-3'],
          new_terms_fields: ['host.name'],
          from: '2020-12-16T16:00:00.000Z',
          // Set the history_window_start close to 'from' so we should alert on all terms in the time range
          history_window_start: '2020-12-16T15:59:00.000Z',
          timestamp_override: 'event.ingested',
        };

        const { previewId } = await previewRule({ supertest, rule });
        const previewAlerts = await getPreviewAlerts({ es, previewId });

        expect(previewAlerts.length).eql(2);
        const hostNames = previewAlerts
          .map((signal) => signal._source?.['kibana.alert.new_terms'])
          .sort();
        expect(hostNames[0]).eql(['host-3']);
        expect(hostNames[1]).eql(['host-4']);
      });
    });

    describe('with exceptions', async () => {
      afterEach(async () => {
        await deleteAllExceptions(supertest, log);
      });

      it('should apply exceptions', async () => {
        const rule: NewTermsRuleCreateProps = {
          ...getCreateNewTermsRulesSchemaMock('rule-1', true),
          new_terms_fields: ['host.name'],
          from: '2019-02-19T20:42:00.000Z',
          // Set the history_window_start close to 'from' so we should alert on all terms in the time range
          history_window_start: '2019-02-19T20:41:59.000Z',
        };

        const { previewId } = await previewRuleWithExceptionEntries({
          supertest,
          log,
          rule,
          entries: [
            [
              {
                field: 'host.name',
                operator: 'included',
                type: 'match',
                value: 'zeek-sensor-san-francisco',
              },
            ],
          ],
        });
        const previewAlerts = await getPreviewAlerts({ es, previewId });

        expect(previewAlerts.length).eql(4);
        const hostNames = previewAlerts
          .map((signal) => signal._source?.['kibana.alert.new_terms'])
          .sort();
        expect(hostNames[0]).eql(['suricata-sensor-amsterdam']);
        expect(hostNames[1]).eql(['suricata-sensor-san-francisco']);
        expect(hostNames[2]).eql(['zeek-newyork-sha-aa8df15']);
        expect(hostNames[3]).eql(['zeek-sensor-amsterdam']);
      });
    });

    it('should work for max signals > 100', async () => {
      const maxSignals = 200;
      const rule: NewTermsRuleCreateProps = {
        ...getCreateNewTermsRulesSchemaMock('rule-1', true),
        new_terms_fields: ['process.pid'],
        from: '2018-02-19T20:42:00.000Z',
        // Set the history_window_start close to 'from' so we should alert on all terms in the time range
        history_window_start: '2018-02-19T20:41:59.000Z',
        max_signals: maxSignals,
      };

      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId, size: maxSignals * 2 });

      expect(previewAlerts.length).eql(maxSignals);
      const processPids = previewAlerts
        .map((signal) => signal._source?.['kibana.alert.new_terms'])
        .sort();
      expect(processPids[0]).eql([1]);
    });

    describe('alerts should be be enriched', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/entity/host_risk');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/entity/host_risk');
      });

      it('should be enriched with host risk score', async () => {
        const rule: NewTermsRuleCreateProps = {
          ...getCreateNewTermsRulesSchemaMock('rule-1', true),
          new_terms_fields: ['host.name'],
          from: '2019-02-19T20:42:00.000Z',
          history_window_start: '2019-01-19T20:42:00.000Z',
        };

        const { previewId } = await previewRule({ supertest, rule });
        const previewAlerts = await getPreviewAlerts({ es, previewId });

        expect(previewAlerts[0]?._source?.host?.risk?.calculated_level).to.eql('Low');
        expect(previewAlerts[0]?._source?.host?.risk?.calculated_score_norm).to.eql(23);
      });
    });

    describe('runtime field', () => {
      it('should return runtime field created from 2 single values', async () => {
        // encoded base64 values of "host-0" and  "127.0.0.1" joined with underscore
        const expectedEncodedValues = ['aG9zdC0w_MTI3LjAuMC4x'];
        const { hits } = await performSearchQuery({
          es,
          query: { match: { id: 'first_doc' } },
          index: 'new_terms',
          fields: [AGG_FIELD_NAME],
          runtimeMappings: getNewTermsRuntimeMappings(
            ['host.name', 'host.ip'],
            [
              {
                key: {
                  'host.name': 'host-0',
                  'host.ip': '127.0.0.1',
                },
                doc_count: 1,
              },
            ]
          ),
        });

        expect(hits.hits[0].fields?.[AGG_FIELD_NAME]).to.eql(expectedEncodedValues);
      });

      it('should not return runtime field created from 2 single values if its value is not in buckets', async () => {
        const { hits } = await performSearchQuery({
          es,
          query: { match: { id: 'first_doc' } },
          index: 'new_terms',
          fields: [AGG_FIELD_NAME],
          runtimeMappings: getNewTermsRuntimeMappings(
            ['host.name', 'host.ip'],
            [
              {
                key: {
                  'host.name': 'host-0',
                },
                doc_count: 1,
              },
            ]
          ),
        });

        expect(hits.hits[0].fields?.[AGG_FIELD_NAME]).to.be(undefined);
      });

      it('should return runtime field created from 2 single values, including number value', async () => {
        // encoded base64 values of "user-0" and  0 joined with underscore
        const expectedEncodedValues = ['dXNlci0w_MA=='];
        const { hits } = await performSearchQuery({
          es,
          query: { match: { id: 'first_doc' } },
          index: 'new_terms',
          fields: [AGG_FIELD_NAME],
          runtimeMappings: getNewTermsRuntimeMappings(
            ['user.name', 'user.id'],
            [
              {
                key: {
                  'user.name': 'user-0',
                  'user.id': 0,
                },
                doc_count: 1,
              },
            ]
          ),
        });

        expect(hits.hits[0].fields?.[AGG_FIELD_NAME]).to.eql(expectedEncodedValues);
      });

      it('should return runtime field created from 2 single values, including boolean value', async () => {
        // encoded base64 values of "user-0" and  true joined with underscore
        const expectedEncodedValues = ['dXNlci0w_dHJ1ZQ=='];
        const { hits } = await performSearchQuery({
          es,
          query: { match: { id: 'first_doc' } },
          index: 'new_terms',
          fields: [AGG_FIELD_NAME],
          runtimeMappings: getNewTermsRuntimeMappings(
            ['user.name', 'user.enabled'],
            [
              {
                key: {
                  'user.name': 'user-0',
                  'user.enabled': true,
                },
                doc_count: 1,
              },
            ]
          ),
        });

        expect(hits.hits[0].fields?.[AGG_FIELD_NAME]).to.eql(expectedEncodedValues);
      });

      it('should return runtime field created from 3 single values', async () => {
        // encoded base64 values of "host-0" and  "127.0.0.1" and "user-0" joined with underscore
        const expectedEncodedValues = ['aG9zdC0w_MTI3LjAuMC4x_dXNlci0w'];
        const { hits } = await performSearchQuery({
          es,
          query: { match: { id: 'first_doc' } },
          index: 'new_terms',
          fields: [AGG_FIELD_NAME],
          runtimeMappings: getNewTermsRuntimeMappings(
            ['host.name', 'host.ip', 'user.name'],
            [
              {
                key: {
                  'host.name': 'host-0',
                  'host.ip': '127.0.0.1',
                  'user.name': 'user-0',
                },
                doc_count: 1,
              },
            ]
          ),
        });

        expect(hits.hits[0].fields?.[AGG_FIELD_NAME]).to.eql(expectedEncodedValues);
      });

      it('should return runtime field created from fields of arrays', async () => {
        // encoded base64 values of all combinations of ["192.168.1.1", "192.168.1.2"]
        // and ["tag-new-1", "tag-2", "tag-new-3"] joined with underscore
        const expectedEncodedValues = [
          'MTkyLjE2OC4xLjE=_dGFnLTI=',
          'MTkyLjE2OC4xLjE=_dGFnLW5ldy0x',
          'MTkyLjE2OC4xLjE=_dGFnLW5ldy0z',
          'MTkyLjE2OC4xLjI=_dGFnLTI=',
          'MTkyLjE2OC4xLjI=_dGFnLW5ldy0x',
          'MTkyLjE2OC4xLjI=_dGFnLW5ldy0z',
        ];
        const { hits } = await performSearchQuery({
          es,
          query: { match: { id: 'doc_with_source_ip_as_array' } },
          index: 'new_terms',
          fields: [AGG_FIELD_NAME],
          runtimeMappings: getNewTermsRuntimeMappings(
            ['source.ip', 'tags'],
            [
              {
                key: {
                  tags: 'tag-new-1',
                  'source.ip': '192.168.1.1',
                },
                doc_count: 1,
              },
              {
                key: {
                  tags: 'tag-2',
                  'source.ip': '192.168.1.1',
                },
                doc_count: 1,
              },
              {
                key: {
                  tags: 'tag-new-3',
                  'source.ip': '192.168.1.1',
                },
                doc_count: 1,
              },
              {
                key: {
                  tags: 'tag-new-1',
                  'source.ip': '192.168.1.2',
                },
                doc_count: 1,
              },
              {
                key: {
                  tags: 'tag-2',
                  'source.ip': '192.168.1.2',
                },
                doc_count: 1,
              },
              {
                key: {
                  tags: 'tag-new-3',
                  'source.ip': '192.168.1.2',
                },
                doc_count: 1,
              },
            ]
          ),
        });

        expect(hits.hits[0].fields?.[AGG_FIELD_NAME]).to.eql(expectedEncodedValues);
      });

      it('should return runtime field without duplicated values', async () => {
        // encoded base64 values of "host-0" and ["tag-1", "tag-2", "tag-2", "tag-1", "tag-1"]
        // joined with underscore, without duplicates in tags
        const expectedEncodedValues = ['aG9zdC0w_dGFnLTE=', 'aG9zdC0w_dGFnLTI='];
        const { hits } = await performSearchQuery({
          es,
          query: { match: { id: 'doc_with_duplicated_tags' } },
          index: 'new_terms',
          fields: [AGG_FIELD_NAME],
          runtimeMappings: getNewTermsRuntimeMappings(
            ['host.name', 'tags'],
            [
              {
                key: {
                  tags: 'tag-1',
                  'host.name': 'host-0',
                },
                doc_count: 1,
              },
              {
                key: {
                  tags: 'tag-2',
                  'host.name': 'host-0',
                },
                doc_count: 1,
              },
            ]
          ),
        });

        expect(hits.hits[0].fields?.[AGG_FIELD_NAME]).to.eql(expectedEncodedValues);
      });

      it('should not return runtime field if one of fields is null', async () => {
        const { hits } = await performSearchQuery({
          es,
          query: { match: { id: 'doc_with_null_field' } },
          index: 'new_terms',
          fields: [AGG_FIELD_NAME, 'possibly_null_field', 'host.name'],
          runtimeMappings: getNewTermsRuntimeMappings(
            ['host.name', 'possibly_null_field'],
            [
              {
                key: {
                  'host.name': 'host-0',
                  possibly_null_field: null,
                },
                doc_count: 1,
              },
            ]
          ),
        });

        expect(hits.hits.length).to.be(1);
        expect(hits.hits[0].fields?.[AGG_FIELD_NAME]).to.be(undefined);
        expect(hits.hits[0].fields?.possibly_null_field).to.be(undefined);
        expect(hits.hits[0].fields?.['host.name']).to.eql(['host-0']);
      });

      it('should not return runtime field if one of fields is not defined in a document', async () => {
        const { hits } = await performSearchQuery({
          es,
          query: { match: { id: 'doc_without_large_arrays' } },
          index: 'new_terms',
          fields: [AGG_FIELD_NAME],
          runtimeMappings: getNewTermsRuntimeMappings(
            ['host.name', 'large_array_5'],
            [
              {
                key: {
                  'host.name': 'host-0',
                },
                doc_count: 1,
              },
            ]
          ),
        });

        expect(hits.hits.length).to.be(1);
        expect(hits.hits[0].fields).to.be(undefined);
      });

      // There is a limit in ES for a number of emitted values in runtime field (100)
      // This test makes sure runtime script doesn't cause query failure and returns first 100 results
      it('should return runtime field if number of emitted values greater than 100', async () => {
        const { hits } = await performSearchQuery({
          es,
          query: { match: { id: 'first_doc' } },
          index: 'new_terms',
          fields: [AGG_FIELD_NAME],
          runtimeMappings: getNewTermsRuntimeMappings(
            ['large_array_20', 'large_array_10'],
            largeArraysBuckets
          ),
        });

        // runtime field should have 100 values, as large_array_20 and large_array_10
        // give in total 200 combinations
        expect(hits.hits[0].fields?.[AGG_FIELD_NAME].length).to.be(100);
      });
    });
  });
};
