/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsAggregate,
  SearchResponse,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { MetricThresholdParams } from '@kbn/infra-plugin/common/alerting/metrics';
import { ThresholdParams } from '@kbn/observability-plugin/common/custom_threshold_rule/types';
import { ApmRuleParamsType } from '@kbn/apm-plugin/common/rules/schema';
import { RoleCredentials } from '@kbn/ftr-common-functional-services';
import { errors, type Client } from '@elastic/elasticsearch';
import type { TryWithRetriesOptions } from '@kbn/ftr-common-functional-services';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import { DeploymentAgnosticFtrProviderContext } from '../ftr_provider_context';

export interface SloBurnRateRuleParams {
  sloId: string;
  windows: WindowSchema[];
  dependencies?: Dependency[];
}

interface WindowSchema {
  id: string;
  burnRateThreshold: number;
  maxBurnRateThreshold: number;
  longWindow: Duration;
  shortWindow: Duration;
  actionGroup: string;
}

interface Dependency {
  ruleId: string;
  actionGroupsToSuppressOn: string[];
}

type DurationUnit = 'm' | 'h' | 'd' | 'w' | 'M';

interface Duration {
  value: number;
  unit: DurationUnit;
}

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

const RETRY_COUNT = 10;
const RETRY_DELAY = 1000;
const generateUniqueKey = () => uuidv4().replace(/-/g, '');

export function AlertingApiProvider({ getService }: DeploymentAgnosticFtrProviderContext) {
  const samlAuth = getService('samlAuth');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const retry = getService('retry');
  const logger = getService('log');
  const config = getService('config');
  const retryTimeout = config.get('timeouts.try');
  const requestTimeout = 30 * 1000;

  const helpers = {
    async waitForAlertInIndex<T>({
      esClient,
      filter,
      indexName,
      ruleId,
      num = 1,
      retryOptions = { retryCount: RETRY_COUNT, retryDelay: RETRY_DELAY },
    }: {
      esClient: Client;
      filter: Date;
      indexName: string;
      ruleId: string;
      num: number;
      retryOptions?: TryWithRetriesOptions;
    }): Promise<SearchResponse<T, Record<string, AggregationsAggregate>>> {
      return await retry.tryWithRetries(
        `Alerting API - waitForAlertInIndex, retryOptions: ${JSON.stringify(retryOptions)}`,
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
        retryOptions
      );
    },

    async waitForDocumentInIndexForTime({
      esClient,
      indexName,
      ruleId,
      num = 1,
      sort = 'desc',
      timeout = 1000,
    }: {
      esClient: Client;
      indexName: string;
      ruleId: string;
      num?: number;
      sort?: 'asc' | 'desc';
      timeout?: number;
    }): Promise<SearchResponse> {
      return await retry.tryForTime(timeout, async () => {
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
      });
    },

    async waitForDocumentInIndex({
      esClient,
      indexName,
      ruleId,
      num = 1,
      sort = 'desc',
      retryOptions = { retryCount: RETRY_COUNT, retryDelay: RETRY_DELAY },
    }: {
      esClient: Client;
      indexName: string;
      ruleId: string;
      num?: number;
      sort?: 'asc' | 'desc';
      retryOptions?: TryWithRetriesOptions;
    }): Promise<SearchResponse> {
      return await retry.tryWithRetries(
        `Alerting API - waitForDocumentInIndex, retryOptions: ${JSON.stringify(retryOptions)}`,
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
        retryOptions
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
        .set(samlAuth.getInternalRequestHeader())
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
        .set(samlAuth.getInternalRequestHeader())
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
        .set(samlAuth.getInternalRequestHeader())
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
        .set(samlAuth.getInternalRequestHeader())
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
        .set(samlAuth.getInternalRequestHeader())
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
        .set(samlAuth.getInternalRequestHeader())
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
        .set(samlAuth.getInternalRequestHeader())
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
        .set(samlAuth.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .expect(200);
      const body = await supertestWithoutAuth
        .put(`/api/alerting/rule/${ruleId}`)
        .set(samlAuth.getInternalRequestHeader())
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
        .set(samlAuth.getInternalRequestHeader())
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
      retryOptions = { retryCount: RETRY_COUNT, retryDelay: RETRY_DELAY },
    }: {
      roleAuthc: RoleCredentials;
      numOfRuns: number;
      ruleId: string;
      esClient: Client;
      testStart: Date;
      retryOptions?: TryWithRetriesOptions;
    }) {
      for (let i = 0; i < numOfRuns; i++) {
        await retry.tryWithRetries(
          `Alerting API - waitForNumRuleRuns, retryOptions: ${JSON.stringify(retryOptions)}`,
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
          retryOptions
        );
      }
    },

    async muteRule({ roleAuthc, ruleId }: { roleAuthc: RoleCredentials; ruleId: string }) {
      const { body } = await supertestWithoutAuth
        .post(`/api/alerting/rule/${ruleId}/_mute_all`)
        .set(samlAuth.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .expect(204);
      return body;
    },

    async enableRule({ roleAuthc, ruleId }: { roleAuthc: RoleCredentials; ruleId: string }) {
      const { body } = await supertestWithoutAuth
        .post(`/api/alerting/rule/${ruleId}/_enable`)
        .set(samlAuth.getInternalRequestHeader())
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
        .set(samlAuth.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .expect(204);
      return body;
    },

    async unmuteRule({ roleAuthc, ruleId }: { roleAuthc: RoleCredentials; ruleId: string }) {
      const { body } = await supertestWithoutAuth
        .post(`/api/alerting/rule/${ruleId}/_unmute_all`)
        .set(samlAuth.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .expect(204);
      return body;
    },

    async snoozeRule({ roleAuthc, ruleId }: { roleAuthc: RoleCredentials; ruleId: string }) {
      const { body } = await supertestWithoutAuth
        .post(`/internal/alerting/rule/${ruleId}/_snooze`)
        .set(samlAuth.getInternalRequestHeader())
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

    waiting: {
      async waitForDocumentInIndex({
        esClient,
        indexName,
        ruleId,
        num = 1,
        sort = 'desc',
        retryOptions = { retryCount: RETRY_COUNT, retryDelay: RETRY_DELAY },
      }: {
        esClient: Client;
        indexName: string;
        ruleId: string;
        num?: number;
        sort?: 'asc' | 'desc';
        retryOptions?: TryWithRetriesOptions;
      }): Promise<SearchResponse> {
        return await retry.tryWithRetries(
          `Alerting API - waiting.waitForDocumentInIndex, retryOptions: ${JSON.stringify(
            retryOptions
          )}`,
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
          retryOptions
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
        retryOptions = { retryCount: RETRY_COUNT, retryDelay: RETRY_DELAY },
      }: {
        esClient: Client;
        filter: Date;
        retryOptions?: TryWithRetriesOptions;
      }): Promise<SearchResponse> {
        return await retry.tryWithRetries(
          `Alerting API - waiting.waitForAllTasksIdle, retryOptions: ${JSON.stringify(
            retryOptions
          )}`,
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
          retryOptions
        );
      },

      async waitForExecutionEventLog({
        esClient,
        filter,
        ruleId,
        num = 1,
        retryOptions = { retryCount: RETRY_COUNT, retryDelay: RETRY_DELAY },
      }: {
        esClient: Client;
        filter: Date;
        ruleId: string;
        num?: number;
        retryOptions?: TryWithRetriesOptions;
      }): Promise<SearchResponse> {
        return await retry.tryWithRetries(
          `Alerting API - waiting.waitForExecutionEventLog, retryOptions: ${JSON.stringify(
            retryOptions
          )}`,
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
          retryOptions
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
        retryOptions = { retryCount: RETRY_COUNT, retryDelay: RETRY_DELAY },
      }: {
        esClient: Client;
        filter: Date;
        taskType: string;
        attempts: number;
        retryOptions?: TryWithRetriesOptions;
      }): Promise<SearchResponse> {
        return await retry.tryWithRetries(
          `Alerting API - waiting.waitForAllTasks, retryOptions: ${JSON.stringify(retryOptions)}`,
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
          retryOptions
        );
      },

      async waitForDisabled({
        esClient,
        ruleId,
        filter,
        retryOptions = { retryCount: RETRY_COUNT, retryDelay: RETRY_DELAY },
      }: {
        esClient: Client;
        ruleId: string;
        filter: Date;
        retryOptions?: TryWithRetriesOptions;
      }): Promise<SearchResponse> {
        return await retry.tryWithRetries(
          `Alerting API - waiting.waitForDisabled, retryOptions: ${JSON.stringify(retryOptions)}`,
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
          retryOptions
        );
      },
    },
  };

  return {
    helpers,
    async waitForRuleStatus({
      ruleId,
      expectedStatus,
      roleAuthc,
    }: {
      ruleId: string;
      expectedStatus: string;
      roleAuthc: RoleCredentials;
    }) {
      return await retry.tryForTime(retryTimeout, async () => {
        const response = await supertestWithoutAuth
          .get(`/api/alerting/rule/${ruleId}`)
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
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
      ruleId,
    }: {
      indexName: string;
      docCountTarget?: number;
      ruleId?: string;
    }): Promise<SearchResponse<T, Record<string, AggregationsAggregate>>> {
      return await retry.tryForTime(retryTimeout, async () => {
        const response = await es.search<T>({
          index: indexName,
          rest_total_hits_as_int: true,
          ...(ruleId
            ? {
                body: {
                  query: {
                    term: {
                      'kibana.alert.rule.uuid': ruleId,
                    },
                  },
                },
              }
            : {}),
        });
        logger.debug(`Found ${response.hits.total} docs, looking for at least ${docCountTarget}.`);

        if (
          !response.hits.total ||
          (typeof response.hits.total === 'number'
            ? response.hits.total < docCountTarget
            : response.hits.total.value < docCountTarget)
        ) {
          throw new Error('No hits or not enough hits found');
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
      name,
      indexName,
      roleAuthc,
    }: {
      name: string;
      indexName: string;
      roleAuthc: RoleCredentials;
    }) {
      const { body } = await supertestWithoutAuth
        .post(`/api/actions/connector`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
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
      name,
      ruleTypeId,
      params,
      actions = [],
      tags = [],
      schedule,
      consumer,
      roleAuthc,
    }: {
      ruleTypeId: string;
      name: string;
      params:
        | CreateEsQueryRuleParams
        | MetricThresholdParams
        | ThresholdParams
        | SloBurnRateRuleParams
        | ApmRuleParamsType['apm.anomaly']
        | ApmRuleParamsType['apm.error_rate']
        | ApmRuleParamsType['apm.transaction_duration']
        | ApmRuleParamsType['apm.transaction_error_rate'];
      actions?: any[];
      tags?: any[];
      schedule?: { interval: string };
      consumer: string;
      roleAuthc: RoleCredentials;
    }) {
      const { body } = await supertestWithoutAuth
        .post(`/api/alerting/rule`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
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

    async runRule(roleAuthc: RoleCredentials, ruleId: string) {
      return await retry.tryForTime(retryTimeout, async () => {
        try {
          const response = await supertestWithoutAuth
            .post(`/internal/alerting/rule/${ruleId}/_run_soon`)
            .set(samlAuth.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader)
            .expect(204);

          if (response.status !== 204) {
            throw new Error(`runRuleSoon got ${response.status} status`);
          }
          return response;
        } catch (error) {
          throw new Error(`[Rule] Running a rule ${ruleId} failed: ${error}`);
        }
      });
    },

    async findInRules(roleAuthc: RoleCredentials, ruleId: string) {
      const response = await supertestWithoutAuth
        .get('/api/alerting/rules/_find')
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());
      return response.body.data.find((obj: any) => obj.id === ruleId);
    },

    async searchRules(roleAuthc: RoleCredentials, filter: string) {
      return supertestWithoutAuth
        .get('/api/alerting/rules/_find')
        .query({ filter })
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());
    },

    async deleteRuleById({ roleAuthc, ruleId }: { roleAuthc: RoleCredentials; ruleId: string }) {
      return supertestWithoutAuth
        .delete(`/api/alerting/rule/${ruleId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());
    },

    async deleteRules({ roleAuthc, filter = '' }: { roleAuthc: RoleCredentials; filter?: string }) {
      const response = await this.searchRules(roleAuthc, filter);
      return Promise.all(
        response.body.data.map((rule: any) => this.deleteRuleById({ roleAuthc, ruleId: rule.id }))
      );
    },

    async deleteAllActionConnectors({ roleAuthc }: { roleAuthc: RoleCredentials }): Promise<any> {
      const res = await supertestWithoutAuth
        .get(`/api/actions/connectors`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      const body = res.body as Array<{ id: string; connector_type_id: string; name: string }>;
      return Promise.all(
        body.map(({ id }) => {
          return this.deleteActionConnector({
            roleAuthc,
            actionId: id,
          });
        })
      );
    },

    async deleteActionConnector({
      roleAuthc,
      actionId,
    }: {
      roleAuthc: RoleCredentials;
      actionId: string;
    }) {
      return supertestWithoutAuth
        .delete(`/api/actions/connector/${actionId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());
    },

    async cleanUpAlerts({
      roleAuthc,
      ruleId,
      consumer,
      alertIndexName,
      connectorIndexName,
    }: {
      roleAuthc: RoleCredentials;
      ruleId?: string;
      consumer?: string;
      alertIndexName?: string;
      connectorIndexName?: string;
    }) {
      return Promise.allSettled([
        // Delete the rule by ID
        ruleId ? this.deleteRuleById({ roleAuthc, ruleId }) : this.deleteRules({ roleAuthc }),
        // Delete all documents in the alert index if specified
        alertIndexName
          ? es.deleteByQuery({
              index: alertIndexName,
              conflicts: 'proceed',
              query: { match_all: {} },
            })
          : Promise.resolve(),
        // Delete event logs for the specified consumer if provided
        consumer
          ? es.deleteByQuery({
              index: '.kibana-event-log-*',
              query: { term: { 'kibana.alert.rule.consumer': consumer } },
            })
          : Promise.resolve(),
        // Delete connector index if provided
        connectorIndexName
          ? es.indices.delete({ index: connectorIndexName }).catch((e) => {
              if (e instanceof errors.ResponseError && e.statusCode === 404) {
                return;
              }

              throw e;
            })
          : Promise.resolve(),
        // Delete all action connectors
        this.deleteAllActionConnectors({ roleAuthc }),
      ]);
    },
  };
}
