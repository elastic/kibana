/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as base } from '@kbn/scout-oblt';
import type { KbnClient, EsClient } from '@kbn/scout-oblt';
import { makeDownSummary, makeUpSummary } from '@kbn/observability-synthetics-test-data';
import { journeyStart, journeySummary, step1, step2 } from './data/browser_docs';

const SYNTHETICS_API_URLS = {
  SYNTHETICS_ENABLEMENT: '/internal/synthetics/service/enablement',
  SYNTHETICS_MONITORS: '/api/synthetics/monitors',
  GET_SYNTHETICS_MONITOR: '/api/synthetics/monitors/{monitorId}',
  PRIVATE_LOCATIONS: '/api/synthetics/private_locations',
  SYNTHETICS_MONITORS_PROJECT_UPDATE: '/api/synthetics/project/{projectName}/monitors/_bulk_update',
} as const;

const PUBLIC_API_HEADERS = { 'elastic-api-version': '2023-10-31' };

interface PrivateLocation {
  id: string;
  label: string;
}

export interface SyntheticsServicesFixture {
  addMonitor: (
    name: string,
    data?: Record<string, any>,
    configId?: string,
    options?: { tls: { enabled: boolean } }
  ) => Promise<string>;
  addMonitorProject: (
    name: string,
    projectName?: string,
    config?: Record<string, unknown>
  ) => Promise<void>;
  addMonitorSimple: (name: string, params?: Record<string, any>) => Promise<void>;
  addSummaryDocument: (params?: {
    monitorId?: string;
    docType?: 'summaryUp' | 'summaryDown' | 'journeyStart' | 'journeyEnd' | 'stepEnd';
    timestamp?: string;
    name?: string;
    testRunId?: string;
    stepIndex?: number;
    locationName?: string;
    configId?: string;
    tlsNotBefore?: string;
    tlsNotAfter?: string;
  }) => Promise<void>;
  cleanUp: () => Promise<void>;
  cleanUpAlerts: () => Promise<void>;
  deleteCustomRules: () => Promise<void>;
  deleteConnectors: () => Promise<void>;
  deleteMonitorByQuery: (query: string) => Promise<void>;
  deleteMonitors: () => Promise<void>;
  deleteParams: () => Promise<void>;
  deletePrivateLocations: () => Promise<void>;
  deleteSyntheticsIntegrations: () => Promise<void>;
  deleteSyntheticsPackagePolicyByName: (name: string) => Promise<void>;
  deleteSettingsAndConnectors: () => Promise<void>;
  createFleetAgentPolicy: (name: string) => Promise<void>;
  enable: () => Promise<void>;
  ensurePrivateLocationExists: () => Promise<PrivateLocation>;
  getDefaultLocation: () => Promise<PrivateLocation>;
  getMonitor: (monitorId: string) => Promise<any>;
  getPrivateLocations: () => Promise<PrivateLocation[]>;
  setupConnector: () => Promise<any>;
  setupSettings: (connectorId?: string) => Promise<void>;
}

/**
 * If caller passed location objects (private locations), pass them through.
 * Otherwise, use the auto-created private location as default.
 */
const resolveLocationPayload = (
  callerLocations: any[] | undefined,
  defaultLocation: PrivateLocation
): Record<string, any> => {
  if (callerLocations?.some((loc: any) => typeof loc === 'object')) {
    return { locations: callerLocations };
  }
  return { private_locations: [defaultLocation.id] };
};

const defaultBrowserMonitorData = {
  type: 'browser',
  alert: { status: { enabled: true } },
  form_monitor_type: 'single',
  enabled: true,
  schedule: { unit: 'm', number: '10' },
  'service.name': '',
  config_id: '',
  tags: [],
  timeout: '30',
  name: 'Monitor 2',
  namespace: 'default',
  origin: 'ui',
  journey_id: '',
  project_id: '',
  playwright_options: '',
  __ui: { script_source: { is_generated_script: false, file_name: '' } },
  params: '',
  'url.port': null,
  'source.inline.script':
    "step('Go to https://www.google.com', async () => {\n          await page.goto('https://www.google.com');\n          expect(await page.isVisible('text=Data')).toBeTruthy();\n        });",
  'source.project.content': '',
  playwright_text_assertion: 'Data',
  urls: 'https://www.google.com',
  screenshots: 'on',
  synthetics_args: [],
  'filter_journeys.match': '',
  'filter_journeys.tags': [],
  ignore_https_errors: false,
  throttling: {
    id: 'custom',
    label: 'Custom',
    value: { download: '5', upload: '3', latency: '20' },
  },
  'ssl.certificate_authorities': '',
  'ssl.certificate': '',
  'ssl.key': '',
  'ssl.key_passphrase': '',
  'ssl.verification_mode': 'full',
  'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
};

const projectMonitorBrowser = (
  name: string,
  privateLocationLabel: string,
  config?: Record<string, unknown>
) => ({
  monitors: [
    {
      type: 'browser',
      throttling: { download: 5, upload: 3, latency: 20 },
      schedule: 10,
      locations: [],
      privateLocations: [privateLocationLabel],
      params: {},
      playwrightOptions: { headless: true, chromiumSandbox: false },
      custom_heartbeat_id: 'check-if-title-is-present',
      id: 'check-if-title-is-present',
      tags: [],
      content:
        'UEsDBBQACAAIAON5qVQAAAAAAAAAAAAAAAAfAAAAZXhhbXBsZXMvdG9kb3MvYmFzaWMuam91cm5leS50c22Q0WrDMAxF3/sVF7MHB0LMXlc6RvcN+wDPVWNviW0sdUsp/fe5SSiD7UFCWFfHujIGlpnkybwxFTZfoY/E3hsaLEtwhs9RPNWKDU12zAOxkXRIbN4tB9d9pFOJdO6EN2HMqQguWN9asFBuQVMmJ7jiWNII9fIXrbabdUYr58l9IhwhQQZCYORCTFFUC31Btj21NRc7Mq4Nds+4bDD/pNVgT9F52Jyr2Fa+g75LAPttg8yErk+S9ELpTmVotlVwnfNCuh2lepl3+JflUmSBJ3uggt1v9INW/lHNLKze9dJe1J3QJK8pSvWkm6aTtCet5puq+x63+AFQSwcIAPQ3VfcAAACcAQAAUEsBAi0DFAAIAAgA43mpVAD0N1X3AAAAnAEAAB8AAAAAAAAAAAAgAKSBAAAAAGV4YW1wbGVzL3RvZG9zL2Jhc2ljLmpvdXJuZXkudHNQSwUGAAAAAAEAAQBNAAAARAEAAAAA',
      filter: { match: 'check if title is present' },
      hash: 'ekrjelkjrelkjre',
      name,
      ...config,
    },
  ],
});

function createSyntheticsServices(
  kbnClient: KbnClient,
  esClient: EsClient
): SyntheticsServicesFixture {
  let cachedLocation: PrivateLocation | null = null;

  const getDefaultLocation = async (): Promise<PrivateLocation> => {
    if (!cachedLocation) {
      cachedLocation = await ensurePrivateLocationExists();
    }
    return cachedLocation;
  };

  const addMonitor = async (
    name: string,
    data: Record<string, any> = { type: 'browser' },
    configId?: string,
    options: { tls: { enabled: boolean } } = { tls: { enabled: false } }
  ): Promise<string> => {
    const { locations: callerLocations, ...restData } = data;
    const locationPayload = resolveLocationPayload(callerLocations, await getDefaultLocation());
    const testData = {
      alert: { status: { enabled: true }, tls: options.tls },
      ...locationPayload,
      ...(restData?.type !== 'browser' ? {} : defaultBrowserMonitorData),
      ...restData,
      name,
    };
    const response = await kbnClient.request({
      path: configId
        ? `${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}?id=${configId}`
        : SYNTHETICS_API_URLS.SYNTHETICS_MONITORS,
      method: 'POST',
      body: testData,
      headers: PUBLIC_API_HEADERS,
    });
    return (response.data as any).id;
  };

  const addMonitorProject = async (
    name: string,
    projectName = 'test-project',
    config?: Record<string, unknown>
  ) => {
    const location = await getDefaultLocation();
    const response = await kbnClient.request({
      path: SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
        '{projectName}',
        projectName
      ),
      method: 'PUT',
      body: projectMonitorBrowser(name, location.label, config),
      headers: PUBLIC_API_HEADERS,
    });
    const { failedMonitors } = response.data as {
      createdMonitors: string[];
      updatedMonitors: string[];
      failedMonitors: Array<{ id: string; reason: string }>;
    };
    if (failedMonitors.length > 0) {
      throw new Error(
        `addMonitorProject failed for: ${failedMonitors
          .map((m) => `${m.id} — ${m.reason}`)
          .join(', ')}`
      );
    }
  };

  const addMonitorSimple = async (
    name: string,
    params: Record<string, any> = { type: 'browser' }
  ) => {
    const { locations: callerLocations, ...restParams } = params;
    const locationPayload = resolveLocationPayload(callerLocations, await getDefaultLocation());
    const testData = {
      ...locationPayload,
      ...(restParams?.type !== 'browser' ? {} : defaultBrowserMonitorData),
      ...restParams,
      name,
    };
    await kbnClient.request({
      path: SYNTHETICS_API_URLS.SYNTHETICS_MONITORS,
      method: 'POST',
      body: testData,
      headers: PUBLIC_API_HEADERS,
    });
  };

  const addSummaryDocument = async ({
    docType = 'summaryUp',
    timestamp = new Date(Date.now()).toISOString(),
    monitorId,
    name,
    testRunId,
    stepIndex = 1,
    locationName,
    configId,
    tlsNotBefore,
    tlsNotAfter,
  }: {
    monitorId?: string;
    docType?: 'summaryUp' | 'summaryDown' | 'journeyStart' | 'journeyEnd' | 'stepEnd';
    timestamp?: string;
    name?: string;
    testRunId?: string;
    stepIndex?: number;
    locationName?: string;
    configId?: string;
    tlsNotBefore?: string;
    tlsNotAfter?: string;
  } = {}) => {
    let document: Record<string, any> = { '@timestamp': timestamp };
    let index = 'synthetics-http-default';
    const defaultLocation = cachedLocation ?? {
      id: 'test-private-location',
      label: 'Test private location',
    };
    const commonData = {
      timestamp,
      name,
      testRunId,
      location: { id: defaultLocation.id, label: locationName ?? defaultLocation.label },
      configId,
      monitorId: monitorId ?? configId,
      tlsNotAfter,
      tlsNotBefore,
    };

    switch (docType) {
      case 'stepEnd':
        index = 'synthetics-browser-default';
        document = { ...(stepIndex === 1 ? step1(commonData) : step2(commonData)), ...document };
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
        document = { ...makeDownSummary(commonData), ...document };
        break;
      case 'summaryUp':
      default:
        document = { ...makeUpSummary(commonData), ...document };
    }

    await esClient.index({ index, document, refresh: 'wait_for' });
  };

  const cleanUp = async () => {
    await kbnClient.savedObjects.clean({
      types: ['synthetics-monitor', 'synthetics-monitor-multi-space', 'alert'],
    });
    await cleanUpAlerts();
  };

  const cleanUpAlerts = async () => {
    await esClient.deleteByQuery({
      index: '.alerts-observability.*',
      query: {
        bool: {
          should: [
            { term: { 'kibana.alert.rule.consumer': 'uptime' } },
            { term: { 'kibana.alert.rule.consumer': 'synthetics' } },
          ],
        },
      },
      conflicts: 'proceed',
      refresh: true,
      ignore_unavailable: true,
    });
  };

  const deleteCustomRules = async () => {
    const { data } = await kbnClient.request<{ data: Array<{ id: string; consumer: string }> }>({
      path: '/api/alerting/rules/_find?per_page=100',
      method: 'GET',
    });
    const rules = (data as any).data ?? [];
    for (const rule of rules) {
      if (rule.consumer === 'uptime' || rule.consumer === 'synthetics') {
        await kbnClient.request({
          path: `/api/alerting/rule/${rule.id}`,
          method: 'DELETE',
        });
      }
    }
  };

  const deleteConnectors = async () => {
    const { data } = await kbnClient.request({
      path: '/api/actions/connectors',
      method: 'GET',
    });
    for (const connector of data as any[]) {
      await kbnClient.request({
        path: `/api/actions/connector/${connector.id}`,
        method: 'DELETE',
      });
    }
  };

  const deleteMonitorByQuery = async (query: string) => {
    const { data } = await kbnClient.request({
      path: SYNTHETICS_API_URLS.SYNTHETICS_MONITORS,
      query: { perPage: 10, page: 1, sortOrder: 'asc', sortField: 'name.keyword', query },
      method: 'GET',
      headers: PUBLIC_API_HEADERS,
    });
    const { monitors = [] } = data as any;
    for (const monitor of monitors) {
      await kbnClient.request({
        path: `${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}/${monitor.config_id}`,
        method: 'DELETE',
        headers: PUBLIC_API_HEADERS,
      });
    }
  };

  const deleteMonitors = async () => {
    await kbnClient.savedObjects.clean({
      types: ['synthetics-monitor', 'synthetics-monitor-multi-space'],
    });
  };

  const deleteParams = async () => {
    await kbnClient.savedObjects.clean({ types: ['synthetics-param'] });
  };

  const deletePrivateLocations = async () => {
    await kbnClient.savedObjects.clean({
      types: ['synthetics-private-location', 'ingest-agent-policies', 'ingest-package-policies'],
    });
    cachedLocation = null;
  };

  /**
   * Deletes Synthetics package policies (integration policies) by exact name.
   * Name format: {monitorName}-{locationLabel}-{namespace}, e.g. "https://amazon.com-Test private location-default"
   */
  const deleteSyntheticsPackagePolicyByName = async (name: string) => {
    const { data } = await kbnClient.request({
      path: '/api/fleet/package_policies',
      method: 'GET',
      query: {
        perPage: 1000,
        kuery: 'ingest-package-policies.package.name:synthetics',
      },
    });
    const items =
      (data as { items?: Array<{ id: string; name: string; policy_id: string }> })?.items ?? [];
    const toDelete = items.filter((p) => p.name === name);
    for (const pkg of toDelete) {
      await kbnClient.request({
        path: `/api/fleet/package_policies/${pkg.id}`,
        method: 'DELETE',
        query: { force: true },
      });
    }
  };

  const deleteSyntheticsIntegrations = async () => {
    const { data } = await kbnClient.request({
      path: '/api/fleet/agent_policies',
      method: 'GET',
      query: {
        page: 1,
        perPage: 100,
        sortField: 'updated_at',
        sortOrder: 'desc',
        noAgentCount: true,
        full: true,
      },
    });
    const policies =
      (
        data as {
          items?: Array<{
            id: string;
            package_policies?: Array<{ id: string; package?: { name: string } }>;
          }>;
        }
      )?.items ?? [];
    for (const policy of policies) {
      const syntheticsPolicies =
        policy.package_policies?.filter((pp) => pp.package?.name === 'synthetics') ?? [];
      if (syntheticsPolicies.length === 0) continue;

      // Force-delete managed package policies before deleting the agent policy
      try {
        await kbnClient.request({
          path: '/api/fleet/package_policies/delete',
          method: 'POST',
          body: {
            packagePolicyIds: syntheticsPolicies.map((pp) => pp.id),
            force: true,
          },
        });
      } catch {
        // best-effort; continue to agent policy deletion
      }

      try {
        await kbnClient.request({
          path: '/api/fleet/agent_policies/delete',
          method: 'POST',
          body: { agentPolicyId: policy.id },
        });
      } catch {
        // policy may already be deleted or protected; continue
      }
    }
  };

  const deleteSettingsAndConnectors = async () => {
    await kbnClient.savedObjects.clean({ types: ['uptime-dynamic-settings'] });
    await deleteConnectors();
  };

  const enable = async () => {
    await kbnClient.request({
      path: SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT,
      method: 'PUT',
    });
  };

  const createFleetAgentPolicy = async (name: string): Promise<void> => {
    const { data } = await kbnClient.request({
      path: '/api/fleet/agent_policies',
      method: 'GET',
      query: { kuery: `ingest-agent-policies.name:"${name}"`, perPage: 1 },
      headers: PUBLIC_API_HEADERS,
    });
    const exists = ((data as any)?.items ?? []).length > 0;
    if (exists) {
      return;
    }
    await kbnClient.request({
      path: '/api/fleet/agent_policies',
      method: 'POST',
      body: { name, namespace: 'default', monitoring_enabled: ['logs', 'metrics'] },
      headers: PUBLIC_API_HEADERS,
    });
  };

  const ensurePrivateLocationExists = async (): Promise<PrivateLocation> => {
    const existing = await getPrivateLocations();
    if (existing.length > 0) {
      return { id: existing[0].id, label: existing[0].label };
    }

    const policyResponse = await kbnClient.request({
      path: '/api/fleet/agent_policies',
      method: 'POST',
      body: {
        name: `Scout test policy ${Date.now()}`,
        namespace: 'default',
        monitoring_enabled: ['logs', 'metrics'],
      },
      headers: PUBLIC_API_HEADERS,
    });
    const agentPolicyId = (policyResponse.data as any).item.id;

    const locationResponse = await kbnClient.request({
      path: SYNTHETICS_API_URLS.PRIVATE_LOCATIONS,
      method: 'POST',
      body: {
        label: 'Test private location',
        agentPolicyId,
        geo: { lat: 0, lon: 0 },
      },
      headers: PUBLIC_API_HEADERS,
    });
    const location = locationResponse.data as any;
    return { id: location.id, label: location.label };
  };

  const getMonitor = async (monitorId: string) => {
    const { data } = await kbnClient.request({
      path:
        SYNTHETICS_API_URLS.GET_SYNTHETICS_MONITOR.replace('{monitorId}', monitorId) +
        '?internal=true',
      method: 'GET',
      headers: PUBLIC_API_HEADERS,
    });
    return data;
  };

  const getPrivateLocations = async (): Promise<PrivateLocation[]> => {
    const response = await kbnClient.request({
      path: SYNTHETICS_API_URLS.PRIVATE_LOCATIONS,
      method: 'GET',
      headers: PUBLIC_API_HEADERS,
    });
    return response.data as PrivateLocation[];
  };

  const setupConnector = async () => {
    const connector = await kbnClient.request({
      path: '/api/actions/connector',
      method: 'POST',
      body: {
        name: 'test index',
        config: { index: 'test-index' },
        secrets: {},
        connector_type_id: '.index',
      },
    });
    return connector.data as any;
  };

  const setupSettings = async (connectorId?: string) => {
    await kbnClient.request({
      path: '/api/synthetics/settings',
      method: 'PUT',
      body: {
        certExpirationThreshold: 30,
        certAgeThreshold: 730,
        defaultConnectors: [connectorId],
        defaultEmail: { to: [], cc: [], bcc: [] },
        defaultStatusRuleEnabled: true,
      },
    });
  };

  return {
    addMonitor,
    addMonitorProject,
    addMonitorSimple,
    addSummaryDocument,
    cleanUp,
    cleanUpAlerts,
    deleteCustomRules,
    deleteConnectors,
    deleteMonitorByQuery,
    deleteMonitors,
    deleteParams,
    deletePrivateLocations,
    deleteSyntheticsIntegrations,
    deleteSyntheticsPackagePolicyByName,
    createFleetAgentPolicy,
    deleteSettingsAndConnectors,
    enable,
    ensurePrivateLocationExists,
    getDefaultLocation,
    getMonitor,
    getPrivateLocations,
    setupConnector,
    setupSettings,
  };
}

export const syntheticsServicesFixture = base.extend<
  {},
  { syntheticsServices: SyntheticsServicesFixture }
>({
  syntheticsServices: [
    async ({ kbnClient, esClient }, use) => {
      await use(createSyntheticsServices(kbnClient, esClient));
    },
    { scope: 'worker' },
  ],
});
