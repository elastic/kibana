/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { cleanup, generate, Dataset, PartialConfig } from '@kbn/data-forge';
import { Aggregators } from '@kbn/observability-plugin/common/custom_threshold_rule/types';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { COMPARATORS } from '@kbn/alerting-comparators';
import type { InternalRequestHeader, RoleCredentials } from '@kbn/ftr-common-functional-services';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { ROLES, apmRule, sloRule, syntheticsRule } from './constants';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const esClient = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const logger = getService('log');
  const alertingApi = getService('alertingApi');
  const dataViewApi = getService('dataViewApi');
  const samlAuth = getService('samlAuth');
  const kibanaServer = getService('kibanaServer');
  let roleAuthc: RoleCredentials;
  let internalReqHeader: InternalRequestHeader;

  describe('Custom Threshold Rule - consumers and priviledges', function () {
    const CUSTOM_THRESHOLD_RULE_ALERT_INDEX_PATTERN = '.alerts-observability.threshold.alerts-*';
    const ALERT_ACTION_INDEX = 'alert-action-threshold';
    const DATA_VIEW = 'kbn-data-forge-fake_hosts.fake_hosts-*';
    const DATA_VIEW_ID = 'data-view-id';
    const DATA_VIEW_NAME = 'data-view-name';
    let dataForgeConfig: PartialConfig;
    let dataForgeIndices: string[];
    let ruleId: string;

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esClient.deleteByQuery({
        index: CUSTOM_THRESHOLD_RULE_ALERT_INDEX_PATTERN,
        query: { match_all: {} },
        conflicts: 'proceed',
      });
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('editor');
      internalReqHeader = samlAuth.getInternalRequestHeader();
      dataForgeConfig = {
        schedule: [
          {
            template: 'good',
            start: 'now-10m',
            end: 'now+5m',
            metrics: [
              { name: 'system.cpu.user.pct', method: 'linear', start: 2.5, end: 2.5 },
              { name: 'system.cpu.total.pct', method: 'linear', start: 0.5, end: 0.5 },
              { name: 'system.cpu.total.norm.pct', method: 'linear', start: 0.8, end: 0.8 },
            ],
          },
        ],
        indexing: {
          dataset: 'fake_hosts' as Dataset,
          eventsPerCycle: 1,
          interval: 60000,
          alignEventsToInterval: true,
        },
      };
      dataForgeIndices = await generate({ client: esClient, config: dataForgeConfig, logger });
      await alertingApi.waitForDocumentInIndex({
        indexName: dataForgeIndices.join(','),
        docCountTarget: 45,
      });
      await dataViewApi.create({
        name: DATA_VIEW_NAME,
        id: DATA_VIEW_ID,
        title: DATA_VIEW,
        roleAuthc,
      });
    });

    after(async () => {
      await supertestWithoutAuth
        .delete(`/api/alerting/rule/${ruleId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(internalReqHeader);
      if (ruleId) {
        await esClient.deleteByQuery({
          index: '.kibana-event-log-*',
          query: { term: { 'rule.id': ruleId } },
          conflicts: 'proceed',
        });
      }
      await dataViewApi.delete({
        id: DATA_VIEW_ID,
        roleAuthc,
      });
      await esDeleteAllIndices([ALERT_ACTION_INDEX, ...dataForgeIndices]);
      await cleanup({ client: esClient, config: dataForgeConfig, logger });
      await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
      await kibanaServer.savedObjects.cleanStandardList();
      await esClient.deleteByQuery({
        index: CUSTOM_THRESHOLD_RULE_ALERT_INDEX_PATTERN,
        query: { match_all: {} },
        conflicts: 'proceed',
      });
    });

    describe('Custom threshold - rule can be created with authorized consumers', function () {
      ['observability', 'logs'].forEach((consumer) => {
        it(`creates rule successfully for consumer ${consumer}`, async () => {
          await samlAuth.setCustomRole(ROLES.rules_only);
          const rulesOnlyRole = await samlAuth.createM2mApiKeyWithCustomRoleScope();
          const createdRule = await alertingApi.createRule({
            roleAuthc: rulesOnlyRole,
            ...getCRRuleConfiguration({ dataViewId: DATA_VIEW_ID, consumer }),
          });
          ruleId = createdRule.id;
          expect(ruleId).not.to.be(undefined);
          await samlAuth.invalidateM2mApiKeyWithRoleScope(rulesOnlyRole);
          await samlAuth.deleteCustomRole();
        });
      });
    });

    describe('Custom threshold - rule cannot be created with unauthorized consumers', function () {
      ['metrics', 'stackAlerts'].forEach((consumer) => {
        it(`creates rule successfully for consumer ${consumer}`, async () => {
          await samlAuth.setCustomRole(ROLES.rules_only);
          const rulesOnlyRole = await samlAuth.createM2mApiKeyWithCustomRoleScope();
          const createdRule = await alertingApi.createRule({
            roleAuthc: rulesOnlyRole,
            ...getCRRuleConfiguration({ dataViewId: DATA_VIEW_ID, consumer }),
          });
          expect(createdRule.statusCode).to.be(403);
          expect(createdRule.message).to.be(
            `Unauthorized by "${consumer}" to create "observability.rules.custom_threshold" rule`
          );
          await samlAuth.invalidateM2mApiKeyWithRoleScope(rulesOnlyRole);
          await samlAuth.deleteCustomRole();
        });
      });
    });

    describe('Custom threshold - rule cannot be created with read-only privileges', function () {
      ['observability', 'logs'].forEach((consumer) => {
        it(`creates rule successfully for consumer ${consumer}`, async () => {
          await samlAuth.setCustomRole(ROLES.rules_read_only);
          const rulesReadOnlyRole = await samlAuth.createM2mApiKeyWithCustomRoleScope();
          const createdRule = await alertingApi.createRule({
            roleAuthc: rulesReadOnlyRole,
            ...getCRRuleConfiguration({ dataViewId: DATA_VIEW_ID, consumer }),
          });
          expect(createdRule.statusCode).to.be(403);
          expect(createdRule.message).to.be(
            `Unauthorized by "${consumer}" to create "observability.rules.custom_threshold" rule`
          );
          await samlAuth.invalidateM2mApiKeyWithRoleScope(rulesReadOnlyRole);
          await samlAuth.deleteCustomRole();
        });
      });
    });

    describe('Rules can be created with alerting consumer', function () {
      [sloRule, syntheticsRule, apmRule].forEach((rule) => {
        it(`creates rule successfully for consumer ${rule.consumer}`, async () => {
          await samlAuth.setCustomRole(ROLES.rules_only);
          const rulesOnlyRole = await samlAuth.createM2mApiKeyWithCustomRoleScope();
          const createdRule = await alertingApi.createRule({
            roleAuthc: rulesOnlyRole,
            ...rule,
          });
          ruleId = createdRule.id;
          expect(ruleId).not.to.be(undefined);
          await samlAuth.invalidateM2mApiKeyWithRoleScope(rulesOnlyRole);
          await samlAuth.deleteCustomRole();
        });
      });
    });

    describe('Rules can also be created full plugin privileges and read only rules privileges', function () {
      [sloRule, syntheticsRule, apmRule].forEach((rule) => {
        it(`plugin all role creates rule successfully for consumer ${rule.consumer}`, async () => {
          await samlAuth.setCustomRole(ROLES.plugins_all);
          const pluginsAllRole = await samlAuth.createM2mApiKeyWithCustomRoleScope();
          const createdRule = await alertingApi.createRule({
            roleAuthc: pluginsAllRole,
            ...rule,
          });
          ruleId = createdRule.id;
          expect(ruleId).not.to.be(undefined);
          await samlAuth.invalidateM2mApiKeyWithRoleScope(pluginsAllRole);
          await samlAuth.deleteCustomRole();
        });
      });
    });
  });
}

const getCRRuleConfiguration = ({
  consumer,
  dataViewId,
}: {
  consumer: string;
  dataViewId: string;
}) => ({
  tags: ['observability'],
  consumer,
  name: 'Threshold rule',
  ruleTypeId: OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  params: {
    criteria: [
      {
        comparator: COMPARATORS.NOT_BETWEEN,
        threshold: [1, 2],
        timeSize: 1,
        timeUnit: 'm' as const,
        metrics: [{ name: 'A', filter: 'container.id:*', aggType: Aggregators.COUNT }],
      },
    ],
    alertOnNoData: true,
    alertOnGroupDisappear: true,
    searchConfiguration: {
      query: {
        query: 'host.name:*',
        language: 'kuery',
      },
      index: dataViewId,
    },
  },
});
