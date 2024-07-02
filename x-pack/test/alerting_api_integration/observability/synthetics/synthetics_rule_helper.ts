/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StatusRuleParams } from '@kbn/synthetics-plugin/common/rules/status_rule';
import type { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import {
  makeDownSummary,
  makeUpSummary,
  PrivateLocationTestService,
} from '@kbn/observability-synthetics-test-data';
import { RetryService } from '@kbn/ftr-common-functional-services';
import { EncryptedSyntheticsSavedMonitor } from '@kbn/synthetics-plugin/common/runtime_types';
import moment from 'moment';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { Agent as SuperTestAgent } from 'supertest';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import expect from '@kbn/expect';
import { createRule } from '../helpers/alerting_api_helper';
import { waitForAlertInIndex } from '../helpers/alerting_wait_for_helpers';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export class SyntheticsRuleHelper {
  supertest: SuperTestAgent;
  logger: ToolingLog;
  esClient: Client;
  retryService: RetryService;
  locService: PrivateLocationTestService;

  constructor(getService: FtrProviderContext['getService']) {
    this.esClient = getService('es');
    this.supertest = getService('supertest');
    this.logger = getService('log');
    this.retryService = getService('retry');

    this.locService = new PrivateLocationTestService(getService);
  }

  async createCustomStatusRule({ params, name }: { params: StatusRuleParams; name?: string }) {
    return await createRule<StatusRuleParams>({
      params,
      name: name ?? 'Custom status rule',
      ruleTypeId: 'xpack.synthetics.alerts.monitorStatus',
      consumer: 'alerts',
      supertest: this.supertest,
      esClient: this.esClient,
      logger: this.logger,
      schedule: { interval: '15s' },
    });
  }

  async addMonitor(name: string) {
    const testData = {
      locations: [{ id: 'dev', isServiceManaged: true, label: 'Dev Service' }],
      name,
      type: 'http',
      url: 'http://www.google.com',
      schedule: 1,
    };
    const res = await this.supertest
      .post(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
      .set('kbn-xsrf', 'true')
      .send(testData);

    expect(res.status).to.eql(200, JSON.stringify(res.body));

    return res.body as EncryptedSyntheticsSavedMonitor;
  }

  async updateTestMonitor(monitorId: string, updates: Record<string, any>) {
    const result = await this.supertest
      .put(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + `/${monitorId}`)
      .set('kbn-xsrf', 'true')
      .send(updates);

    expect(result.status).to.eql(200, JSON.stringify(result.body));

    return result.body as EncryptedSyntheticsSavedMonitor;
  }

  async addPrivateLocation() {
    await this.locService.installSyntheticsPackage();
    return this.locService.addTestPrivateLocation();
  }

  async waitForStatusAlert({
    ruleId,
    filters,
  }: {
    ruleId: string;
    filters?: QueryDslQueryContainer[];
  }) {
    return await waitForAlertInIndex({
      ruleId,
      filters,
      esClient: this.esClient,
      retryService: this.retryService,
      logger: this.logger,
      indexName: '.internal.alerts-observability.uptime.alerts-default*',
      retryDelay: 1000,
    });
  }

  async makeSummaries({
    downChecks = 0,
    upChecks = 0,
    monitor,
    location,
  }: {
    downChecks?: number;
    upChecks?: number;
    monitor: EncryptedSyntheticsSavedMonitor;
    location?: {
      id: string;
      label: string;
    };
  }) {
    const docs = [];
    // lets make some down checks
    for (let i = downChecks; i > 0; i--) {
      const doc = await this.addSummaryDocument({
        monitor,
        location,
        status: 'down',
        timestamp: moment()
          .subtract(i - 1, 'minutes')
          .toISOString(),
      });
      docs.push(doc);
    }

    // lets make some up checks
    for (let i = upChecks; i > 0; i--) {
      const doc = await this.addSummaryDocument({
        monitor,
        location,
        status: 'up',
        timestamp: moment()
          .subtract(i - 1, 'minutes')
          .toISOString(),
      });
      docs.push(doc);
    }
    return docs;
  }

  async addSummaryDocument({
    monitor,
    location,
    status = 'up',
    timestamp = new Date(Date.now()).toISOString(),
  }: {
    monitor: EncryptedSyntheticsSavedMonitor;
    status?: 'up' | 'down';
    timestamp?: string;
    location?: {
      id: string;
      label: string;
    };
  }) {
    let document = {
      '@timestamp': timestamp,
    };

    const index = 'synthetics-http-default';

    const commonData = {
      timestamp,
      location,
      monitorId: monitor.id,
      name: monitor.name,
      configId: monitor.config_id,
    };

    if (status === 'down') {
      document = {
        ...makeDownSummary(commonData),
        ...document,
      };
    } else {
      document = {
        ...makeUpSummary(commonData),
        ...document,
      };
    }

    await this.esClient.index({
      index,
      document,
      refresh: true,
    });

    return document;
  }
}
