/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import {
  ALERT_RISK_SCORE,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_RULE_ID,
  ALERT_SEVERITY,
  ALERT_WORKFLOW_STATUS,
} from '@kbn/rule-data-utils';
import { flattenWithPrefix } from '@kbn/securitysolution-rules';
import { orderBy } from 'lodash';
import { v4 as uuidv4 } from 'uuid';

import { QueryRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { Ancestor } from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_types/types';
import {
  ALERT_ANCESTORS,
  ALERT_DEPTH,
  ALERT_ORIGINAL_TIME,
  ALERT_ORIGINAL_EVENT,
} from '@kbn/security-solution-plugin/common/field_maps/field_names';
import { ENABLE_ASSET_CRITICALITY_SETTING } from '@kbn/security-solution-plugin/common/constants';
import { getMaxSignalsWarning as getMaxAlertsWarning } from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_types/utils/utils';
import { deleteAllExceptions } from '../../../../../lists_and_exception_lists/utils';
import {
  createExceptionList,
  createExceptionListItem,
  getOpenAlerts,
  getPreviewAlerts,
  getSimpleRule,
  previewRule,
  dataGeneratorFactory,
} from '../../../../utils';
import {
  createRule,
  deleteAllRules,
  deleteAllAlerts,
  getRuleForAlertTesting,
} from '../../../../../../../common/utils/security_solution';

import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { EsArchivePathBuilder } from '../../../../../../es_archive_path_builder';

/**
 * Specific _id to use for some of the tests. If the archiver changes and you see errors
 * here, update this to a new value of a chosen auditbeat record and update the tests values.
 */
const ID = 'BhbXBmkBR346wHgn4PeZ';

/**
 * Test coverage:
 * [x] - Happy path generating 1 alert
 * [x] - Rule type respects max alerts
 * [x] - Alerts on alerts
 */

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');
  const kibanaServer = getService('kibanaServer');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  // TODO: add a new service for loading archiver files similar to "getService('es')"
  const config = getService('config');
  const isServerless = config.get('serverless');
  const dataPathBuilder = new EsArchivePathBuilder(isServerless);
  const auditbeatPath = dataPathBuilder.getPath('auditbeat/hosts');

  describe('@ess @serverless Query type rules', () => {
    before(async () => {
      await esArchiver.load(auditbeatPath);
      await esArchiver.load('x-pack/test/functional/es_archives/security_solution/alerts/8.8.0', {
        useCreate: true,
        docsOnly: true,
      });
      await esArchiver.load('x-pack/test/functional/es_archives/signals/severity_risk_overrides');
    });

    afterEach(async () => {
      await esDeleteAllIndices('.preview.alerts*');
      await deleteAllAlerts(supertest, log, es, ['.preview.alerts-security.alerts-*']);
      await deleteAllRules(supertest, log);
    });

    after(async () => {
      await esArchiver.unload(auditbeatPath);
      await esArchiver.unload('x-pack/test/functional/es_archives/signals/severity_risk_overrides');
      await esArchiver.unload('x-pack/test/functional/es_archives/security_solution/alerts/8.8.0');
    });

    // First test creates a real rule - most remaining tests use preview API
    it('should have the specific audit record for _id or none of these tests below will pass', async () => {
      const rule: QueryRuleCreateProps = {
        ...getRuleForAlertTesting(['auditbeat-*']),
        query: `_id:${ID}`,
      };
      const createdRule = await createRule(supertest, log, rule);
      const alerts = await getOpenAlerts(supertest, log, es, createdRule);
      expect(alerts.hits.hits.length).toBeGreaterThan(0);
      expect(alerts.hits.hits[0]._source?.['kibana.alert.ancestors'][0].id).toEqual(ID);
    });

    it('generates max alerts warning when circuit breaker is hit', async () => {
      const rule: QueryRuleCreateProps = {
        ...getRuleForAlertTesting(['auditbeat-*']),
      };
      const { logs } = await previewRule({ supertest, rule });
      expect(logs[0].warnings).toContain(getMaxAlertsWarning());
    });

    it("doesn't generate max alerts warning when circuit breaker is met but not exceeded", async () => {
      const rule = {
        ...getRuleForAlertTesting(['auditbeat-*']),
        query: 'process.executable: "/usr/bin/sudo"',
        max_signals: 10,
      };
      const { logs } = await previewRule({ supertest, rule });
      expect(logs[0].warnings).not.toContain(getMaxAlertsWarning());
    });

    it('should abide by max_signals > 100', async () => {
      const maxAlerts = 200;
      const rule: QueryRuleCreateProps = {
        ...getRuleForAlertTesting(['auditbeat-*']),
        max_signals: maxAlerts,
      };
      const { previewId } = await previewRule({ supertest, rule });
      // Search for 2x max_signals to make sure we aren't making more than max_signals
      const previewAlerts = await getPreviewAlerts({ es, previewId, size: maxAlerts * 2 });
      expect(previewAlerts.length).toEqual(maxAlerts);
    });

    it('should have recorded the rule_id within the alert', async () => {
      const rule: QueryRuleCreateProps = {
        ...getRuleForAlertTesting(['auditbeat-*']),
        query: `_id:${ID}`,
      };
      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });
      expect(previewAlerts[0]._source?.[ALERT_RULE_RULE_ID]).toEqual(getSimpleRule().rule_id);
    });

    it('should query and get back expected alert structure using a basic KQL query', async () => {
      const rule: QueryRuleCreateProps = {
        ...getRuleForAlertTesting(['auditbeat-*']),
        query: `_id:${ID}`,
      };
      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });
      const alert = previewAlerts[0]._source;

      expect(alert).toEqual({
        ...alert,
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

    it('should query and get back expected alert structure when it is a alert on a alert', async () => {
      const alertId = 'eabbdefc23da981f2b74ab58b82622a97bb9878caa11bc914e2adfacc94780f1';
      const rule: QueryRuleCreateProps = {
        ...getRuleForAlertTesting([`.alerts-security.alerts-default*`]),
        rule_id: 'alert-on-alert',
        query: `_id:${alertId}`,
      };

      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });

      expect(previewAlerts.length).toEqual(1);

      const alert = previewAlerts[0]._source;

      if (!alert) {
        return expect(true).toEqual(true);
      }
      const alertAncestorIndex = isServerless
        ? /\.ds-\.alerts-security\.alerts-default-\d\d\d\d\.\d\d\.\d\d-000001/
        : /\.internal\.alerts-security\.alerts-default-000001/;
      expect(alert[ALERT_ANCESTORS][0]).toEqual({
        id: 'vT9cwocBh3b8EMpD8lsi',
        type: 'event',
        index: '.ds-logs-endpoint.alerts-default-2023.04.27-000001',
        depth: 0,
      });
      expect(alert[ALERT_ANCESTORS][1]).toEqual(
        expect.objectContaining({
          rule: '7015a3e2-e4ea-11ed-8c11-49608884878f',
          id: alertId,
          type: 'signal',
          depth: 1,
        })
      );
      expect(alert[ALERT_ANCESTORS][1].index).toMatch(alertAncestorIndex);
      expect(alert[ALERT_WORKFLOW_STATUS]).toEqual('open');
      expect(alert[ALERT_DEPTH]).toEqual(2);

      expect(alert[ALERT_ORIGINAL_TIME]).toEqual('2023-04-27T11:03:57.906Z');
      expect(alert[`${ALERT_ORIGINAL_EVENT}.agent_id_status`]).toEqual('auth_metadata_missing');
      expect(alert[`${ALERT_ORIGINAL_EVENT}.ingested`]).toEqual('2023-04-27T10:58:03Z');
      expect(alert[`${ALERT_ORIGINAL_EVENT}.dataset`]).toEqual('endpoint');
      expect(alert[`${ALERT_ORIGINAL_EVENT}.ingested`]).toEqual('2023-04-27T10:58:03Z');
    });

    it('should not have risk score fields without risk indices', async () => {
      const rule: QueryRuleCreateProps = {
        ...getRuleForAlertTesting(['auditbeat-*']),
        query: `_id:${ID}`,
      };
      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });
      expect(previewAlerts[0]?._source?.host?.risk).toEqual(undefined);
      expect(previewAlerts[0]?._source?.user?.risk).toEqual(undefined);
    });

    describe('with host and user risk indices', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/entity/risks');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/entity/risks');
      });

      it('should have host and user risk score fields', async () => {
        const rule: QueryRuleCreateProps = {
          ...getRuleForAlertTesting(['auditbeat-*']),
          query: `_id:${ID}`,
        };
        const { previewId } = await previewRule({ supertest, rule });
        const previewAlerts = await getPreviewAlerts({ es, previewId });
        expect(previewAlerts[0]?._source?.host?.risk?.calculated_level).toEqual('Critical');
        expect(previewAlerts[0]?._source?.host?.risk?.calculated_score_norm).toEqual(96);
        expect(previewAlerts[0]?._source?.user?.risk?.calculated_level).toEqual('Low');
        expect(previewAlerts[0]?._source?.user?.risk?.calculated_score_norm).toEqual(11);
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
        const rule: QueryRuleCreateProps = {
          ...getRuleForAlertTesting(['auditbeat-*']),
          query: `_id:${ID}`,
        };
        const { previewId } = await previewRule({ supertest, rule });
        const previewAlerts = await getPreviewAlerts({ es, previewId });
        expect(previewAlerts[0]?._source?.['host.asset.criticality']).toEqual('high_impact');
        expect(previewAlerts[0]?._source?.['user.asset.criticality']).toEqual('extreme_impact');
      });
    });

    /**
     * Here we test the functionality of Severity and Risk Score overrides (also called "mappings"
     * in the code). If the rule specifies a mapping, then the final Severity or Risk Score
     * value of the alert will be taken from the mapped field of the source event.
     */
    it('should get default severity and risk score if there is no mapping', async () => {
      const rule: QueryRuleCreateProps = {
        ...getRuleForAlertTesting(['signal_overrides']),
        severity: 'medium',
        risk_score: 75,
      };

      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });

      expect(previewAlerts.length).toEqual(4);
      previewAlerts.forEach((alert) => {
        expect(alert._source?.[ALERT_SEVERITY]).toEqual('medium');
        expect(alert._source?.[ALERT_RULE_PARAMETERS].severity_mapping).toEqual([]);

        expect(alert._source?.[ALERT_RISK_SCORE]).toEqual(75);
        expect(alert._source?.[ALERT_RULE_PARAMETERS].risk_score_mapping).toEqual([]);
      });
    });

    it('should get overridden severity if the rule has a mapping for it', async () => {
      const rule: QueryRuleCreateProps = {
        ...getRuleForAlertTesting(['signal_overrides']),
        severity: 'medium',
        severity_mapping: [
          { field: 'my_severity', operator: 'equals', value: 'sev_900', severity: 'high' },
          { field: 'my_severity', operator: 'equals', value: 'sev_max', severity: 'critical' },
        ],
        risk_score: 75,
      };

      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });
      const alertsOrderedByParentId = orderBy(previewAlerts, 'signal.parent.id', 'asc');
      const severities = alertsOrderedByParentId.map((alert) => ({
        id: (alert._source?.[ALERT_ANCESTORS] as Ancestor[])[0].id,
        value: alert._source?.[ALERT_SEVERITY],
      }));

      expect(alertsOrderedByParentId.length).toEqual(4);
      expect(severities).toEqual([
        { id: '1', value: 'high' },
        { id: '2', value: 'critical' },
        { id: '3', value: 'critical' },
        { id: '4', value: 'critical' },
      ]);

      alertsOrderedByParentId.forEach((alert) => {
        expect(alert._source?.[ALERT_RISK_SCORE]).toEqual(75);
        expect(alert._source?.[ALERT_RULE_PARAMETERS].risk_score_mapping).toEqual([]);
        expect(alert._source?.[ALERT_RULE_PARAMETERS].severity_mapping).toEqual([
          { field: 'my_severity', operator: 'equals', value: 'sev_900', severity: 'high' },
          { field: 'my_severity', operator: 'equals', value: 'sev_max', severity: 'critical' },
        ]);
      });
    });

    it('should get overridden risk score if the rule has a mapping for it', async () => {
      const rule: QueryRuleCreateProps = {
        ...getRuleForAlertTesting(['signal_overrides']),
        severity: 'medium',
        risk_score: 75,
        risk_score_mapping: [
          { field: 'my_risk', operator: 'equals', value: '', risk_score: undefined },
        ],
      };

      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });
      const alertsOrderedByParentId = orderBy(previewAlerts, 'signal.parent.id', 'asc');
      const riskScores = alertsOrderedByParentId.map((alert) => ({
        id: (alert._source?.[ALERT_ANCESTORS] as Ancestor[])[0].id,
        value: alert._source?.[ALERT_RISK_SCORE],
      }));

      expect(alertsOrderedByParentId.length).toEqual(4);
      expect(riskScores).toEqual([
        { id: '1', value: 31.14 },
        { id: '2', value: 32.14 },
        { id: '3', value: 33.14 },
        { id: '4', value: 34.14 },
      ]);

      alertsOrderedByParentId.forEach((alert) => {
        expect(alert._source?.[ALERT_SEVERITY]).toEqual('medium');
        expect(alert._source?.[ALERT_RULE_PARAMETERS].severity_mapping).toEqual([]);
        expect(alert._source?.[ALERT_RULE_PARAMETERS].risk_score_mapping).toEqual([
          { field: 'my_risk', operator: 'equals', value: '' },
        ]);
      });
    });

    it('should get overridden severity and risk score if the rule has both mappings', async () => {
      const rule: QueryRuleCreateProps = {
        ...getRuleForAlertTesting(['signal_overrides']),
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

      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });
      const alertsOrderedByParentId = orderBy(previewAlerts, 'signal.parent.id', 'asc');
      const values = alertsOrderedByParentId.map((alert) => ({
        id: (alert._source?.[ALERT_ANCESTORS] as Ancestor[])[0].id,
        severity: alert._source?.[ALERT_SEVERITY],
        risk: alert._source?.[ALERT_RISK_SCORE],
      }));

      expect(alertsOrderedByParentId.length).toEqual(4);
      expect(values).toEqual([
        { id: '1', severity: 'high', risk: 31.14 },
        { id: '2', severity: 'critical', risk: 32.14 },
        { id: '3', severity: 'critical', risk: 33.14 },
        { id: '4', severity: 'critical', risk: 34.14 },
      ]);

      alertsOrderedByParentId.forEach((alert) => {
        expect(alert._source?.[ALERT_RULE_PARAMETERS].severity_mapping).toEqual([
          { field: 'my_severity', operator: 'equals', value: 'sev_900', severity: 'high' },
          { field: 'my_severity', operator: 'equals', value: 'sev_max', severity: 'critical' },
        ]);
        expect(alert._source?.[ALERT_RULE_PARAMETERS].risk_score_mapping).toEqual([
          { field: 'my_risk', operator: 'equals', value: '' },
        ]);
      });
    });

    it('should generate alerts with name_override field', async () => {
      const rule: QueryRuleCreateProps = {
        ...getRuleForAlertTesting(['auditbeat-*']),
        query: `event.action:boot`,
        rule_name_override: 'event.action',
      };

      const { previewId } = await previewRule({ supertest, rule });
      const previewAlerts = await getPreviewAlerts({ es, previewId });
      const fullAlert = previewAlerts[0];
      if (!fullAlert) {
        return expect(true).toEqual(true);
      }

      expect(previewAlerts[0]._source?.['kibana.alert.rule.name']).toEqual('boot');
    });

    it('should not generate duplicate alerts', async () => {
      const rule: QueryRuleCreateProps = {
        ...getRuleForAlertTesting(['auditbeat-*']),
        query: `_id:${ID}`,
      };

      const { previewId } = await previewRule({ supertest, rule, invocationCount: 2 });
      const previewAlerts = await getPreviewAlerts({ es, previewId });
      expect(previewAlerts.length).toEqual(1);
    });

    describe('with exceptions', async () => {
      afterEach(async () => {
        await deleteAllExceptions(supertest, log);
      });
      it('should correctly evaluate exceptions with expiration time in the past', async () => {
        // create an exception list container of type "detection"
        const {
          id,
          list_id: listId,
          namespace_type: namespaceType,
          type,
        } = await createExceptionList(supertest, log, {
          description: 'description',
          list_id: '123',
          name: 'test list',
          type: 'detection',
        });

        await createExceptionListItem(supertest, log, {
          description: 'endpoint description',
          entries: [
            {
              field: 'host.name',
              operator: 'included',
              type: 'match',
              value: 'suricata-sensor-london',
            },
          ],
          list_id: listId,
          name: 'endpoint_list',
          os_types: [],
          type: 'simple',
          expire_time: new Date(Date.now() - 1000000).toISOString(),
        });

        const rule: QueryRuleCreateProps = {
          ...getRuleForAlertTesting(['auditbeat-*']),
          query: `_id:${ID} or _id:GBbXBmkBR346wHgn5_eR or _id:x10zJ2oE9v5HJNSHhyxi`,
          exceptions_list: [{ id, list_id: listId, type, namespace_type: namespaceType }],
        };

        const { previewId } = await previewRule({ supertest, rule });
        const previewAlerts = await getPreviewAlerts({ es, previewId });

        expect(previewAlerts.length).toEqual(2);
      });

      it('should correctly evaluate exceptions with expiration time in the future', async () => {
        // create an exception list container of type "detection"
        const {
          id,
          list_id: listId,
          namespace_type: namespaceType,
          type,
        } = await createExceptionList(supertest, log, {
          description: 'description',
          list_id: '123',
          name: 'test list',
          type: 'detection',
        });

        await createExceptionListItem(supertest, log, {
          description: 'endpoint description',
          entries: [
            {
              field: 'host.name',
              operator: 'included',
              type: 'match',
              value: 'suricata-sensor-london',
            },
          ],
          list_id: listId,
          name: 'endpoint_list',
          os_types: [],
          type: 'simple',
          expire_time: new Date(Date.now() + 1000000).toISOString(),
        });

        const rule: QueryRuleCreateProps = {
          ...getRuleForAlertTesting(['auditbeat-*']),
          query: `_id:${ID} or _id:GBbXBmkBR346wHgn5_eR or _id:x10zJ2oE9v5HJNSHhyxi`,
          exceptions_list: [{ id, list_id: listId, type, namespace_type: namespaceType }],
        };

        const { previewId } = await previewRule({ supertest, rule });
        const previewAlerts = await getPreviewAlerts({ es, previewId });

        expect(previewAlerts.length).toEqual(1);
      });
    });

    // https://github.com/elastic/kibana/issues/149920
    describe('field name wildcard queries', async () => {
      const { indexEnhancedDocuments } = dataGeneratorFactory({
        es,
        index: 'ecs_compliant',
        log,
      });

      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/security_solution/ecs_compliant');
      });

      after(async () => {
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/security_solution/ecs_compliant'
        );
      });

      it('should return correct documents with wildcard field query', async () => {
        const id = uuidv4();
        const firstDoc = { id, agent: { name: 'test-1' } };
        const secondDoc = { id, agent: { name: 'test-2' } };

        await indexEnhancedDocuments({ documents: [firstDoc, firstDoc, secondDoc], id });

        const rule: QueryRuleCreateProps = {
          ...getRuleForAlertTesting(['ecs_compliant']),
          query: `id:${id} AND agent.n*: test-1`,
          from: 'now-1h',
          interval: '1h',
        };

        const { previewId } = await previewRule({
          supertest,
          rule,
        });
        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
          size: 10,
          sort: ['agent.name'],
        });
        expect(previewAlerts.length).toEqual(2);

        // both alerts should have agent.name "test-1" as per rule query
        expect(previewAlerts[0]._source?.agent).toHaveProperty('name', 'test-1');
        expect(previewAlerts[1]._source?.agent).toHaveProperty('name', 'test-1');
      });

      it('should return correct documents with negation wildcard field query', async () => {
        const id = uuidv4();
        const firstDoc = { id, agent: { name: 'test-1' } };
        const secondDoc = { id, agent: { name: 'test-2' } };

        await indexEnhancedDocuments({ documents: [firstDoc, firstDoc, secondDoc], id });

        const rule: QueryRuleCreateProps = {
          ...getRuleForAlertTesting(['ecs_compliant']),
          query: `id:${id} AND NOT agent.na*: "test-1"`,
          from: 'now-1h',
          interval: '1h',
        };

        const { previewId } = await previewRule({ supertest, rule });
        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
          sort: ['agent.name'],
        });
        expect(previewAlerts.length).toEqual(1);

        //  alert should not have agent.name "test-1" as per rule query
        expect(previewAlerts[0]._source?.agent).toHaveProperty('name', 'test-2');
      });

      it('should return correct documents with wildcard field query across multiple different fields', async () => {
        const id = uuidv4();
        const firstDoc = { id, agent: { name: 'test-1' } };
        const secondDoc = { id, agent: { name: 'test-2' } };
        const thirdDoc = { id, agent: { name: 'test-3', version: 'test-1' } };

        await indexEnhancedDocuments({ documents: [firstDoc, secondDoc, thirdDoc], id });

        const rule: QueryRuleCreateProps = {
          ...getRuleForAlertTesting(['ecs_compliant']),
          query: `id:${id} AND agent*: "test-1"`,
          from: 'now-1h',
          interval: '1h',
        };

        const { previewId } = await previewRule({
          supertest,
          rule,
        });
        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
          size: 10,
          sort: ['agent.name'],
        });
        expect(previewAlerts.length).toEqual(2);

        // alert should have agent.name "test-1" as per rule query
        expect(previewAlerts[0]._source?.agent).toHaveProperty('name', 'test-1');
        // alert should have agent.name "test-a"  and agent.version "test-1" as per rule query
        expect(previewAlerts[1]._source?.agent).toHaveProperty('version', 'test-1');
        expect(previewAlerts[1]._source?.agent).toHaveProperty('name', 'test-3');
      });

      it('should return correct documents with wildcard field query across multiple different fields for lucene language', async () => {
        const id = uuidv4();
        const firstDoc = { id, agent: { name: 'test-1' } };
        const secondDoc = { id, agent: { name: 'test-2' } };
        const thirdDoc = { id, agent: { name: 'test-3', version: 'test-1' } };

        await indexEnhancedDocuments({ documents: [firstDoc, secondDoc, thirdDoc], id });

        const rule: QueryRuleCreateProps = {
          ...getRuleForAlertTesting(['ecs_compliant']),
          query: `id:${id} AND agent.\\*: test-1`,
          from: 'now-1h',
          interval: '1h',
          language: 'lucene',
        };

        const { previewId } = await previewRule({
          supertest,
          rule,
        });
        const previewAlerts = await getPreviewAlerts({
          es,
          previewId,
          size: 10,
          sort: ['agent.name'],
        });
        expect(previewAlerts.length).toEqual(2);

        // alert should have agent.name "test-1" as per rule query
        expect(previewAlerts[0]._source?.agent).toHaveProperty('name', 'test-1');
        // alert should have agent.name "test-a"  and agent.version "test-1" as per rule query
        expect(previewAlerts[1]._source?.agent).toHaveProperty('version', 'test-1');
        expect(previewAlerts[1]._source?.agent).toHaveProperty('name', 'test-3');
      });
    });
  });
};
