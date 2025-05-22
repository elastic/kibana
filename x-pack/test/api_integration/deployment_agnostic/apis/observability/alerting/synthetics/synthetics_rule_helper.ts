/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SyntheticsMonitorStatusRuleParams as StatusRuleParams } from '@kbn/response-ops-rule-params/synthetics_monitor_status';
import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { makeDownSummary, makeUpSummary } from '@kbn/observability-synthetics-test-data';
import type { RetryService } from '@kbn/ftr-common-functional-services';
import type { EncryptedSyntheticsSavedMonitor } from '@kbn/synthetics-plugin/common/runtime_types';
import moment from 'moment';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import expect from '@kbn/expect';
import { SupertestWithRoleScope } from '../../../../services/role_scoped_supertest';
import { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { waitForAlertInIndex } from '../helpers/alerting_wait_for_helpers';
import { createIndexConnector, createRule } from '../helpers/alerting_api_helper';

export const SYNTHETICS_ALERT_ACTION_INDEX = 'alert-action-synthetics';
export class SyntheticsRuleHelper {
  supertestEditorWithApiKey: SupertestWithRoleScope;
  supertestAdminWithApiKey: SupertestWithRoleScope;
  logger: ToolingLog;
  esClient: Client;
  retryService: RetryService;
  alertActionIndex: string;
  actionId: string | null = null;
  isServerless: boolean;

  constructor(
    getService: DeploymentAgnosticFtrProviderContext['getService'],
    supertestEditorWithApiKey: SupertestWithRoleScope,
    supertestAdminWithApiKey: SupertestWithRoleScope
  ) {
    this.esClient = getService('es');
    this.supertestEditorWithApiKey = supertestEditorWithApiKey;
    this.supertestAdminWithApiKey = supertestAdminWithApiKey;
    this.logger = getService('log');
    this.retryService = getService('retry');
    this.alertActionIndex = SYNTHETICS_ALERT_ACTION_INDEX;
    const config = getService('config');
    this.isServerless = config.get('serverless');
  }

  async createIndexAction() {
    await this.esClient.indices.create({
      index: this.alertActionIndex,
      mappings: {
        properties: {
          'monitor.id': {
            type: 'keyword',
          },
        },
      },
    });
    const actionId = await createIndexConnector({
      supertest: this.supertestAdminWithApiKey,
      name: 'Index Connector: Synthetics API test',
      indexName: this.alertActionIndex,
      logger: this.logger,
    });
    this.actionId = actionId;
  }

  async createCustomStatusRule({
    params,
    name,
  }: {
    params: StatusRuleParams;
    name?: string;
    actions?: any[];
  }) {
    if (this.actionId === null) {
      throw new Error('Index action not created. Call createIndexAction() first');
    }
    return await createRule<StatusRuleParams>({
      params,
      name: name ?? 'Custom status rule',
      ruleTypeId: 'xpack.synthetics.alerts.monitorStatus',
      consumer: 'alerts',
      supertest: this.supertestAdminWithApiKey,
      esClient: this.esClient,
      logger: this.logger,
      schedule: { interval: '5s' },
      actions: [
        {
          group: 'recovered',
          id: this.actionId,
          params: {
            documents: [
              {
                status: 'recovered',
                reason: '{{context.reason}}',
                locationNames: '{{context.locationNames}}',
                locationId: '{{context.locationId}}',
                linkMessage: '{{context.linkMessage}}',
                recoveryReason: '{{context.recoveryReason}}',
                recoveryStatus: '{{context.recoveryStatus}}',
                'monitor.id': '{{context.monitorId}}',
              },
            ],
          },
          frequency: {
            notify_when: 'onActionGroupChange',
            throttle: null,
            summary: false,
          },
        },
        {
          group: 'xpack.synthetics.alerts.actionGroups.monitorStatus',
          id: this.actionId,
          params: {
            documents: [
              {
                status: 'active',
                reason: '{{context.reason}}',
                locationNames: '{{context.locationNames}}',
                locationId: '{{context.locationId}}',
                linkMessage: '{{context.linkMessage}}',
                'monitor.id': '{{context.monitorId}}',
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
  }

  async addMonitor(name: string) {
    const testData = {
      locations: [
        { id: 'dev', isServiceManaged: true, label: 'Dev Service' },
        { id: 'dev2', isServiceManaged: true, label: 'Dev Service 2' },
      ],
      name,
      type: 'http',
      url: 'http://www.google.com',
      schedule: 1,
    };
    const res = await this.supertestEditorWithApiKey
      .post(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '?internal=true')
      .send(testData);

    expect(res.status).to.eql(200, JSON.stringify(res.body));

    return res.body as EncryptedSyntheticsSavedMonitor;
  }

  async deleteMonitor(monitorId: string) {
    const res = await this.supertestEditorWithApiKey
      .delete(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '/' + monitorId)
      .send();

    expect(res.status).to.eql(200);
  }

  async updateTestMonitor(monitorId: string, updates: Record<string, any>) {
    const result = await this.supertestEditorWithApiKey
      .put(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + `/${monitorId}`)
      .send(updates);

    expect(result.status).to.eql(200, JSON.stringify(result.body));

    return result.body as EncryptedSyntheticsSavedMonitor;
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
      indexName: `.${
        this.isServerless ? 'ds-' : 'internal'
      }.alerts-observability.uptime.alerts-default*`,
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

    this.logger.debug(
      `created synthetics summary, status: ${status}, monitor: "${monitor.name}", location: "${location?.label}"`
    );
    await this.esClient.index({
      index,
      document,
      refresh: true,
    });

    return document;
  }
}
