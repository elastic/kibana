/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import moment from 'moment';
import { format } from 'url';
import expect from '@kbn/expect';
import { COMPARATORS } from '@kbn/alerting-comparators';
import { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { Aggregators } from '@kbn/observability-plugin/common/custom_threshold_rule/types';
import { FIRED_ACTIONS_ID } from '@kbn/observability-plugin/server/lib/rules/custom_threshold/constants';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { parseSearchParams } from '@kbn/share-plugin/common/url_service';
import { kbnTestConfig } from '@kbn/test';
import type { InternalRequestHeader, RoleCredentials } from '@kbn/ftr-common-functional-services';
import { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { getSyntraceClient, generateData } from './helpers/syntrace';
import { ISO_DATE_REGEX } from './constants';
import { ActionDocument, LogsExplorerLocatorParsedParams } from './types';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const start = moment(Date.now()).subtract(10, 'minutes').valueOf();
  const end = moment(Date.now()).add(15, 'minutes').valueOf();
  const esClient = getService('es');
  const samlAuth = getService('samlAuth');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const alertingApi = getService('alertingApi');
  const dataViewApi = getService('dataViewApi');
  const config = getService('config');
  const kibanaServerConfig = config.get('servers.kibana');
  const isServerless = config.get('serverless');
  const expectedConsumer = isServerless ? 'observability' : 'logs';
  const kibanaUrl = format(kibanaServerConfig);
  const spacesService = getService('spaces');
  let roleAuthc: RoleCredentials;
  let internalReqHeader: InternalRequestHeader;

  describe('AVG - US - FIRED', () => {
    const CUSTOM_THRESHOLD_RULE_ALERT_INDEX = '.alerts-observability.threshold.alerts-default';
    const ALERT_ACTION_INDEX = 'alert-action-threshold';
    const DATA_VIEW = 'traces-apm*,metrics-apm*,logs-apm*';
    const DATA_VIEW_ID = 'data-view-id';
    const DATA_VIEW_NAME = 'test-data-view-name';
    const SPACE_ID = 'test-space';

    let synthtraceEsClient: ApmSynthtraceEsClient;
    let actionId: string;
    let ruleId: string;
    let alertId: string;

    before(async () => {
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
      internalReqHeader = samlAuth.getInternalRequestHeader();
      synthtraceEsClient = await getSyntraceClient({ esClient, kibanaUrl });
      await generateData({ synthtraceEsClient, start, end });
      await dataViewApi.create({
        name: DATA_VIEW_NAME,
        id: DATA_VIEW_ID,
        title: DATA_VIEW,
        spaceId: SPACE_ID,
        roleAuthc,
      });
      await spacesService.create({
        id: SPACE_ID,
        name: 'Test Space',
        disabledFeatures: [],
        color: '#AABBCC',
      });
    });

    after(async () => {
      await supertestWithoutAuth
        .delete(`/api/alerting/rule/${ruleId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(internalReqHeader);
      await supertestWithoutAuth
        .delete(`/api/actions/connector/${actionId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(internalReqHeader);
      await esDeleteAllIndices([ALERT_ACTION_INDEX]);
      await esClient.deleteByQuery({
        index: CUSTOM_THRESHOLD_RULE_ALERT_INDEX,
        query: { term: { 'kibana.alert.rule.uuid': ruleId } },
      });
      await esClient.deleteByQuery({
        index: '.kibana-event-log-*',
        query: { term: { 'kibana.alert.rule.consumer': expectedConsumer } },
      });
      await synthtraceEsClient.clean();
      await dataViewApi.delete({
        id: DATA_VIEW_ID,
        spaceId: SPACE_ID,
        roleAuthc,
      });
      await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
      await spacesService.delete(SPACE_ID);
    });

    describe('Rule creation', () => {
      it('creates rule successfully', async () => {
        actionId = await alertingApi.createIndexConnector({
          roleAuthc,
          name: 'Index Connector: Threshold API test',
          indexName: ALERT_ACTION_INDEX,
          spaceId: SPACE_ID,
        });

        const createdRule = await alertingApi.createRule({
          roleAuthc,
          spaceId: SPACE_ID,
          tags: ['observability'],
          consumer: expectedConsumer,
          name: 'Threshold rule',
          ruleTypeId: OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
          params: {
            criteria: [
              {
                comparator: COMPARATORS.GREATER_THAN,
                threshold: [7500000],
                timeSize: 5,
                timeUnit: 'm',
                metrics: [
                  { name: 'A', field: 'span.self_time.sum.us', aggType: Aggregators.AVERAGE },
                ],
              },
            ],
            alertOnNoData: true,
            alertOnGroupDisappear: true,
            searchConfiguration: {
              query: {
                query: '',
                language: 'kuery',
              },
              index: DATA_VIEW_ID,
            },
          },
          actions: [
            {
              group: FIRED_ACTIONS_ID,
              id: actionId,
              params: {
                documents: [
                  {
                    ruleType: '{{rule.type}}',
                    alertDetailsUrl: '{{context.alertDetailsUrl}}',
                    reason: '{{context.reason}}',
                    value: '{{context.value}}',
                    viewInAppUrl: '{{context.viewInAppUrl}}',
                  },
                ],
              },
              frequency: {
                notify_when: 'onActionGroupChange',
                throttle: null,
                summary: false,
              },
            },
          ],
        });
        ruleId = createdRule.id;
        expect(ruleId).not.to.be(undefined);
      });

      it('should be active', async () => {
        const executionStatus = await alertingApi.waitForRuleStatus({
          roleAuthc,
          ruleId,
          expectedStatus: 'active',
          spaceId: SPACE_ID,
        });
        expect(executionStatus).to.be('active');
      });

      it('should set correct information in the alert document', async () => {
        const resp = await alertingApi.waitForAlertInIndex({
          indexName: CUSTOM_THRESHOLD_RULE_ALERT_INDEX,
          ruleId,
        });
        alertId = (resp.hits.hits[0]._source as any)['kibana.alert.uuid'];

        expect(resp.hits.hits[0]._source).property(
          'kibana.alert.rule.category',
          'Custom threshold'
        );
        expect(resp.hits.hits[0]._source).property('kibana.alert.rule.consumer', expectedConsumer);
        expect(resp.hits.hits[0]._source).property('kibana.alert.rule.name', 'Threshold rule');
        expect(resp.hits.hits[0]._source).property('kibana.alert.rule.producer', 'observability');
        expect(resp.hits.hits[0]._source).property('kibana.alert.rule.revision', 0);
        expect(resp.hits.hits[0]._source).property(
          'kibana.alert.rule.rule_type_id',
          'observability.rules.custom_threshold'
        );
        expect(resp.hits.hits[0]._source).property('kibana.alert.rule.uuid', ruleId);
        expect(resp.hits.hits[0]._source).property('kibana.space_ids').contain(SPACE_ID);
        expect(resp.hits.hits[0]._source)
          .property('kibana.alert.rule.tags')
          .contain('observability');
        expect(resp.hits.hits[0]._source).property(
          'kibana.alert.action_group',
          'custom_threshold.fired'
        );
        expect(resp.hits.hits[0]._source).property('tags').contain('observability');
        expect(resp.hits.hits[0]._source).property('kibana.alert.instance.id', '*');
        expect(resp.hits.hits[0]._source).property('kibana.alert.workflow_status', 'open');
        expect(resp.hits.hits[0]._source).property('event.kind', 'signal');
        expect(resp.hits.hits[0]._source).property('event.action', 'open');
        expect(resp.hits.hits[0]._source)
          .property('kibana.alert.evaluation.threshold')
          .eql([7500000]);
        expect(resp.hits.hits[0]._source)
          .property('kibana.alert.rule.parameters')
          .eql({
            criteria: [
              {
                comparator: '>',
                threshold: [7500000],
                timeSize: 5,
                timeUnit: 'm',
                metrics: [{ name: 'A', field: 'span.self_time.sum.us', aggType: 'avg' }],
              },
            ],
            alertOnNoData: true,
            alertOnGroupDisappear: true,
            searchConfiguration: { index: 'data-view-id', query: { query: '', language: 'kuery' } },
          });
      });

      it('should set correct action parameter: ruleType', async () => {
        const resp = await alertingApi.waitForDocumentInIndex<ActionDocument>({
          indexName: ALERT_ACTION_INDEX,
          docCountTarget: 1,
        });
        const { protocol, hostname, port } = kbnTestConfig.getUrlPartsWithStrippedDefaultPort();
        expect(resp.hits.hits[0]._source?.ruleType).eql('observability.rules.custom_threshold');
        expect(resp.hits.hits[0]._source?.alertDetailsUrl).eql(
          `${protocol}://${hostname}${
            port ? `:${port}` : ''
          }/s/${SPACE_ID}/app/observability/alerts/${alertId}`
        );
        expect(resp.hits.hits[0]._source?.reason).eql(
          `Average span.self_time.sum.us is 10,000,000, above the threshold of 7,500,000. (duration: 5 mins, data view: ${DATA_VIEW_NAME})`
        );
        expect(resp.hits.hits[0]._source?.value).eql('10,000,000');

        const parsedViewInAppUrl = parseSearchParams<LogsExplorerLocatorParsedParams>(
          new URL(resp.hits.hits[0]._source?.viewInAppUrl || '').search
        );
        const viewInAppUrlPathName = new URL(resp.hits.hits[0]._source?.viewInAppUrl || '')
          .pathname;

        expect(viewInAppUrlPathName).contain(`/s/${SPACE_ID}/app/r`);
        expect(resp.hits.hits[0]._source?.viewInAppUrl).contain('LOGS_EXPLORER_LOCATOR');
        expect(omit(parsedViewInAppUrl.params, 'timeRange.from')).eql({
          dataset: DATA_VIEW_ID,
          timeRange: { to: 'now' },
          query: { query: '', language: 'kuery' },
          filters: [],
        });
        expect(parsedViewInAppUrl.params.timeRange.from).match(ISO_DATE_REGEX);
      });
    });
  });
}
