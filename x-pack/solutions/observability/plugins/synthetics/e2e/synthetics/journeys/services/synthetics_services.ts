/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import type { Client } from '@elastic/elasticsearch';
import { KbnClient } from '@kbn/test';
import pMap from 'p-map';
import { makeDownSummary, makeUpSummary } from '@kbn/observability-synthetics-test-data';
import {
  SyntheticsMonitor,
  SyntheticsPrivateLocations,
} from '@kbn/synthetics-plugin/common/runtime_types';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { journeyStart, journeySummary, step1, step2 } from './data/browser_docs';

export class SyntheticsServices {
  kibanaUrl: string;
  params: Record<string, any>;
  requester: KbnClient['requester'];
  constructor(params: Record<string, any>) {
    this.kibanaUrl = params.kibanaUrl;
    this.requester = params.getService('kibanaServer').requester;
    this.params = params;
  }

  async getMonitor(monitorId: string): Promise<SyntheticsMonitor | null> {
    try {
      const { data } = await this.requester.request({
        description: 'get monitor by id',
        path:
          SYNTHETICS_API_URLS.GET_SYNTHETICS_MONITOR.replace('{monitorId}', monitorId) +
          '?internal=true',
        method: 'GET',
      });
      return data as SyntheticsMonitor;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(e);
      return null;
    }
  }

  async enableMonitorManagedViaApi() {
    try {
      await axios.put(this.kibanaUrl + SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT, undefined, {
        auth: { username: 'elastic', password: 'changeme' },
        headers: { 'kbn-xsrf': 'true', 'x-elastic-internal-origin': 'synthetics-e2e' },
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(e);
    }
  }

  async addTestMonitor(
    name: string,
    data: Record<string, any> = { type: 'browser' },
    configId?: string
  ) {
    const testData = {
      alert: { status: { enabled: true } },
      locations: [{ id: 'us_central', isServiceManaged: true }],
      ...(data?.type !== 'browser' ? {} : data),
      ...(data || {}),
      name,
    };
    const response = await axios.post(
      this.kibanaUrl +
        (configId
          ? `${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}?id=${configId}`
          : SYNTHETICS_API_URLS.SYNTHETICS_MONITORS),
      testData,
      {
        auth: { username: 'elastic', password: 'changeme' },
        headers: { 'kbn-xsrf': 'true', 'x-elastic-internal-origin': 'synthetics-e2e' },
      }
    );
    return response.data.id;
  }

  async deleteTestMonitorByQuery(query: string) {
    const { data } = await this.requester.request({
      description: 'get monitors by name',
      path: SYNTHETICS_API_URLS.SYNTHETICS_MONITORS,
      query: {
        perPage: 10,
        page: 1,
        sortOrder: 'asc',
        sortField: 'name.keyword',
        query,
      },
      method: 'GET',
    });

    const { monitors = [] } = data as any;

    await pMap(
      monitors,
      async (monitor: Record<string, any>) => {
        await this.requester.request({
          description: 'delete monitor',
          path: `${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}/${monitor.config_id}`,
          method: 'DELETE',
        });
      },
      { concurrency: 10 }
    );
  }

  async addTestSummaryDocument({
    docType = 'summaryUp',
    timestamp = new Date(Date.now()).toISOString(),
    monitorId,
    name,
    testRunId,
    stepIndex = 1,
    locationName,
    configId,
  }: {
    monitorId?: string;
    docType?: 'summaryUp' | 'summaryDown' | 'journeyStart' | 'journeyEnd' | 'stepEnd';
    timestamp?: string;
    name?: string;
    testRunId?: string;
    stepIndex?: number;
    locationName?: string;
    configId?: string;
  } = {}) {
    const getService = this.params.getService;
    const es: Client = getService('es');

    let document = {
      '@timestamp': timestamp,
    };

    let index = 'synthetics-http-default';

    const commonData = {
      timestamp,
      name,
      testRunId,
      location: {
        id: 'us_central',
        label: locationName ?? 'North America - US Central',
      },
      configId,
      monitorId: monitorId ?? configId,
    };

    switch (docType) {
      case 'stepEnd':
        index = 'synthetics-browser-default';
        const stepDoc = stepIndex === 1 ? step1(commonData) : step2(commonData);
        document = { ...stepDoc, ...document };
        break;
      case 'journeyEnd':
        index = 'synthetics-browser-default';
        document = { ...journeySummary(commonData), ...document };
        break;
      case 'journeyStart':
        index = 'synthetics-browser-default';
        document = { ...journeyStart(commonData), ...document };
        break;
      case 'summaryDown':
        document = {
          ...makeDownSummary(commonData),
          ...document,
        };
        break;
      case 'summaryUp':
        document = {
          ...makeUpSummary(commonData),
          ...document,
        };
        break;
      default:
        document = {
          ...makeUpSummary(commonData),
          ...document,
        };
    }

    await es.index({
      index,
      document,
    });
  }

  async cleaUp() {
    try {
      const getService = this.params.getService;
      const server = getService('kibanaServer');

      await server.savedObjects.clean({ types: ['synthetics-monitor', 'alert'] });
      await this.cleaUpAlerts();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(e);
    }
  }

  async cleaUpAlerts() {
    try {
      const getService = this.params.getService;
      const es: Client = getService('es');
      const listOfIndices = await es.cat.indices({ format: 'json' });
      for (const index of listOfIndices) {
        if (index.index?.startsWith('.internal.alerts-observability.uptime.alerts')) {
          await es.deleteByQuery({ index: index.index, query: { match_all: {} } });
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(e);
    }
  }

  async setupTestConnector() {
    const indexConnector = {
      name: 'test index',
      config: { index: 'test-index' },
      secrets: {},
      connector_type_id: '.index',
    };
    const connector = await this.requester.request({
      path: `/api/actions/connector`,
      method: 'POST',
      body: indexConnector,
    });
    return connector.data as any;
  }

  async setupSettings(connectorId?: string) {
    const settings = {
      certExpirationThreshold: 30,
      certAgeThreshold: 730,
      defaultConnectors: [connectorId],
      defaultEmail: { to: [], cc: [], bcc: [] },
      defaultStatusRuleEnabled: true,
    };
    const connector = await this.requester.request({
      path: `/api/synthetics/settings`,
      method: 'PUT',
      body: settings,
    });
    return connector.data;
  }

  async getPrivateLocations(): Promise<SyntheticsPrivateLocations> {
    const response = await this.requester.request({
      path: SYNTHETICS_API_URLS.PRIVATE_LOCATIONS,
      method: 'GET',
    });
    return response.data as SyntheticsPrivateLocations;
  }
}
