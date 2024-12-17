/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KbnClient } from '@kbn/test';
import { cli, DEFAULTS } from '@kbn/data-forge';

export class SLoDataService {
  kibanaUrl: string;
  elasticsearchUrl: string;
  params: Record<string, any>;
  requester: KbnClient['requester'];

  constructor(params: Record<string, any>) {
    this.kibanaUrl = params.kibanaUrl;
    this.elasticsearchUrl = params.elasticsearchUrl;
    this.requester = params.getService('kibanaServer').requester;
    this.params = params;
  }

  async generateSloData({
    lookback = 'now-1d',
    eventsPerCycle = 50,
  }: {
    lookback?: string;
    eventsPerCycle?: number;
  } = {}) {
    await cli({
      kibanaUrl: this.kibanaUrl,
      elasticsearchHost: this.elasticsearchUrl,
      lookback: DEFAULTS.LOOKBACK,
      eventsPerCycle: DEFAULTS.EVENTS_PER_CYCLE,
      payloadSize: DEFAULTS.PAYLOAD_SIZE,
      concurrency: DEFAULTS.CONCURRENCY,
      indexInterval: 10_000,
      dataset: 'fake_stack',
      scenario: DEFAULTS.SCENARIO,
      elasticsearchUsername: DEFAULTS.ELASTICSEARCH_USERNAME,
      elasticsearchPassword: DEFAULTS.ELASTICSEARCH_PASSWORD,
      kibanaUsername: DEFAULTS.KIBANA_USERNAME,
      kibanaPassword: DEFAULTS.KIBANA_PASSWORD,
      installKibanaAssets: true,
      eventTemplate: DEFAULTS.EVENT_TEMPLATE,
      reduceWeekendTrafficBy: DEFAULTS.REDUCE_WEEKEND_TRAFFIC_BY,
      ephemeralProjectIds: DEFAULTS.EPHEMERAL_PROJECT_IDS,
      alignEventsToInterval: DEFAULTS.ALIGN_EVENTS_TO_INTERVAL,
      scheduleEnd: 'now+10m',
    }).then((res) => {
      // eslint-disable-next-line no-console
      console.log(res);
    });
  }

  async addSLO() {
    const example = {
      name: 'Test Stack SLO',
      description: '',
      indicator: {
        type: 'sli.kql.custom',
        params: {
          index: 'kbn-data-forge-fake_stack.admin-console-*',
          filter: '',
          good: 'log.level : "INFO" ',
          total: '',
          timestampField: '@timestamp',
        },
      },
      budgetingMethod: 'occurrences',
      timeWindow: {
        duration: '30d',
        type: 'rolling',
      },
      objective: {
        target: 0.99,
      },
      tags: [],
      groupBy: ['user.id'],
    };
    try {
      const { data } = await this.requester.request({
        description: 'get monitor by id',
        path: '/api/observability/slos',
        body: example,
        method: 'POST',
      });
      return data;
    } catch (e) {
      console.error(e);
    }
  }
}
