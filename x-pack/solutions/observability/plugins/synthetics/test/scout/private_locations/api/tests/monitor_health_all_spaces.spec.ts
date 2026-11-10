/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { expect } from '@kbn/scout-oblt/api';
import {
  apiTest,
  KIBANA_HEADERS,
  mergeSyntheticsApiHeaders,
  SYNTHETICS_API_URLS,
} from '../../../common/fixtures';
import type { ScoutPrivateLocation } from '../../../common/services/synthetics_private_location_api_service';
import { addMonitor, deleteMonitors } from '../../../common/fixtures/monitors';
import { httpMonitorFixture } from '../../../common/fixtures/data/http_monitor';
import {
  PrivateLocationHealthStatusValue,
  type MonitorHealthStatus,
  type MonitorsHealthResponse,
} from '../../../../../common/runtime_types/monitor_health';

const monitorHealthUrl = (monitorId: string) =>
  SYNTHETICS_API_URLS.SYNTHETICS_MONITOR_HEALTH.replace('{monitorId}', monitorId);

/**
 * Regression coverage for elastic/kibana#302865: once any monitor was shared to
 * all spaces (`*`), the monitor health API read package policies through a
 * client that resolved `*` with a credential-less `_has_privileges` call and
 * answered 401, which logged the user out. The setup mirrors the reported
 * deployment: an all-spaces agent policy and private location, one monitor in
 * the default space and one shared to all spaces. No agent is enrolled, so
 * every location reports `missing_agents`.
 */
apiTest.describe(
  'MonitorHealthAllSpaces',
  { tag: ['@local-stateful-classic', '@local-serverless-observability_complete'] },
  () => {
    let editorApiHeaders: Record<string, string>;
    let editorCookieHeaders: Record<string, string>;
    let privateLocation: ScoutPrivateLocation;
    let defaultSpaceMonitorId: string;
    let allSpacesMonitorId: string;

    const expectMissingAgents = (monitor: MonitorHealthStatus) => {
      expect(monitor.isHealthy).toBe(false);
      expect(monitor.privateLocations).toStrictEqual([
        expect.objectContaining({
          locationId: privateLocation.id,
          agentPolicyId: privateLocation.agentPolicyId,
          status: PrivateLocationHealthStatusValue.MissingAgents,
        }),
      ]);
    };

    const expectHealthForBothMonitors = ({ monitors, errors }: MonitorsHealthResponse) => {
      expect(errors).toStrictEqual([]);
      expect(monitors.map(({ configId }) => configId).sort()).toStrictEqual(
        [defaultSpaceMonitorId, allSpacesMonitorId].sort()
      );
      monitors.forEach(expectMissingAgents);
    };

    apiTest.beforeAll(async ({ requestAuth, samlAuth, apiServices, apiClient }) => {
      const { apiKeyHeader } = await requestAuth.getApiKey('editor');
      editorApiHeaders = mergeSyntheticsApiHeaders(apiKeyHeader, { Accept: 'application/json' });
      // `_health` is an internal route the UI calls with the user's session
      // cookie, which is what the 401 turned into a logout.
      const { cookieHeader } = await samlAuth.asInteractiveUser('editor');
      editorCookieHeaders = { ...KIBANA_HEADERS, ...cookieHeader };

      // Shares both the agent policy and the private location to all spaces.
      privateLocation = await apiServices.syntheticsPrivateLocations.addTestPrivateLocation([
        ALL_SPACES_ID,
      ]);

      const defaultSpaceRes = await addMonitor(apiClient, editorApiHeaders, {
        ...httpMonitorFixture,
        name: `Health default space ${uuidv4()}`,
        locations: [privateLocation],
        spaces: ['default'],
      });
      defaultSpaceMonitorId = (defaultSpaceRes.body as { id: string }).id;

      const allSpacesRes = await addMonitor(apiClient, editorApiHeaders, {
        ...httpMonitorFixture,
        name: `Health all spaces ${uuidv4()}`,
        locations: [privateLocation],
        spaces: [ALL_SPACES_ID],
      });
      allSpacesMonitorId = (allSpacesRes.body as { id: string }).id;
    });

    apiTest.afterAll(async ({ apiClient, apiServices }) => {
      const monitorIds = [defaultSpaceMonitorId, allSpacesMonitorId].filter(Boolean);
      if (monitorIds.length > 0) {
        await deleteMonitors(apiClient, editorApiHeaders, monitorIds, { ignoreErrors: true });
      }
      if (privateLocation) {
        await apiServices.syntheticsPrivateLocations.deletePrivateLocation(privateLocation.id);
        await apiServices.fleet.agent_policies.delete(privateLocation.agentPolicyId, true);
      }
    });

    apiTest('POST _health returns health for both monitors', async ({ apiClient }) => {
      const res = await apiClient.post(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_HEALTH, {
        headers: editorCookieHeaders,
        body: { monitorIds: [defaultSpaceMonitorId, allSpacesMonitorId] },
        responseType: 'json',
      });
      expect(res, JSON.stringify(res.body)).toHaveStatusCode(200);

      expectHealthForBothMonitors(res.body as MonitorsHealthResponse);
    });

    apiTest('GET {monitorId}/_health returns health for each monitor', async ({ apiClient }) => {
      for (const monitorId of [defaultSpaceMonitorId, allSpacesMonitorId]) {
        const res = await apiClient.get(monitorHealthUrl(monitorId), {
          headers: editorCookieHeaders,
          responseType: 'json',
        });
        expect(res, JSON.stringify(res.body)).toHaveStatusCode(200);
        const monitor = res.body as MonitorHealthStatus;
        expect(monitor.configId).toBe(monitorId);
        expectMissingAgents(monitor);
      }
    });

    apiTest('POST _health by locationIds returns the location monitors', async ({ apiClient }) => {
      const res = await apiClient.post(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_HEALTH, {
        headers: editorCookieHeaders,
        body: { locationIds: [privateLocation.id] },
        responseType: 'json',
      });
      expect(res, JSON.stringify(res.body)).toHaveStatusCode(200);

      expectHealthForBothMonitors(res.body as MonitorsHealthResponse);
    });
  }
);
