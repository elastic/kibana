/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import rawExpect from 'expect';
import expect from '@kbn/expect';
import { join } from 'path';
import type { Dataset, PartialConfig } from '@kbn/data-forge';
import { cleanup, generate } from '@kbn/data-forge';
import type { RoleCredentials } from '@kbn/ftr-common-functional-services';
import { Aggregators } from '@kbn/observability-plugin/common/custom_threshold_rule/types';
import { COMPARATORS } from '@kbn/alerting-comparators';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { ALERTS_API_URLS } from '@kbn/observability-plugin/common/constants';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const CUSTOM_THRESHOLD_RULE_ALERT_INDEX = '.alerts-observability.threshold.alerts-default';
  const esClient = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  // TODO: Replace with roleScopedSupertest for deployment-agnostic compatibility
  // eslint-disable-next-line @kbn/eslint/deployment_agnostic_test_context
  const supertestWithAuth = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const logger = getService('log');
  const alertingApi = getService('alertingApi');
  const samlAuth = getService('samlAuth');
  const spacesService = getService('spaces');
  const config = getService('config');
  const isServerless = config.get('serverless');
  const expectedConsumer = isServerless ? 'observability' : 'logs';
  const scheduleInterval = isServerless ? '1m' : '10s';

  let dataForgeConfig: PartialConfig;
  let editorUser: RoleCredentials;
  let dataForgeIndices: string[];
  let ruleId: string;
  const SPACE_ID = 'test_space';

  describe('Related dashboards', function () {
    this.tags(['skipCloud', 'skipMKI']);
    before(async () => {
      editorUser = await samlAuth.createM2mApiKeyWithRoleScope('editor');
      await spacesService.delete(SPACE_ID);
      await kibanaServer.savedObjects.cleanStandardList();
      await spacesService.create({
        id: SPACE_ID,
        name: 'Test Space',
        disabledFeatures: [],
        color: '#AABBCC',
      });
      dataForgeConfig = {
        schedule: [
          {
            template: 'bad',
            start: 'now-15m',
            end: 'now+5m',
          },
        ],
        indexing: {
          dataset: 'fake_stack' as Dataset,
          eventsPerCycle: 1,
          interval: 10000,
          alignEventsToInterval: true,
        },
      };

      const { body } = await supertestWithAuth
        .post('/api/saved_objects/_import')
        .set(samlAuth.getInternalRequestHeader())
        .attach('file', join(__dirname, './fixtures/dashboards_default_space.ndjson'))
        .expect(200);

      const { successResults } = body as { successResults: Array<{ type: string; id: string }> };

      const objectIds = successResults
        .filter((result) => result.type === 'index-pattern')
        .map((result) => result.id);

      await supertestWithAuth
        .post('/api/spaces/_update_objects_spaces')
        .set(samlAuth.getInternalRequestHeader())
        .send({
          objects: objectIds.map((id) => ({
            type: 'index-pattern',
            id,
          })),
          spacesToAdd: [SPACE_ID],
          spacesToRemove: [],
        })
        .expect(200);

      const indexPatternsResponse = await supertestWithAuth
        .post('/api/content_management/rpc/search')
        .set(samlAuth.getInternalRequestHeader())
        .send({
          contentTypeId: 'index-pattern',
          query: {
            limit: 10000,
          },
          options: {
            fields: ['title', 'type', 'typeMeta', 'name'],
          },
          version: 1,
        })
        .expect(200);

      indexPatternsResponse.body.result.result.hits.forEach((hit: any) => {
        expect(hit.namespaces).to.eql(['default', SPACE_ID]);
      });

      await supertestWithAuth
        .post(`/s/${SPACE_ID}/api/saved_objects/_import`)
        .set(samlAuth.getInternalRequestHeader())
        .attach('file', join(__dirname, './fixtures/dashboards_test_space.ndjson'))
        .expect(200);

      const createdRule = await alertingApi.createRule({
        roleAuthc: editorUser,
        spaceId: 'default',
        tags: ['observability'],
        consumer: expectedConsumer,
        name: 'Threshold rule',
        ruleTypeId: OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
        params: {
          alertOnGroupDisappear: false,
          alertOnNoData: false,
          criteria: [
            {
              comparator: COMPARATORS.GREATER_THAN,
              equation: '1 - (A / B)',
              label: 'Percentage of Rejected Messages',
              metrics: [
                {
                  aggType: Aggregators.SUM,
                  field: 'processor.processed',
                  name: 'A',
                },
                {
                  aggType: Aggregators.SUM,
                  field: 'processor.accepted',
                  name: 'B',
                },
              ],
              threshold: [0.0005],
              timeSize: 1,
              timeUnit: 'm',
            },
          ],
          groupBy: ['host.name'],
          searchConfiguration: {
            query: {
              language: 'kuery',
              query: '',
            },
            index: '593f894a-3378-42cc-bafc-61b4877b64b0',
          },
        },
        actions: [],
        schedule: {
          interval: scheduleInterval,
        },
      });
      ruleId = createdRule.id;
      expect(ruleId).not.to.be(undefined);

      dataForgeIndices = await generate({ client: esClient, config: dataForgeConfig, logger });
      await alertingApi.waitForDocumentInIndex({
        indexName: dataForgeIndices.join(','),
        docCountTarget: 500,
      });
      const executionStatus = await alertingApi.waitForRuleStatus({
        roleAuthc: editorUser,
        ruleId,
        expectedStatus: 'active',
      });
      expect(executionStatus).to.be('active');
    });

    after(async () => {
      await supertestWithoutAuth
        .delete(`/api/alerting/rule/${ruleId}`)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(204);
      await esClient.deleteByQuery({
        index: CUSTOM_THRESHOLD_RULE_ALERT_INDEX,
        query: { term: { 'kibana.alert.rule.uuid': ruleId } },
        conflicts: 'proceed',
      });
      await esClient.deleteByQuery({
        index: '.kibana-event-log-*',
        query: { term: { 'rule.id': ruleId } },
        conflicts: 'proceed',
      });
      await esDeleteAllIndices(dataForgeIndices);
      await cleanup({ client: esClient, config: dataForgeConfig, logger });
      await kibanaServer.savedObjects.cleanStandardList();
      await samlAuth.invalidateM2mApiKeyWithRoleScope(editorUser);
    });

    it('should return a list of suggested dashboards', async () => {
      const alertResponse = await alertingApi.waitForDocumentInIndex({
        indexName: CUSTOM_THRESHOLD_RULE_ALERT_INDEX,
        docCountTarget: 1,
      });
      const firstHit = alertResponse.hits.hits[0];
      const alertId = firstHit._id;

      const { body } = await supertestWithoutAuth
        .get(`${ALERTS_API_URLS.INTERNAL_RELATED_DASHBOARDS}?alertId=${alertId}`)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      rawExpect(body).toEqual({
        linkedDashboards: [],
        suggestedDashboards: rawExpect.arrayContaining([
          {
            id: '48089ec0-f039-11ed-bdc6-f382ac874aa0',
            title: 'Message Processor Operations',
            score: 0.375,
            matchedBy: {
              index: ['593f894a-3378-42cc-bafc-61b4877b64b0'],
              fields: ['processor.processed', 'processor.accepted', 'host.name'],
            },
          },
          {
            id: 'b6fc0f00-f5a3-11ed-9275-13469aefbc4f',
            title: 'Transaction Rates',
            score: 0.25,
            matchedBy: {
              index: ['593f894a-3378-42cc-bafc-61b4877b64b0'],
              fields: ['processor.processed', 'processor.accepted'],
            },
          },
        ]),
      });
    });
  });
}
