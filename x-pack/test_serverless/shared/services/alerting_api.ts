/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type {
  AggregationsAggregate,
  SearchResponse,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Client } from '@elastic/elasticsearch';
import { MetricThresholdParams } from '@kbn/infra-plugin/common/alerting/metrics';
import { ThresholdParams } from '@kbn/observability-plugin/common/custom_threshold_rule/types';
import { v4 as uuidv4 } from 'uuid';
import { RoleCredentials } from '.';
import type { SloBurnRateRuleParams } from '../../api_integration/services/slo_api';
import { FtrProviderContext } from '../../functional/ftr_provider_context';

interface CreateEsQueryRuleParams {
  size: number;
  thresholdComparator: string;
  threshold: number[];
  timeWindowSize?: number;
  timeWindowUnit?: string;
  esQuery?: string;
  timeField?: string;
  searchConfiguration?: unknown;
  indexName?: string;
  excludeHitsFromPreviousRun?: boolean;
  aggType?: string;
  aggField?: string;
  groupBy?: string;
  termField?: string;
  termSize?: number;
  index?: string[];
}
export function AlertingApiProvider({ getService }: FtrProviderContext) {
  const retry = getService('retry');
  const es = getService('es');
  const requestTimeout = 30 * 1000;
  const retryTimeout = 120 * 1000;
  const logger = getService('log');
  const svlCommonApi = getService('svlCommonApi');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  const generateUniqueKey = () => uuidv4().replace(/-/g, '');

  const helpers = {
    async waitForAlertInIndex<T>({
      esClient,
      filter,
      indexName,
      ruleId,
      num = 1,
    }: {
      esClient: Client;
      filter: Date;
      indexName: string;
      ruleId: string;
      num: number;
    }): Promise<SearchResponse<T, Record<string, AggregationsAggregate>>> {
      return await retry.tryWithRetries(
        'Alerting API - waitForAlertInIndex',
        async () => {
          const response = await esClient.search<T>({
            index: indexName,
            body: {
              query: {
                bool: {
                  must: [
                    {
                      term: {
                        'kibana.alert.rule.uuid': ruleId,
                      },
                    },
                    {
                      range: {
                        '@timestamp': {
                          gte: filter.getTime().toString(),
                        },
                      },
                    },
                  ],
                },
              },
            },
          });
          if (response.hits.hits.length < num)
            throw new Error(`Only found ${response.hits.hits.length} / ${num} documents`);

          return response;
        },
        {
          retryCount: 10,
        }
      );
    },

    async waitForDocumentInIndex({
      esClient,
      indexName,
      ruleId,
      num = 1,
      sort = 'desc',
    }: {
      esClient: Client;
      indexName: string;
      ruleId: string;
      num?: number;
      sort?: 'asc' | 'desc';
    }): Promise<SearchResponse> {
      return await retry.tryWithRetries(
        'Alerting API - waitForDocumentInIndex',
        async () => {
          const response = await esClient.search({
            index: indexName,
            sort: `date:${sort}`,
            body: {
              query: {
                bool: {
                  must: [
                    {
                      term: {
                        'ruleId.keyword': ruleId,
                      },
                    },
                  ],
                },
              },
            },
          });
          if (response.hits.hits.length < num) {
            throw new Error(`Only found ${response.hits.hits.length} / ${num} documents`);
          }
          return response;
        },
        { retryCount: 10 }
      );
    },

    async createIndexConnector({
      roleAuthc,
      name,
      indexName,
    }: {
      roleAuthc: RoleCredentials;
      name: string;
      indexName: string;
    }) {
      const { body } = await supertestWithoutAuth
        .post(`/api/actions/connector`)
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .send({
          name,
          config: {
            index: indexName,
            refresh: true,
          },
          connector_type_id: '.index',
        })
        .expect(200);
      return body;
    },

    async createSlackConnector({ roleAuthc, name }: { roleAuthc: RoleCredentials; name: string }) {
      const { body } = await supertestWithoutAuth
        .post(`/api/actions/connector`)
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .send({
          name,
          config: {},
          secrets: {
            webhookUrl: 'http://test',
          },
          connector_type_id: '.slack',
        })
        .expect(200);
      return body;
    },

    async createEsQueryRule({
      roleAuthc,
      name,
      ruleTypeId,
      params,
      actions = [],
      tags = [],
      schedule,
      consumer,
      notifyWhen,
      enabled = true,
    }: {
      roleAuthc: RoleCredentials;
      ruleTypeId: string;
      name: string;
      params: CreateEsQueryRuleParams;
      consumer: string;
      actions?: any[];
      tags?: any[];
      schedule?: { interval: string };
      notifyWhen?: string;
      enabled?: boolean;
    }) {
      const { body } = await supertestWithoutAuth
        .post(`/api/alerting/rule`)
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .send({
          enabled,
          params,
          consumer,
          schedule: schedule || {
            interval: '1h',
          },
          tags,
          name,
          rule_type_id: ruleTypeId,
          actions,
          ...(notifyWhen ? { notify_when: notifyWhen, throttle: '5m' } : {}),
        })
        .expect(200);
      return body;
    },

    async createAnomalyRule({
      roleAuthc,
      name = generateUniqueKey(),
      actions = [],
      tags = ['foo', 'bar'],
      schedule,
      consumer = 'alerts',
      notifyWhen,
      enabled = true,
      ruleTypeId = 'apm.anomaly',
      params,
    }: {
      roleAuthc: RoleCredentials;
      name?: string;
      consumer?: string;
      actions?: any[];
      tags?: any[];
      schedule?: { interval: string };
      notifyWhen?: string;
      enabled?: boolean;
      ruleTypeId?: string;
      params?: any;
    }) {
      const { body } = await supertestWithoutAuth
        .post(`/api/alerting/rule`)
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .send({
          enabled,
          params: params || {
            anomalySeverityType: 'critical',
            anomalyDetectorTypes: ['txLatency'],
            environment: 'ENVIRONMENT_ALL',
            windowSize: 30,
            windowUnit: 'm',
          },
          consumer,
          schedule: schedule || {
            interval: '1m',
          },
          tags,
          name,
          rule_type_id: ruleTypeId,
          actions,
          ...(notifyWhen ? { notify_when: notifyWhen, throttle: '5m' } : {}),
        })
        .expect(200);
      return body;
    },

    async createLatencyThresholdRule({
      roleAuthc,
      name = generateUniqueKey(),
      actions = [],
      tags = ['foo', 'bar'],
      schedule,
      consumer = 'apm',
      notifyWhen,
      enabled = true,
      ruleTypeId = 'apm.transaction_duration',
      params,
    }: {
      roleAuthc: RoleCredentials;
      name?: string;
      consumer?: string;
      actions?: any[];
      tags?: any[];
      schedule?: { interval: string };
      notifyWhen?: string;
      enabled?: boolean;
      ruleTypeId?: string;
      params?: any;
    }) {
      const { body } = await supertestWithoutAuth
        .post(`/api/alerting/rule`)
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .send({
          enabled,
          params: params || {
            aggregationType: 'avg',
            environment: 'ENVIRONMENT_ALL',
            threshold: 1500,
            windowSize: 5,
            windowUnit: 'm',
          },
          consumer,
          schedule: schedule || {
            interval: '1m',
          },
          tags,
          name,
          rule_type_id: ruleTypeId,
          actions,
          ...(notifyWhen ? { notify_when: notifyWhen, throttle: '5m' } : {}),
        });
      return body;
    },

    async createInventoryRule({
      roleAuthc,
      name = generateUniqueKey(),
      actions = [],
      tags = ['foo', 'bar'],
      schedule,
      consumer = 'alerts',
      notifyWhen,
      enabled = true,
      ruleTypeId = 'metrics.alert.inventory.threshold',
      params,
    }: {
      roleAuthc: RoleCredentials;
      name?: string;
      consumer?: string;
      actions?: any[];
      tags?: any[];
      schedule?: { interval: string };
      notifyWhen?: string;
      enabled?: boolean;
      ruleTypeId?: string;
      params?: any;
    }) {
      const { body } = await supertestWithoutAuth
        .post(`/api/alerting/rule`)
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .send({
          enabled,
          params: params || {
            nodeType: 'host',
            criteria: [
              {
                metric: 'cpu',
                comparator: '>',
                threshold: [5],
                timeSize: 1,
                timeUnit: 'm',
                customMetric: {
                  type: 'custom',
                  id: 'alert-custom-metric',
                  field: '',
                  aggregation: 'avg',
                },
              },
            ],
            sourceId: 'default',
          },
          consumer,
          schedule: schedule || {
            interval: '1m',
          },
          tags,
          name,
          rule_type_id: ruleTypeId,
          actions,
          ...(notifyWhen ? { notify_when: notifyWhen, throttle: '5m' } : {}),
        })
        .expect(200);
      return body;
    },

    async disableRule({ roleAuthc, ruleId }: { roleAuthc: RoleCredentials; ruleId: string }) {
      const { body } = await supertestWithoutAuth
        .post(`/api/alerting/rule/${ruleId}/_disable`)
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .expect(204);
      return body;
    },

    async updateEsQueryRule({
      roleAuthc,
      ruleId,
      updates,
    }: {
      roleAuthc: RoleCredentials;
      ruleId: string;
      updates: any;
    }) {
      const { body: r } = await supertestWithoutAuth
        .get(`/api/alerting/rule/${ruleId}`)
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .expect(200);
      const body = await supertestWithoutAuth
        .put(`/api/alerting/rule/${ruleId}`)
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .send({
          ...{
            name: r.name,
            schedule: r.schedule,
            throttle: r.throttle,
            tags: r.tags,
            params: r.params,
            notify_when: r.notifyWhen,
            actions: r.actions.map((action: any) => ({
              group: action.group,
              params: action.params,
              id: action.id,
              frequency: action.frequency,
            })),
          },
          ...updates,
        })
        .expect(200);
      return body;
    },

    async runRule({ roleAuthc, ruleId }: { roleAuthc: RoleCredentials; ruleId: string }) {
      const response = await supertestWithoutAuth
        .post(`/internal/alerting/rule/${ruleId}/_run_soon`)
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .expect(204);
      return response;
    },

    async waitForNumRuleRuns({
      roleAuthc,
      numOfRuns,
      ruleId,
      esClient,
      testStart,
    }: {
      roleAuthc: RoleCredentials;
      numOfRuns: number;
      ruleId: string;
      esClient: Client;
      testStart: Date;
    }) {
      for (let i = 0; i < numOfRuns; i++) {
        await retry.tryWithRetries(
          'Alerting API - waitForNumRuleRuns',
          async () => {
            await this.runRule({ roleAuthc, ruleId });
            await this.waiting.waitForExecutionEventLog({
              esClient,
              filter: testStart,
              ruleId,
              num: i + 1,
            });
            await this.waiting.waitForAllTasksIdle({ esClient, filter: testStart });
          },
          { retryCount: 10 }
        );
      }
    },

    async muteRule({ roleAuthc, ruleId }: { roleAuthc: RoleCredentials; ruleId: string }) {
      const { body } = await supertestWithoutAuth
        .post(`/api/alerting/rule/${ruleId}/_mute_all`)
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .expect(204);
      return body;
    },

    async enableRule({ roleAuthc, ruleId }: { roleAuthc: RoleCredentials; ruleId: string }) {
      const { body } = await supertestWithoutAuth
        .post(`/api/alerting/rule/${ruleId}/_enable`)
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .expect(204);
      return body;
    },

    async muteAlert({
      roleAuthc,
      ruleId,
      alertId,
    }: {
      roleAuthc: RoleCredentials;
      ruleId: string;
      alertId: string;
    }) {
      const { body } = await supertestWithoutAuth
        .post(`/api/alerting/rule/${ruleId}/alert/${alertId}/_mute`)
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .expect(204);
      return body;
    },

    async unmuteRule({ roleAuthc, ruleId }: { roleAuthc: RoleCredentials; ruleId: string }) {
      const { body } = await supertestWithoutAuth
        .post(`/api/alerting/rule/${ruleId}/_unmute_all`)
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .expect(204);
      return body;
    },

    async snoozeRule({ roleAuthc, ruleId }: { roleAuthc: RoleCredentials; ruleId: string }) {
      const { body } = await supertestWithoutAuth
        .post(`/internal/alerting/rule/${ruleId}/_snooze`)
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .send({
          snooze_schedule: {
            duration: 100000000,
            rRule: {
              count: 1,
              dtstart: moment().format(),
              tzid: 'UTC',
            },
          },
        })
        .expect(204);
      return body;
    },

    async findRule({ roleAuthc, ruleId }: { roleAuthc: RoleCredentials; ruleId: string }) {
      if (!ruleId) {
        throw new Error(`'ruleId' is undefined`);
      }
      const response = await supertestWithoutAuth
        .get(`/api/alerting/rule/${ruleId}`)
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader);
      return response.body || {};
    },

    waiting: {
      async waitForDocumentInIndex({
        esClient,
        indexName,
        ruleId,
        num = 1,
        sort = 'desc',
      }: {
        esClient: Client;
        indexName: string;
        ruleId: string;
        num?: number;
        sort?: 'asc' | 'desc';
      }): Promise<SearchResponse> {
        return await retry.tryWithRetries(
          'Alerting API - waiting.waitForDocumentInIndex',
          async () => {
            const response = await esClient.search({
              index: indexName,
              sort: `date:${sort}`,
              body: {
                query: {
                  bool: {
                    must: [
                      {
                        term: {
                          'ruleId.keyword': ruleId,
                        },
                      },
                    ],
                  },
                },
              },
            });
            if (response.hits.hits.length < num) {
              throw new Error(`Only found ${response.hits.hits.length} / ${num} documents`);
            }
            return response;
          },
          { retries: 10 }
        );
      },

      async getDocumentsInIndex({
        esClient,
        indexName,
        ruleId,
      }: {
        esClient: Client;
        indexName: string;
        ruleId: string;
      }): Promise<SearchResponse> {
        return await esClient.search({
          index: indexName,
          body: {
            query: {
              bool: {
                must: [
                  {
                    term: {
                      'ruleId.keyword': ruleId,
                    },
                  },
                ],
              },
            },
          },
        });
      },

      async waitForAllTasksIdle({
        esClient,
        filter,
      }: {
        esClient: Client;
        filter: Date;
      }): Promise<SearchResponse> {
        return await retry.tryWithRetries(
          'Alerting API - waiting.waitForAllTasksIdle',
          async () => {
            const response = await esClient.search({
              index: '.kibana_task_manager',
              body: {
                query: {
                  bool: {
                    must: [
                      {
                        terms: {
                          'task.scope': ['actions', 'alerting'],
                        },
                      },
                      {
                        range: {
                          'task.scheduledAt': {
                            gte: filter.getTime().toString(),
                          },
                        },
                      },
                    ],
                    must_not: [
                      {
                        term: {
                          'task.status': 'idle',
                        },
                      },
                    ],
                  },
                },
              },
            });
            if (response.hits.hits.length !== 0) {
              throw new Error(`Expected 0 hits but received ${response.hits.hits.length}`);
            }
            return response;
          },
          { retryCount: 10 }
        );
      },

      async waitForExecutionEventLog({
        esClient,
        filter,
        ruleId,
        num = 1,
      }: {
        esClient: Client;
        filter: Date;
        ruleId: string;
        num?: number;
      }): Promise<SearchResponse> {
        return await retry.tryWithRetries(
          'Alerting API - waiting.waitForExecutionEventLog',
          async () => {
            const response = await esClient.search({
              index: '.kibana-event-log*',
              body: {
                query: {
                  bool: {
                    filter: [
                      {
                        term: {
                          'rule.id': {
                            value: ruleId,
                          },
                        },
                      },
                      {
                        term: {
                          'event.provider': {
                            value: 'alerting',
                          },
                        },
                      },
                      {
                        term: {
                          'event.action': 'execute',
                        },
                      },
                      {
                        range: {
                          '@timestamp': {
                            gte: filter.getTime().toString(),
                          },
                        },
                      },
                    ],
                  },
                },
              },
            });
            if (response.hits.hits.length < num) {
              throw new Error('No hits found');
            }
            return response;
          },
          { retryCount: 10 }
        );
      },

      async createIndex({ esClient, indexName }: { esClient: Client; indexName: string }) {
        return await esClient.indices.create(
          {
            index: indexName,
            body: {},
          },
          { meta: true }
        );
      },

      async waitForAllTasks({
        esClient,
        filter,
        taskType,
        attempts,
      }: {
        esClient: Client;
        filter: Date;
        taskType: string;
        attempts: number;
      }): Promise<SearchResponse> {
        return await retry.tryWithRetries(
          'Alerting API - waiting.waitForAllTasks',
          async () => {
            const response = await esClient.search({
              index: '.kibana_task_manager',
              body: {
                query: {
                  bool: {
                    must: [
                      {
                        term: {
                          'task.status': 'idle',
                        },
                      },
                      {
                        term: {
                          'task.attempts': attempts,
                        },
                      },
                      {
                        terms: {
                          'task.scope': ['actions', 'alerting'],
                        },
                      },
                      {
                        term: {
                          'task.taskType': taskType,
                        },
                      },
                      {
                        range: {
                          'task.scheduledAt': {
                            gte: filter.getTime().toString(),
                          },
                        },
                      },
                    ],
                  },
                },
              },
            });
            if (response.hits.hits.length === 0) {
              throw new Error('No hits found');
            }
            return response;
          },
          { retryCount: 10 }
        );
      },

      async waitForDisabled({
        esClient,
        ruleId,
        filter,
      }: {
        esClient: Client;
        ruleId: string;
        filter: Date;
      }): Promise<SearchResponse> {
        return await retry.tryWithRetries(
          'Alerting API - waiting.waitForDisabled',
          async () => {
            const response = await esClient.search({
              index: '.kibana_task_manager',
              body: {
                query: {
                  bool: {
                    must: [
                      {
                        term: {
                          'task.id': `task:${ruleId}`,
                        },
                      },
                      {
                        terms: {
                          'task.scope': ['actions', 'alerting'],
                        },
                      },
                      {
                        range: {
                          'task.scheduledAt': {
                            gte: filter.getTime().toString(),
                          },
                        },
                      },
                      {
                        term: {
                          'task.enabled': true,
                        },
                      },
                    ],
                  },
                },
              },
            });
            if (response.hits.hits.length !== 0) {
              throw new Error(`Expected 0 hits but received ${response.hits.hits.length}`);
            }
            return response;
          },
          { retryCount: 10 }
        );
      },
    },
  };

  return {
    helpers,

    async waitForRuleStatus({
      roleAuthc,
      ruleId,
      expectedStatus,
    }: {
      roleAuthc: RoleCredentials;
      ruleId: string;
      expectedStatus: string;
    }) {
      if (!ruleId) {
        throw new Error(`'ruleId' is undefined`);
      }
      return await retry.tryForTime(retryTimeout, async () => {
        const response = await supertestWithoutAuth
          .get(`/api/alerting/rule/${ruleId}`)
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .timeout(requestTimeout);
        const { execution_status: executionStatus } = response.body || {};
        const { status } = executionStatus || {};
        if (status !== expectedStatus) {
          throw new Error(`waitForStatus(${expectedStatus}): got ${status}`);
        }
        return executionStatus?.status;
      });
    },

    async waitForDocumentInIndex<T>({
      indexName,
      docCountTarget = 1,
    }: {
      indexName: string;
      docCountTarget?: number;
    }): Promise<SearchResponse<T, Record<string, AggregationsAggregate>>> {
      return await retry.tryForTime(retryTimeout, async () => {
        const response = await es.search<T>({
          index: indexName,
          rest_total_hits_as_int: true,
        });
        logger.debug(`Found ${response.hits.total} docs, looking for at least ${docCountTarget}.`);
        if (!response.hits.total || (response.hits.total as number) < docCountTarget) {
          throw new Error('No hits found');
        }
        return response;
      });
    },

    async waitForAlertInIndex<T>({
      indexName,
      ruleId,
    }: {
      indexName: string;
      ruleId: string;
    }): Promise<SearchResponse<T, Record<string, AggregationsAggregate>>> {
      if (!ruleId) {
        throw new Error(`'ruleId' is undefined`);
      }
      return await retry.tryForTime(retryTimeout, async () => {
        const response = await es.search<T>({
          index: indexName,
          body: {
            query: {
              term: {
                'kibana.alert.rule.uuid': ruleId,
              },
            },
          },
        });
        if (response.hits.hits.length === 0) {
          throw new Error('No hits found');
        }
        return response;
      });
    },

    async createIndexConnector({
      roleAuthc,
      name,
      indexName,
    }: {
      roleAuthc: RoleCredentials;
      name: string;
      indexName: string;
    }) {
      const { body } = await supertestWithoutAuth
        .post(`/api/actions/connector`)
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .send({
          name,
          config: {
            index: indexName,
            refresh: true,
          },
          connector_type_id: '.index',
        });
      return body.id as string;
    },

    async createRule({
      roleAuthc,
      name,
      ruleTypeId,
      params,
      actions = [],
      tags = [],
      schedule,
      consumer,
    }: {
      roleAuthc: RoleCredentials;
      ruleTypeId: string;
      name: string;
      params: MetricThresholdParams | ThresholdParams | SloBurnRateRuleParams;
      actions?: any[];
      tags?: any[];
      schedule?: { interval: string };
      consumer: string;
    }) {
      const { body } = await supertestWithoutAuth
        .post(`/api/alerting/rule`)
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .send({
          params,
          consumer,
          schedule: schedule || {
            interval: '5m',
          },
          tags,
          name,
          rule_type_id: ruleTypeId,
          actions,
        });
      return body;
    },

    async findRule(roleAuthc: RoleCredentials, ruleId: string) {
      if (!ruleId) {
        throw new Error(`'ruleId' is undefined`);
      }
      const response = await supertestWithoutAuth
        .get('/api/alerting/rules/_find')
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader);
      return response.body.data.find((obj: any) => obj.id === ruleId);
    },
  };
}
