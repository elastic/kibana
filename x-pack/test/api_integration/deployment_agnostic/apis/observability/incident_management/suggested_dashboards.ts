/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import rawExpect from 'expect';
import expect from '@kbn/expect';
import { join } from 'path';
import { cleanup, generate, Dataset, PartialConfig } from '@kbn/data-forge';
import type { RoleCredentials } from '@kbn/ftr-common-functional-services';
import { Aggregators } from '@kbn/observability-plugin/common/custom_threshold_rule/types';
import { COMPARATORS } from '@kbn/alerting-comparators';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { ALERTS_API_URLS } from '@kbn/observability-plugin/common/constants';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const CUSTOM_THRESHOLD_RULE_ALERT_INDEX = '.alerts-observability.threshold.alerts-default';
  const esClient = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
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
            relevantPanelCount: 2,
            relevantPanels: [
              {
                panel: {
                  panelIndex: '04857532-a5b3-4de0-a79f-75d8d0b5c8c7',
                  type: 'lens',
                  panelConfig: {
                    enhancements: { dynamicActions: { events: [] } },
                    syncColors: false,
                    syncCursor: true,
                    syncTooltips: false,
                    filters: [],
                    query: { query: '', language: 'kuery' },
                    attributes: {
                      title: '',
                      visualizationType: 'lnsXY',
                      type: 'lens',
                      references: [
                        {
                          type: 'index-pattern',
                          id: '593f894a-3378-42cc-bafc-61b4877b64b0',
                          name: 'indexpattern-datasource-layer-9ad575bb-1de0-4b4c-a42f-bd9117f7c123',
                        },
                        {
                          type: 'index-pattern',
                          id: '593f894a-3378-42cc-bafc-61b4877b64b0',
                          name: 'indexpattern-datasource-layer-3d6a7da9-b2c1-4dfd-848c-499cbd34f8d1',
                        },
                      ],
                      state: {
                        visualization: {
                          title: 'Empty XY chart',
                          legend: { isVisible: true, position: 'right' },
                          valueLabels: 'hide',
                          preferredSeriesType: 'bar_stacked',
                          layers: [
                            {
                              layerId: '9ad575bb-1de0-4b4c-a42f-bd9117f7c123',
                              accessors: ['5c829b86-8e00-4dec-ae77-409d14f1e9c6'],
                              position: 'top',
                              seriesType: 'bar_stacked',
                              showGridlines: false,
                              layerType: 'data',
                              colorMapping: {
                                assignments: [],
                                specialAssignments: [
                                  {
                                    rule: { type: 'other' },
                                    color: { type: 'loop' },
                                    touched: false,
                                  },
                                ],
                                paletteId: 'default',
                                colorMode: { type: 'categorical' },
                              },
                              xAccessor: 'ee21691a-428f-4ad1-8ae2-349459564af4',
                            },
                            {
                              layerId: '3d6a7da9-b2c1-4dfd-848c-499cbd34f8d1',
                              layerType: 'data',
                              accessors: ['d6aa9f6b-57b7-46dc-afb2-0e60712da597'],
                              seriesType: 'bar_stacked',
                              xAccessor: '79c23309-891f-48be-8290-ab6141ea8761',
                              yConfig: [
                                {
                                  forAccessor: 'd6aa9f6b-57b7-46dc-afb2-0e60712da597',
                                  color: '#f6726a',
                                },
                              ],
                            },
                          ],
                          yTitle: 'Processed vs Rejected',
                          axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
                        },
                        query: { query: '', language: 'kuery' },
                        filters: [],
                        datasourceStates: {
                          formBased: {
                            layers: {
                              '9ad575bb-1de0-4b4c-a42f-bd9117f7c123': {
                                columns: {
                                  'ee21691a-428f-4ad1-8ae2-349459564af4': {
                                    label: '@timestamp',
                                    dataType: 'date',
                                    operationType: 'date_histogram',
                                    sourceField: '@timestamp',
                                    isBucketed: true,
                                    scale: 'interval',
                                    params: {
                                      interval: 'auto',
                                      includeEmptyRows: true,
                                      dropPartials: false,
                                    },
                                  },
                                  '5c829b86-8e00-4dec-ae77-409d14f1e9c6X0': {
                                    label: 'Part of sum(processor.processed)',
                                    dataType: 'number',
                                    operationType: 'sum',
                                    sourceField: 'processor.processed',
                                    isBucketed: false,
                                    scale: 'ratio',
                                    params: { emptyAsNull: false },
                                    customLabel: true,
                                  },
                                  '5c829b86-8e00-4dec-ae77-409d14f1e9c6': {
                                    label: 'Processed',
                                    dataType: 'number',
                                    operationType: 'formula',
                                    isBucketed: false,
                                    scale: 'ratio',
                                    params: {
                                      formula: 'sum(processor.processed)',
                                      isFormulaBroken: false,
                                    },
                                    references: ['5c829b86-8e00-4dec-ae77-409d14f1e9c6X0'],
                                    customLabel: true,
                                  },
                                },
                                columnOrder: [
                                  'ee21691a-428f-4ad1-8ae2-349459564af4',
                                  '5c829b86-8e00-4dec-ae77-409d14f1e9c6',
                                  '5c829b86-8e00-4dec-ae77-409d14f1e9c6X0',
                                ],
                                sampling: 1,
                                ignoreGlobalFilters: false,
                                incompleteColumns: {},
                              },
                              '3d6a7da9-b2c1-4dfd-848c-499cbd34f8d1': {
                                linkToLayers: [],
                                columns: {
                                  '79c23309-891f-48be-8290-ab6141ea8761': {
                                    label: '@timestamp',
                                    dataType: 'date',
                                    operationType: 'date_histogram',
                                    sourceField: '@timestamp',
                                    isBucketed: true,
                                    scale: 'interval',
                                    params: {
                                      interval: 'auto',
                                      includeEmptyRows: true,
                                      dropPartials: false,
                                    },
                                  },
                                  'd6aa9f6b-57b7-46dc-afb2-0e60712da597X0': {
                                    label:
                                      'Part of sum(processor.accepted) - sum(processor.processed)',
                                    dataType: 'number',
                                    operationType: 'sum',
                                    sourceField: 'processor.accepted',
                                    isBucketed: false,
                                    scale: 'ratio',
                                    params: { emptyAsNull: false },
                                    customLabel: true,
                                  },
                                  'd6aa9f6b-57b7-46dc-afb2-0e60712da597X1': {
                                    label:
                                      'Part of sum(processor.accepted) - sum(processor.processed)',
                                    dataType: 'number',
                                    operationType: 'sum',
                                    sourceField: 'processor.processed',
                                    isBucketed: false,
                                    scale: 'ratio',
                                    params: { emptyAsNull: false },
                                    customLabel: true,
                                  },
                                  'd6aa9f6b-57b7-46dc-afb2-0e60712da597X2': {
                                    label:
                                      'Part of sum(processor.accepted) - sum(processor.processed)',
                                    dataType: 'number',
                                    operationType: 'math',
                                    isBucketed: false,
                                    scale: 'ratio',
                                    params: {
                                      tinymathAst: {
                                        type: 'function',
                                        name: 'subtract',
                                        args: [
                                          'd6aa9f6b-57b7-46dc-afb2-0e60712da597X0',
                                          'd6aa9f6b-57b7-46dc-afb2-0e60712da597X1',
                                        ],
                                        location: { min: 0, max: 50 },
                                        text: 'sum(processor.accepted) - sum(processor.processed)',
                                      },
                                    },
                                    references: [
                                      'd6aa9f6b-57b7-46dc-afb2-0e60712da597X0',
                                      'd6aa9f6b-57b7-46dc-afb2-0e60712da597X1',
                                    ],
                                    customLabel: true,
                                  },
                                  'd6aa9f6b-57b7-46dc-afb2-0e60712da597': {
                                    label: 'Rejected',
                                    dataType: 'number',
                                    operationType: 'formula',
                                    isBucketed: false,
                                    scale: 'ratio',
                                    params: {
                                      formula: 'sum(processor.accepted) - sum(processor.processed)',
                                      isFormulaBroken: false,
                                    },
                                    references: ['d6aa9f6b-57b7-46dc-afb2-0e60712da597X2'],
                                    customLabel: true,
                                  },
                                },
                                columnOrder: [
                                  '79c23309-891f-48be-8290-ab6141ea8761',
                                  'd6aa9f6b-57b7-46dc-afb2-0e60712da597',
                                  'd6aa9f6b-57b7-46dc-afb2-0e60712da597X0',
                                  'd6aa9f6b-57b7-46dc-afb2-0e60712da597X1',
                                  'd6aa9f6b-57b7-46dc-afb2-0e60712da597X2',
                                ],
                                sampling: 1,
                                ignoreGlobalFilters: false,
                                incompleteColumns: {},
                              },
                            },
                          },
                          indexpattern: { layers: {} },
                          textBased: { layers: {} },
                        },
                        internalReferences: [],
                        adHocDataViews: {},
                      },
                    },
                  },
                },
                matchedBy: {
                  index: ['593f894a-3378-42cc-bafc-61b4877b64b0'],
                  fields: ['processor.processed', 'processor.accepted'],
                },
              },
              {
                panel: {
                  panelIndex: '8db7a201-95c8-4211-89b5-1288e18c8f2e',
                  type: 'lens',
                  panelConfig: {
                    title: '',
                    enhancements: { dynamicActions: { events: [] } },
                    syncColors: false,
                    syncCursor: true,
                    syncTooltips: false,
                    filters: [],
                    query: { query: '', language: 'kuery' },
                    attributes: {
                      title: '',
                      visualizationType: 'lnsXY',
                      type: 'lens',
                      references: [
                        {
                          type: 'index-pattern',
                          id: '593f894a-3378-42cc-bafc-61b4877b64b0',
                          name: 'indexpattern-datasource-layer-3d6a7da9-b2c1-4dfd-848c-499cbd34f8d1',
                        },
                      ],
                      state: {
                        visualization: {
                          title: 'Empty XY chart',
                          legend: { isVisible: true, position: 'right' },
                          valueLabels: 'hide',
                          preferredSeriesType: 'bar_stacked',
                          layers: [
                            {
                              layerId: '3d6a7da9-b2c1-4dfd-848c-499cbd34f8d1',
                              layerType: 'data',
                              accessors: ['d6aa9f6b-57b7-46dc-afb2-0e60712da597'],
                              seriesType: 'bar_stacked',
                              xAccessor: '79c23309-891f-48be-8290-ab6141ea8761',
                              yConfig: [
                                {
                                  forAccessor: 'd6aa9f6b-57b7-46dc-afb2-0e60712da597',
                                  color: '#f6726a',
                                },
                              ],
                              splitAccessor: '0fac59b3-04e0-4d9c-84a8-75227c7db151',
                            },
                          ],
                          yTitle: 'Processed vs Rejected',
                          axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
                        },
                        query: { query: '', language: 'kuery' },
                        filters: [],
                        datasourceStates: {
                          formBased: {
                            layers: {
                              '3d6a7da9-b2c1-4dfd-848c-499cbd34f8d1': {
                                linkToLayers: [],
                                columns: {
                                  '79c23309-891f-48be-8290-ab6141ea8761': {
                                    label: '@timestamp',
                                    dataType: 'date',
                                    operationType: 'date_histogram',
                                    sourceField: '@timestamp',
                                    isBucketed: true,
                                    scale: 'interval',
                                    params: {
                                      interval: 'auto',
                                      includeEmptyRows: true,
                                      dropPartials: false,
                                    },
                                  },
                                  'd6aa9f6b-57b7-46dc-afb2-0e60712da597X0': {
                                    label:
                                      'Part of sum(processor.accepted) - sum(processor.processed)',
                                    dataType: 'number',
                                    operationType: 'sum',
                                    sourceField: 'processor.accepted',
                                    isBucketed: false,
                                    scale: 'ratio',
                                    params: { emptyAsNull: false },
                                    customLabel: true,
                                  },
                                  'd6aa9f6b-57b7-46dc-afb2-0e60712da597X1': {
                                    label:
                                      'Part of sum(processor.accepted) - sum(processor.processed)',
                                    dataType: 'number',
                                    operationType: 'sum',
                                    sourceField: 'processor.processed',
                                    isBucketed: false,
                                    scale: 'ratio',
                                    params: { emptyAsNull: false },
                                    customLabel: true,
                                  },
                                  'd6aa9f6b-57b7-46dc-afb2-0e60712da597X2': {
                                    label:
                                      'Part of sum(processor.accepted) - sum(processor.processed)',
                                    dataType: 'number',
                                    operationType: 'math',
                                    isBucketed: false,
                                    scale: 'ratio',
                                    params: {
                                      tinymathAst: {
                                        type: 'function',
                                        name: 'subtract',
                                        args: [
                                          'd6aa9f6b-57b7-46dc-afb2-0e60712da597X0',
                                          'd6aa9f6b-57b7-46dc-afb2-0e60712da597X1',
                                        ],
                                        location: { min: 0, max: 50 },
                                        text: 'sum(processor.accepted) - sum(processor.processed)',
                                      },
                                    },
                                    references: [
                                      'd6aa9f6b-57b7-46dc-afb2-0e60712da597X0',
                                      'd6aa9f6b-57b7-46dc-afb2-0e60712da597X1',
                                    ],
                                    customLabel: true,
                                  },
                                  'd6aa9f6b-57b7-46dc-afb2-0e60712da597': {
                                    label: 'Rejected',
                                    dataType: 'number',
                                    operationType: 'formula',
                                    isBucketed: false,
                                    scale: 'ratio',
                                    params: {
                                      formula: 'sum(processor.accepted) - sum(processor.processed)',
                                      isFormulaBroken: false,
                                    },
                                    references: ['d6aa9f6b-57b7-46dc-afb2-0e60712da597X2'],
                                    customLabel: true,
                                  },
                                  '0fac59b3-04e0-4d9c-84a8-75227c7db151': {
                                    label: 'Top 10 values of host.name',
                                    dataType: 'string',
                                    operationType: 'terms',
                                    scale: 'ordinal',
                                    sourceField: 'host.name',
                                    isBucketed: true,
                                    params: {
                                      size: 10,
                                      orderBy: { type: 'alphabetical', fallback: true },
                                      orderDirection: 'asc',
                                      otherBucket: true,
                                      missingBucket: false,
                                      parentFormat: { id: 'terms' },
                                      include: [],
                                      exclude: [],
                                      includeIsRegex: false,
                                      excludeIsRegex: false,
                                    },
                                  },
                                },
                                columnOrder: [
                                  '0fac59b3-04e0-4d9c-84a8-75227c7db151',
                                  '79c23309-891f-48be-8290-ab6141ea8761',
                                  'd6aa9f6b-57b7-46dc-afb2-0e60712da597',
                                  'd6aa9f6b-57b7-46dc-afb2-0e60712da597X0',
                                  'd6aa9f6b-57b7-46dc-afb2-0e60712da597X1',
                                  'd6aa9f6b-57b7-46dc-afb2-0e60712da597X2',
                                ],
                                sampling: 1,
                                ignoreGlobalFilters: false,
                                incompleteColumns: {},
                                indexPatternId: '593f894a-3378-42cc-bafc-61b4877b64b0',
                              },
                            },
                            currentIndexPatternId: '593f894a-3378-42cc-bafc-61b4877b64b0',
                          },
                          indexpattern: {
                            layers: {},
                            currentIndexPatternId: '593f894a-3378-42cc-bafc-61b4877b64b0',
                          },
                          textBased: {
                            layers: {},
                            indexPatternRefs: [
                              {
                                id: '593f894a-3378-42cc-bafc-61b4877b64b0',
                                title: 'kbn-data-forge-fake_stack.message_processor-*',
                                timeField: '@timestamp',
                              },
                            ],
                          },
                        },
                        internalReferences: [],
                        adHocDataViews: {},
                      },
                    },
                  },
                  title: '',
                },
                matchedBy: {
                  index: ['593f894a-3378-42cc-bafc-61b4877b64b0'],
                  fields: ['processor.processed', 'processor.accepted', 'host.name'],
                },
              },
            ],
          },
          {
            id: 'b6fc0f00-f5a3-11ed-9275-13469aefbc4f',
            title: 'Transaction Rates',
            score: 0.25,
            matchedBy: {
              index: ['593f894a-3378-42cc-bafc-61b4877b64b0'],
              fields: ['processor.processed', 'processor.accepted'],
            },
            relevantPanelCount: 1,
            relevantPanels: [
              {
                panel: {
                  panelIndex: 'f7d97f37-6684-4ab6-8da9-4b9f4f809a22',
                  type: 'lens',
                  panelConfig: {
                    enhancements: { dynamicActions: { events: [] } },
                    syncColors: false,
                    syncCursor: true,
                    syncTooltips: false,
                    filters: [],
                    query: { query: '', language: 'kuery' },
                    attributes: {
                      title: '',
                      visualizationType: 'lnsXY',
                      type: 'lens',
                      references: [
                        {
                          type: 'index-pattern',
                          id: '593f894a-3378-42cc-bafc-61b4877b64b0',
                          name: 'indexpattern-datasource-layer-04450f23-63ae-4570-87d9-8c5c89b53bce',
                        },
                        {
                          type: 'index-pattern',
                          id: '593f894a-3378-42cc-bafc-61b4877b64b0',
                          name: 'indexpattern-datasource-layer-73aa5801-eb35-4e4f-8b94-adef5fca8c16',
                        },
                      ],
                      state: {
                        visualization: {
                          title: 'Empty XY chart',
                          legend: { isVisible: true, position: 'right' },
                          valueLabels: 'hide',
                          preferredSeriesType: 'bar_stacked',
                          layers: [
                            {
                              layerId: '04450f23-63ae-4570-87d9-8c5c89b53bce',
                              accessors: ['9659b670-1b65-4f38-8098-8c04d28a3d66'],
                              position: 'top',
                              seriesType: 'bar_stacked',
                              showGridlines: false,
                              layerType: 'data',
                              colorMapping: {
                                assignments: [],
                                specialAssignments: [
                                  {
                                    rule: { type: 'other' },
                                    color: { type: 'loop' },
                                    touched: false,
                                  },
                                ],
                                paletteId: 'default',
                                colorMode: { type: 'categorical' },
                              },
                              xAccessor: '78f5b4c0-bcf5-4dc1-8fb2-c766f0975d59',
                            },
                            {
                              layerId: '73aa5801-eb35-4e4f-8b94-adef5fca8c16',
                              layerType: 'data',
                              accessors: ['1b14c449-f51f-4fd7-8431-de62a8c24f3f'],
                              seriesType: 'bar_stacked',
                              xAccessor: '89e414d1-0045-46df-9555-7d265a9f5960',
                              yConfig: [
                                {
                                  forAccessor: '1b14c449-f51f-4fd7-8431-de62a8c24f3f',
                                  color: '#f6726a',
                                },
                              ],
                            },
                          ],
                          labelsOrientation: { x: 0, yLeft: -90, yRight: 0 },
                          yTitle: 'Message Rate',
                          axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
                        },
                        query: { query: '', language: 'kuery' },
                        filters: [],
                        datasourceStates: {
                          formBased: {
                            layers: {
                              '04450f23-63ae-4570-87d9-8c5c89b53bce': {
                                columns: {
                                  '78f5b4c0-bcf5-4dc1-8fb2-c766f0975d59': {
                                    label: '@timestamp',
                                    dataType: 'date',
                                    operationType: 'date_histogram',
                                    sourceField: '@timestamp',
                                    isBucketed: true,
                                    scale: 'interval',
                                    params: {
                                      interval: 'auto',
                                      includeEmptyRows: true,
                                      dropPartials: false,
                                    },
                                  },
                                  '9659b670-1b65-4f38-8098-8c04d28a3d66X0': {
                                    label:
                                      'Part of sum(processor.processed) / ((interval() / 1000) / 60)',
                                    dataType: 'number',
                                    operationType: 'sum',
                                    sourceField: 'processor.processed',
                                    isBucketed: false,
                                    scale: 'ratio',
                                    params: { emptyAsNull: false },
                                    customLabel: true,
                                  },
                                  '9659b670-1b65-4f38-8098-8c04d28a3d66X1': {
                                    label:
                                      'Part of sum(processor.processed) / ((interval() / 1000) / 60)',
                                    dataType: 'number',
                                    operationType: 'interval',
                                    isBucketed: false,
                                    scale: 'ratio',
                                    references: [],
                                    customLabel: true,
                                  },
                                  '9659b670-1b65-4f38-8098-8c04d28a3d66X2': {
                                    label:
                                      'Part of sum(processor.processed) / ((interval() / 1000) / 60)',
                                    dataType: 'number',
                                    operationType: 'math',
                                    isBucketed: false,
                                    scale: 'ratio',
                                    params: {
                                      tinymathAst: {
                                        type: 'function',
                                        name: 'divide',
                                        args: [
                                          '9659b670-1b65-4f38-8098-8c04d28a3d66X0',
                                          {
                                            type: 'function',
                                            name: 'divide',
                                            args: [
                                              {
                                                type: 'function',
                                                name: 'divide',
                                                args: [
                                                  '9659b670-1b65-4f38-8098-8c04d28a3d66X1',
                                                  1000,
                                                ],
                                                location: { min: 29, max: 46 },
                                                text: 'interval() / 1000',
                                              },
                                              60,
                                            ],
                                            location: { min: 28, max: 52 },
                                            text: '(interval() / 1000) / 60',
                                          },
                                        ],
                                        location: { min: 0, max: 53 },
                                        text: 'sum(processor.processed) / ((interval() / 1000) / 60)',
                                      },
                                    },
                                    references: [
                                      '9659b670-1b65-4f38-8098-8c04d28a3d66X0',
                                      '9659b670-1b65-4f38-8098-8c04d28a3d66X1',
                                    ],
                                    customLabel: true,
                                  },
                                  '9659b670-1b65-4f38-8098-8c04d28a3d66': {
                                    label: 'Processed Rate',
                                    dataType: 'number',
                                    operationType: 'formula',
                                    isBucketed: false,
                                    scale: 'ratio',
                                    params: {
                                      formula:
                                        'sum(processor.processed) / ((interval() / 1000) / 60)',
                                      isFormulaBroken: false,
                                    },
                                    references: ['9659b670-1b65-4f38-8098-8c04d28a3d66X2'],
                                    customLabel: true,
                                  },
                                },
                                columnOrder: [
                                  '78f5b4c0-bcf5-4dc1-8fb2-c766f0975d59',
                                  '9659b670-1b65-4f38-8098-8c04d28a3d66',
                                  '9659b670-1b65-4f38-8098-8c04d28a3d66X0',
                                  '9659b670-1b65-4f38-8098-8c04d28a3d66X1',
                                  '9659b670-1b65-4f38-8098-8c04d28a3d66X2',
                                ],
                                sampling: 1,
                                ignoreGlobalFilters: false,
                                incompleteColumns: {},
                              },
                              '73aa5801-eb35-4e4f-8b94-adef5fca8c16': {
                                linkToLayers: [],
                                columns: {
                                  '89e414d1-0045-46df-9555-7d265a9f5960': {
                                    label: '@timestamp',
                                    dataType: 'date',
                                    operationType: 'date_histogram',
                                    sourceField: '@timestamp',
                                    isBucketed: true,
                                    scale: 'interval',
                                    params: {
                                      interval: 'auto',
                                      includeEmptyRows: true,
                                      dropPartials: false,
                                    },
                                  },
                                  '1b14c449-f51f-4fd7-8431-de62a8c24f3fX0': {
                                    label:
                                      'Part of sum(processor.accepted) - sum(processor.processed) / ((interval() / 1000) / 60)',
                                    dataType: 'number',
                                    operationType: 'sum',
                                    sourceField: 'processor.accepted',
                                    isBucketed: false,
                                    scale: 'ratio',
                                    params: { emptyAsNull: false },
                                    customLabel: true,
                                  },
                                  '1b14c449-f51f-4fd7-8431-de62a8c24f3fX1': {
                                    label:
                                      'Part of sum(processor.accepted) - sum(processor.processed) / ((interval() / 1000) / 60)',
                                    dataType: 'number',
                                    operationType: 'sum',
                                    sourceField: 'processor.processed',
                                    isBucketed: false,
                                    scale: 'ratio',
                                    params: { emptyAsNull: false },
                                    customLabel: true,
                                  },
                                  '1b14c449-f51f-4fd7-8431-de62a8c24f3fX2': {
                                    label:
                                      'Part of sum(processor.accepted) - sum(processor.processed) / ((interval() / 1000) / 60)',
                                    dataType: 'number',
                                    operationType: 'interval',
                                    isBucketed: false,
                                    scale: 'ratio',
                                    references: [],
                                    customLabel: true,
                                  },
                                  '1b14c449-f51f-4fd7-8431-de62a8c24f3fX3': {
                                    label:
                                      'Part of sum(processor.accepted) - sum(processor.processed) / ((interval() / 1000) / 60)',
                                    dataType: 'number',
                                    operationType: 'math',
                                    isBucketed: false,
                                    scale: 'ratio',
                                    params: {
                                      tinymathAst: {
                                        type: 'function',
                                        name: 'subtract',
                                        args: [
                                          '1b14c449-f51f-4fd7-8431-de62a8c24f3fX0',
                                          {
                                            type: 'function',
                                            name: 'divide',
                                            args: [
                                              '1b14c449-f51f-4fd7-8431-de62a8c24f3fX1',
                                              {
                                                type: 'function',
                                                name: 'divide',
                                                args: [
                                                  {
                                                    type: 'function',
                                                    name: 'divide',
                                                    args: [
                                                      '1b14c449-f51f-4fd7-8431-de62a8c24f3fX2',
                                                      1000,
                                                    ],
                                                    location: { min: 55, max: 72 },
                                                    text: 'interval() / 1000',
                                                  },
                                                  60,
                                                ],
                                                location: { min: 54, max: 78 },
                                                text: '(interval() / 1000) / 60',
                                              },
                                            ],
                                            location: { min: 25, max: 79 },
                                            text: ' sum(processor.processed) / ((interval() / 1000) / 60)',
                                          },
                                        ],
                                        location: { min: 0, max: 79 },
                                        text: 'sum(processor.accepted) - sum(processor.processed) / ((interval() / 1000) / 60)',
                                      },
                                    },
                                    references: [
                                      '1b14c449-f51f-4fd7-8431-de62a8c24f3fX0',
                                      '1b14c449-f51f-4fd7-8431-de62a8c24f3fX1',
                                      '1b14c449-f51f-4fd7-8431-de62a8c24f3fX2',
                                    ],
                                    customLabel: true,
                                  },
                                  '1b14c449-f51f-4fd7-8431-de62a8c24f3f': {
                                    label: 'Reject Rate',
                                    dataType: 'number',
                                    operationType: 'formula',
                                    isBucketed: false,
                                    scale: 'ratio',
                                    params: {
                                      formula:
                                        'sum(processor.accepted) - sum(processor.processed) / ((interval() / 1000) / 60)',
                                      isFormulaBroken: false,
                                    },
                                    references: ['1b14c449-f51f-4fd7-8431-de62a8c24f3fX3'],
                                    customLabel: true,
                                  },
                                },
                                columnOrder: [
                                  '89e414d1-0045-46df-9555-7d265a9f5960',
                                  '1b14c449-f51f-4fd7-8431-de62a8c24f3f',
                                  '1b14c449-f51f-4fd7-8431-de62a8c24f3fX0',
                                  '1b14c449-f51f-4fd7-8431-de62a8c24f3fX1',
                                  '1b14c449-f51f-4fd7-8431-de62a8c24f3fX2',
                                  '1b14c449-f51f-4fd7-8431-de62a8c24f3fX3',
                                ],
                                sampling: 1,
                                ignoreGlobalFilters: false,
                                incompleteColumns: {},
                              },
                            },
                          },
                          indexpattern: { layers: {} },
                          textBased: { layers: {} },
                        },
                        internalReferences: [],
                        adHocDataViews: {},
                      },
                    },
                  },
                },
                matchedBy: {
                  index: ['593f894a-3378-42cc-bafc-61b4877b64b0'],
                  fields: ['processor.processed', 'processor.accepted'],
                },
              },
            ],
          },
        ]),
      });
    });
  });
}
