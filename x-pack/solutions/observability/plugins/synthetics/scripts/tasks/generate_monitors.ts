/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { Client } from '@elastic/elasticsearch';
import moment from 'moment';
import {
  readKibanaConfig,
  makeUpSummary,
  makeDownSummary,
} from '@kbn/observability-synthetics-test-data';

const KIBANA_URL = 'http://127.0.0.1:5601/test';

function getAuth() {
  try {
    const config = readKibanaConfig();
    let username = config.elasticsearch?.username;
    if (username === 'kibana_system_user') {
      username = 'elastic';
    }
    const password = config.elasticsearch?.password;
    if (username && password) {
      return { username, password };
    }
  } catch {
    // fall through to defaults
  }
  return { username: 'elastic', password: 'changeme' };
}

const auth = getAuth();
const headers = { 'kbn-xsrf': 'true', 'elastic-api-version': '2023-10-31' };

const request = async (method: string, path: string, data?: any) => {
  try {
    const response = await axios.request({
      data,
      method,
      url: `${KIBANA_URL}${path}`,
      auth,
      headers,
    });
    return response.data;
  } catch (error: any) {
    const msg =
      error?.response?.data?.message ?? JSON.stringify(error?.response?.data) ?? error?.message;
    throw new Error(msg);
  }
};

const buildEsClient = () => {
  try {
    const config = readKibanaConfig();
    const node = config.elasticsearch?.hosts;
    if (node) {
      const rawUser = config.elasticsearch?.username;
      const username = rawUser === 'kibana_system_user' || !rawUser ? 'elastic' : rawUser;
      const password = config.elasticsearch?.password;
      const verificationMode = config.elasticsearch?.ssl?.verificationMode;
      return new Client({
        node: Array.isArray(node) ? node[0] : node,
        auth: username && password ? { username, password } : undefined,
        tls: verificationMode === 'none' ? { rejectUnauthorized: false } : undefined,
      });
    }
  } catch {
    // fall through
  }
  return new Client({
    node: 'http://localhost:9200',
    auth: { username: 'elastic', password: 'changeme' },
  });
};

const esClient = buildEsClient();

interface MonitorInfo {
  configId: string;
  name: string;
  type: string;
  locations: Array<{ id: string; label: string }>;
}

const fetchAllMonitors = async (): Promise<MonitorInfo[]> => {
  const result = await request('get', '/api/synthetics/monitors?perPage=200');
  return (result.monitors ?? []).map((m: any) => ({
    configId: m.config_id,
    name: m.name,
    type: m.type,
    locations: (m.locations ?? []).map((l: any) => ({ id: l.id, label: l.label })),
  }));
};

const indexSummaryDoc = async (index: string, document: Record<string, any>) => {
  await esClient.index({ index, document, refresh: false });
};

const ingestSummaryData = async (monitors: MonitorInfo[]) => {
  const now = moment();
  let upCount = 0;
  let downCount = 0;

  for (const monitor of monitors) {
    if (monitor.locations.length === 0) continue;

    const isDown = monitor.name.toLowerCase().includes('down');
    const isDisabled = monitor.name.toLowerCase().includes('disabled');
    if (isDisabled) continue;

    const index = `synthetics-${monitor.type === 'browser' ? 'browser' : monitor.type}-default`;

    for (const location of monitor.locations) {
      const numDocs = isDown ? 5 : randomInt(8, 15);

      for (let i = 0; i < numDocs; i++) {
        const minutesAgo = i * 3 + randomInt(0, 2);
        const ts = now.clone().subtract(minutesAgo, 'minutes');
        const durationUs = isDown ? randomInt(50000, 200000) : randomInt(80000, 500000);

        const overrides = {
          name: monitor.name,
          timestamp: ts.toISOString(),
          monitorId: monitor.configId,
          configId: monitor.configId,
          location: { id: location.id, label: location.label },
        };

        const doc = isDown ? makeDownSummary(overrides) : makeUpSummary(overrides);

        (doc as any).monitor = {
          ...(doc as any).monitor,
          type: monitor.type,
          id: monitor.configId,
          name: monitor.name,
          duration: { us: durationUs },
          timespan: {
            lt: ts.clone().add(5, 'minutes').toISOString(),
            gte: ts.clone().subtract(5, 'minutes').toISOString(),
          },
        };
        (doc as any).state = {
          ...(doc as any).state,
          started_at: ts.clone().subtract(1, 'seconds').toISOString(),
          duration_ms: Math.round(durationUs / 1000),
        };
        (doc as any).data_stream = {
          namespace: 'default',
          type: 'synthetics',
          dataset: monitor.type === 'browser' ? 'browser' : monitor.type,
        };
        (doc as any).meta = { space_id: 'default' };

        await indexSummaryDoc(index, doc);
        if (isDown) {
          downCount++;
        } else {
          upCount++;
        }
      }
    }
  }

  await esClient.indices.refresh({ index: 'synthetics-*' });
  return { upCount, downCount };
};

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const createMonitor = async (monitor: Record<string, any>) => {
  try {
    const result = await request('post', '/api/synthetics/monitors', monitor);
    // eslint-disable-next-line no-console
    console.log(`  ✓ Created "${monitor.name}" (${monitor.type})`);
    return result;
  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      // eslint-disable-next-line no-console
      console.log(`  ↻ Skipped "${monitor.name}" (already exists)`);
      return null;
    }
    throw error;
  }
};

const ensureAgentPolicy = async (name: string) => {
  const existing = await request(
    'get',
    `/api/fleet/agent_policies?kuery=ingest-agent-policies.name:"${encodeURIComponent(
      name
    )}"&perPage=1`
  );
  if (existing?.items?.length > 0) {
    // eslint-disable-next-line no-console
    console.log(`  ↻ Reusing existing agent policy "${name}"`);
    return existing.items[0];
  }
  const result = await request('post', '/api/fleet/agent_policies', {
    name,
    description: '',
    namespace: 'default',
    monitoring_enabled: ['logs', 'metrics', 'traces'],
    inactivity_timeout: 1209600,
    is_protected: false,
  });
  return result.item;
};

const getPrivateLocations = async (): Promise<Array<{ id: string; label: string }>> => {
  return await request('get', '/api/synthetics/private_locations');
};

const ensurePrivateLocation = async (
  label: string,
  agentPolicyId: string,
  geo: { lat: number; lon: number } = { lat: 0, lon: 0 }
) => {
  const existing = await getPrivateLocations();
  const found = existing.find((loc: any) => loc.label === label);
  if (found) {
    // eslint-disable-next-line no-console
    console.log(`  ↻ Reusing existing private location "${label}"`);
    return found;
  }
  return await request('post', '/api/synthetics/private_locations', {
    label,
    agentPolicyId,
    geo,
  });
};

const commonFields = (overrides: Record<string, any>) => ({
  enabled: true,
  alert: { status: { enabled: true }, tls: { enabled: true } },
  'service.name': '',
  config_id: '',
  namespace: 'default',
  origin: 'ui',
  journey_id: '',
  hash: '',
  id: '',
  max_attempts: 2,
  revision: 1,
  ...overrides,
});

const httpMonitor = (overrides: Record<string, any>) =>
  commonFields({
    type: 'http',
    form_monitor_type: 'http',
    schedule: { number: '3', unit: 'm' },
    timeout: '16',
    __ui: { is_tls_enabled: false },
    max_redirects: '0',
    'url.port': null,
    password: '',
    proxy_url: '',
    proxy_headers: {},
    'check.response.body.negative': [],
    'check.response.body.positive': [],
    'check.response.json': [],
    'response.include_body': 'on_error',
    'check.response.headers': {},
    'response.include_headers': true,
    'check.response.status': [],
    'check.request.body': { type: 'text', value: '' },
    'check.request.headers': {},
    'check.request.method': 'GET',
    username: '',
    mode: 'any',
    'response.include_body_max_bytes': '1024',
    ipv4: true,
    ipv6: true,
    'ssl.certificate_authorities': '',
    'ssl.certificate': '',
    'ssl.key': '',
    'ssl.key_passphrase': '',
    'ssl.verification_mode': 'full',
    'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
    ...overrides,
  });

const tcpMonitor = (overrides: Record<string, any>) =>
  commonFields({
    type: 'tcp',
    form_monitor_type: 'tcp',
    schedule: { number: '3', unit: 'm' },
    timeout: '16',
    __ui: { is_tls_enabled: false },
    hosts: 'localhost:9200',
    'url.port': null,
    proxy_url: '',
    proxy_use_local_resolver: false,
    'check.receive': '',
    'check.send': '',
    mode: 'any',
    ipv4: true,
    ipv6: true,
    'ssl.certificate_authorities': '',
    'ssl.certificate': '',
    'ssl.key': '',
    'ssl.key_passphrase': '',
    'ssl.verification_mode': 'full',
    'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
    ...overrides,
  });

const icmpMonitor = (overrides: Record<string, any>) =>
  commonFields({
    type: 'icmp',
    form_monitor_type: 'icmp',
    schedule: { number: '3', unit: 'm' },
    timeout: '16',
    hosts: 'localhost',
    wait: '1',
    mode: 'any',
    ipv4: true,
    ipv6: true,
    ...overrides,
  });

const browserMonitor = (overrides: Record<string, any>) =>
  commonFields({
    type: 'browser',
    form_monitor_type: 'single',
    schedule: { number: '10', unit: 'm' },
    timeout: '30',
    __ui: { script_source: { is_generated_script: false, file_name: '' } },
    params: '',
    'url.port': null,
    'source.inline.script': `step('Go to page', async () => {
  await page.goto('https://www.google.com');
});`,
    'source.project.content': '',
    playwright_options: '',
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
    ...overrides,
  });

export const generateMonitors = async () => {
  // eslint-disable-next-line no-console
  console.log('=== Setting up infrastructure ===');

  const policyUS = await ensureAgentPolicy('Test Policy US');
  const policyEU = await ensureAgentPolicy('Test Policy EU');
  const policyAP = await ensureAgentPolicy('Test Policy AP');
  const policySA = await ensureAgentPolicy('Test Policy SA');
  const policyAU = await ensureAgentPolicy('Test Policy AU');

  const locUS = await ensurePrivateLocation('US East (Private)', policyUS.id, {
    lat: 40.7128,
    lon: -74.006,
  });
  const locEU = await ensurePrivateLocation('EU West (Private)', policyEU.id, {
    lat: 51.5074,
    lon: -0.1278,
  });
  const locAP = await ensurePrivateLocation('Asia Pacific (Private)', policyAP.id, {
    lat: 35.6762,
    lon: 139.6503,
  });
  const locSA = await ensurePrivateLocation('South America (Private)', policySA.id, {
    lat: -23.5505,
    lon: -46.6333,
  });
  const locAU = await ensurePrivateLocation('Australia (Private)', policyAU.id, {
    lat: -33.8688,
    lon: 151.2093,
  });

  const toLoc = (loc: { id: string; label: string }) => ({
    id: loc.id,
    label: loc.label,
    isServiceManaged: false,
  });
  const privateLocUS = toLoc(locUS);
  const privateLocEU = toLoc(locEU);
  const privateLocAP = toLoc(locAP);
  const privateLocSA = toLoc(locSA);
  const privateLocAU = toLoc(locAU);
  const allLocations = [privateLocUS, privateLocEU, privateLocAP, privateLocSA, privateLocAU];
  const threeLocations = [privateLocUS, privateLocEU, privateLocAP];
  const fourLocations = [privateLocUS, privateLocEU, privateLocAP, privateLocSA];

  // eslint-disable-next-line no-console
  console.log(`  ✓ Private locations: ${allLocations.map((l) => `"${l.label}"`).join(', ')}`);

  // ---------------------------------------------------------------------------
  // HTTP monitors — various URLs, tags, schedules, locations
  // ---------------------------------------------------------------------------
  // eslint-disable-next-line no-console
  console.log('\n=== Creating HTTP monitors ===');

  await createMonitor(
    httpMonitor({
      name: 'Google Homepage',
      urls: 'https://www.google.com',
      tags: ['search', 'production', 'critical'],
      schedule: { number: '1', unit: 'm' },
      locations: allLocations,
    })
  );

  await createMonitor(
    httpMonitor({
      name: 'GitHub Status',
      urls: 'https://www.githubstatus.com',
      tags: ['devtools', 'production'],
      schedule: { number: '3', unit: 'm' },
      locations: [privateLocUS],
    })
  );

  await createMonitor(
    httpMonitor({
      name: 'Elastic.co',
      urls: 'https://www.elastic.co',
      tags: ['production', 'elastic', 'critical'],
      schedule: { number: '5', unit: 'm' },
      locations: [privateLocEU],
    })
  );

  await createMonitor(
    httpMonitor({
      name: 'Wikipedia API',
      urls: 'https://en.wikipedia.org/w/api.php?action=query&meta=siteinfo&format=json',
      tags: ['api', 'production'],
      schedule: { number: '5', unit: 'm' },
      'check.request.method': 'GET',
      'check.response.status': ['200'],
      locations: fourLocations,
    })
  );

  await createMonitor(
    httpMonitor({
      name: 'JSONPlaceholder API',
      urls: 'https://jsonplaceholder.typicode.com/posts/1',
      tags: ['api', 'staging', 'test-data'],
      schedule: { number: '3', unit: 'm' },
      'check.request.method': 'GET',
      'check.response.status': ['200'],
      'check.response.body.positive': ['"userId"'],
      locations: [privateLocUS],
    })
  );

  await createMonitor(
    httpMonitor({
      name: 'httpbin POST Check',
      urls: 'https://httpbin.org/post',
      tags: ['api', 'staging'],
      schedule: { number: '10', unit: 'm' },
      'check.request.method': 'POST',
      'check.request.body': { type: 'json', value: '{"test": true}' },
      'check.request.headers': { 'Content-Type': 'application/json' },
      'check.response.status': ['200'],
      locations: [privateLocEU],
    })
  );

  await createMonitor(
    httpMonitor({
      name: 'HTTP Down – Bad URL',
      urls: 'https://this-url-does-not-exist-12345.example.com',
      tags: ['down-test', 'staging'],
      schedule: { number: '10', unit: 'm' },
      locations: [privateLocUS],
    })
  );

  await createMonitor(
    httpMonitor({
      name: 'HTTP Down – Body Mismatch',
      urls: 'https://www.google.com',
      tags: ['down-test', 'production'],
      schedule: { number: '5', unit: 'm' },
      'check.response.body.positive': ['this-string-will-never-be-found-xyz'],
      locations: threeLocations,
    })
  );

  await createMonitor(
    httpMonitor({
      name: 'Cloudflare DNS Check',
      urls: 'https://1.1.1.1',
      tags: ['infrastructure', 'dns', 'critical'],
      schedule: { number: '1', unit: 'm' },
      locations: allLocations,
    })
  );

  await createMonitor(
    httpMonitor({
      name: 'HTTP Disabled Monitor',
      urls: 'https://example.com',
      tags: ['disabled', 'staging'],
      schedule: { number: '30', unit: 'm' },
      enabled: false,
      locations: [privateLocUS],
    })
  );

  await createMonitor(
    httpMonitor({
      name: 'HTTP Long Interval',
      urls: 'https://www.elastic.co/blog',
      tags: ['production', 'elastic', 'blog'],
      schedule: { number: '60', unit: 'm' },
      locations: [privateLocEU],
    })
  );

  await createMonitor(
    httpMonitor({
      name: 'HTTP With Auth',
      urls: 'https://httpbin.org/basic-auth/user/pass',
      tags: ['api', 'auth', 'staging'],
      schedule: { number: '15', unit: 'm' },
      username: 'user',
      password: 'pass',
      locations: [privateLocUS],
    })
  );

  // ---------------------------------------------------------------------------
  // TCP monitors — various hosts, ports, tags
  // ---------------------------------------------------------------------------
  // eslint-disable-next-line no-console
  console.log('\n=== Creating TCP monitors ===');

  await createMonitor(
    tcpMonitor({
      name: 'Elasticsearch TCP',
      hosts: 'localhost:9200',
      tags: ['infrastructure', 'elastic', 'critical'],
      schedule: { number: '1', unit: 'm' },
      locations: allLocations,
    })
  );

  await createMonitor(
    tcpMonitor({
      name: 'Google DNS TCP',
      hosts: '8.8.8.8:53',
      tags: ['infrastructure', 'dns', 'production'],
      schedule: { number: '3', unit: 'm' },
      locations: [privateLocUS],
    })
  );

  await createMonitor(
    tcpMonitor({
      name: 'Cloudflare DNS TCP',
      hosts: '1.1.1.1:53',
      tags: ['infrastructure', 'dns', 'production'],
      schedule: { number: '3', unit: 'm' },
      locations: [privateLocEU],
    })
  );

  await createMonitor(
    tcpMonitor({
      name: 'SMTP Check',
      hosts: 'smtp.gmail.com:465',
      tags: ['email', 'production', 'critical'],
      schedule: { number: '10', unit: 'm' },
      locations: threeLocations,
    })
  );

  await createMonitor(
    tcpMonitor({
      name: 'TCP Down – Bad Port',
      hosts: 'localhost:59999',
      tags: ['down-test', 'infrastructure'],
      schedule: { number: '5', unit: 'm' },
      locations: [privateLocUS],
    })
  );

  await createMonitor(
    tcpMonitor({
      name: 'Redis TCP',
      hosts: 'localhost:6379',
      tags: ['infrastructure', 'cache', 'staging'],
      schedule: { number: '3', unit: 'm' },
      locations: [privateLocEU],
    })
  );

  await createMonitor(
    tcpMonitor({
      name: 'TCP Disabled Monitor',
      hosts: 'localhost:5432',
      tags: ['disabled', 'infrastructure', 'database'],
      schedule: { number: '15', unit: 'm' },
      enabled: false,
      locations: [privateLocUS],
    })
  );

  // ---------------------------------------------------------------------------
  // ICMP monitors — various hosts, tags
  // ---------------------------------------------------------------------------
  // eslint-disable-next-line no-console
  console.log('\n=== Creating ICMP monitors ===');

  await createMonitor(
    icmpMonitor({
      name: 'Ping localhost',
      hosts: 'localhost',
      tags: ['infrastructure', 'local', 'critical'],
      schedule: { number: '1', unit: 'm' },
      locations: allLocations,
    })
  );

  await createMonitor(
    icmpMonitor({
      name: 'Ping Google DNS',
      hosts: '8.8.8.8',
      tags: ['infrastructure', 'dns', 'production'],
      schedule: { number: '3', unit: 'm' },
      locations: [privateLocUS],
    })
  );

  await createMonitor(
    icmpMonitor({
      name: 'Ping Cloudflare',
      hosts: '1.1.1.1',
      tags: ['infrastructure', 'dns', 'production'],
      schedule: { number: '3', unit: 'm' },
      locations: [privateLocEU],
    })
  );

  await createMonitor(
    icmpMonitor({
      name: 'ICMP Down – Bad Host',
      hosts: '192.0.2.1',
      tags: ['down-test', 'infrastructure'],
      schedule: { number: '5', unit: 'm' },
      locations: fourLocations,
    })
  );

  await createMonitor(
    icmpMonitor({
      name: 'Ping Gateway',
      hosts: '10.0.0.1',
      tags: ['infrastructure', 'network', 'staging'],
      schedule: { number: '5', unit: 'm' },
      locations: [privateLocUS],
    })
  );

  await createMonitor(
    icmpMonitor({
      name: 'ICMP Disabled Monitor',
      hosts: 'localhost',
      tags: ['disabled', 'infrastructure'],
      schedule: { number: '30', unit: 'm' },
      enabled: false,
      locations: [privateLocEU],
    })
  );

  // ---------------------------------------------------------------------------
  // Browser monitors — various scripts, tags
  // ---------------------------------------------------------------------------
  // eslint-disable-next-line no-console
  console.log('\n=== Creating Browser monitors ===');

  await createMonitor(
    browserMonitor({
      name: 'Google Search Flow',
      urls: 'https://www.google.com',
      tags: ['search', 'production', 'critical'],
      schedule: { number: '10', unit: 'm' },
      'source.inline.script': `step('Load Google', async () => {
  await page.goto('https://www.google.com');
  await page.waitForSelector('input[name="q"]');
});`,
      locations: allLocations,
    })
  );

  await createMonitor(
    browserMonitor({
      name: 'Elastic Homepage Check',
      urls: 'https://www.elastic.co',
      tags: ['production', 'elastic', 'critical'],
      schedule: { number: '15', unit: 'm' },
      'source.inline.script': `step('Load Elastic.co', async () => {
  await page.goto('https://www.elastic.co');
  await page.waitForSelector('body');
});`,
      locations: [privateLocEU],
    })
  );

  await createMonitor(
    browserMonitor({
      name: 'Wikipedia Title Check',
      urls: 'https://en.wikipedia.org',
      tags: ['production', 'encyclopedia'],
      schedule: { number: '15', unit: 'm' },
      'source.inline.script': `step('Check Wikipedia title', async () => {
  await page.goto('https://en.wikipedia.org');
  await page.waitForSelector('#www-wikipedia-org');
});`,
      locations: [privateLocUS],
    })
  );

  await createMonitor(
    browserMonitor({
      name: 'Browser Multi-step Login',
      urls: 'https://the-internet.herokuapp.com',
      tags: ['staging', 'auth', 'multi-step'],
      schedule: { number: '15', unit: 'm' },
      form_monitor_type: 'multistep',
      'source.inline.script': `step('Navigate to login', async () => {
  await page.goto('https://the-internet.herokuapp.com/login');
  await page.waitForSelector('#login');
});
step('Fill credentials', async () => {
  await page.fill('#username', 'tomsmith');
  await page.fill('#password', 'SuperSecretPassword!');
  await page.click('button[type="submit"]');
});`,
      locations: fourLocations,
    })
  );

  await createMonitor(
    browserMonitor({
      name: 'Browser Down – Bad Assertion',
      urls: 'https://www.google.com',
      tags: ['down-test', 'staging'],
      schedule: { number: '10', unit: 'm' },
      'source.inline.script': `step('Load and fail', async () => {
  await page.goto('https://www.google.com');
  await page.waitForSelector('#nonexistent-element-xyz', { timeout: 5000 });
});`,
      locations: [privateLocUS],
    })
  );

  await createMonitor(
    browserMonitor({
      name: 'Browser Disabled Monitor',
      urls: 'https://example.com',
      tags: ['disabled', 'staging'],
      schedule: { number: '30', unit: 'm' },
      enabled: false,
      'source.inline.script': `step('Disabled step', async () => {
  await page.goto('https://example.com');
});`,
      locations: [privateLocEU],
    })
  );

  await createMonitor(
    browserMonitor({
      name: 'Browser Throttled Check',
      urls: 'https://www.github.com',
      tags: ['devtools', 'production', 'performance'],
      schedule: { number: '30', unit: 'm' },
      throttling: {
        id: 'custom',
        label: 'Slow 3G',
        value: { download: '0.4', upload: '0.2', latency: '400' },
      },
      'source.inline.script': `step('Load GitHub under throttle', async () => {
  await page.goto('https://www.github.com');
  await page.waitForSelector('body');
});`,
      locations: threeLocations,
    })
  );

  // ---------------------------------------------------------------------------
  // Monitors with project_id — to test "group by project" grouping
  // ---------------------------------------------------------------------------
  // eslint-disable-next-line no-console
  console.log('\n=== Creating monitors with project IDs ===');

  await createMonitor(
    browserMonitor({
      name: 'E-Commerce Homepage',
      urls: 'https://www.example.com',
      tags: ['ecommerce', 'production', 'critical'],
      schedule: { number: '10', unit: 'm' },
      project_id: 'ecommerce-app',
      journey_id: 'ecommerce-homepage',
      'source.inline.script': `step('Load homepage', async () => {
  await page.goto('https://www.example.com');
  await page.waitForSelector('body');
});`,
      locations: [privateLocUS],
    })
  );

  await createMonitor(
    browserMonitor({
      name: 'E-Commerce Checkout',
      urls: 'https://www.example.com/checkout',
      tags: ['ecommerce', 'production', 'checkout'],
      schedule: { number: '15', unit: 'm' },
      project_id: 'ecommerce-app',
      journey_id: 'ecommerce-checkout',
      'source.inline.script': `step('Load checkout', async () => {
  await page.goto('https://www.example.com/checkout');
  await page.waitForSelector('body');
});`,
      locations: [privateLocUS],
    })
  );

  await createMonitor(
    httpMonitor({
      name: 'E-Commerce API Health',
      urls: 'https://httpbin.org/status/200',
      tags: ['ecommerce', 'api', 'production'],
      schedule: { number: '3', unit: 'm' },
      project_id: 'ecommerce-app',
      locations: allLocations,
    })
  );

  await createMonitor(
    browserMonitor({
      name: 'Infra Dashboard Check',
      urls: 'https://www.elastic.co/kibana',
      tags: ['infrastructure', 'dashboards', 'production'],
      schedule: { number: '10', unit: 'm' },
      project_id: 'infra-monitoring',
      journey_id: 'infra-dashboard',
      'source.inline.script': `step('Load dashboard', async () => {
  await page.goto('https://www.elastic.co/kibana');
  await page.waitForSelector('body');
});`,
      locations: [privateLocEU],
    })
  );

  await createMonitor(
    httpMonitor({
      name: 'Infra Alerts Endpoint',
      urls: 'https://httpbin.org/status/200',
      tags: ['infrastructure', 'alerts', 'production'],
      schedule: { number: '5', unit: 'm' },
      project_id: 'infra-monitoring',
      locations: [privateLocEU],
    })
  );

  await createMonitor(
    httpMonitor({
      name: 'Mobile API Health',
      urls: 'https://jsonplaceholder.typicode.com/users',
      tags: ['mobile', 'api', 'production'],
      schedule: { number: '5', unit: 'm' },
      project_id: 'mobile-app-backend',
      locations: [privateLocUS],
    })
  );

  await createMonitor(
    httpMonitor({
      name: 'Mobile Push Service',
      urls: 'https://httpbin.org/post',
      tags: ['mobile', 'notifications', 'production'],
      schedule: { number: '10', unit: 'm' },
      project_id: 'mobile-app-backend',
      'check.request.method': 'POST',
      'check.request.body': { type: 'json', value: '{"token": "test"}' },
      locations: threeLocations,
    })
  );

  // ---------------------------------------------------------------------------
  // Additional HTTP monitors with no tags (for testing empty tag grouping)
  // ---------------------------------------------------------------------------
  // eslint-disable-next-line no-console
  console.log('\n=== Creating monitors with edge-case configs ===');

  await createMonitor(
    httpMonitor({
      name: 'HTTP No Tags',
      urls: 'https://example.org',
      tags: [],
      schedule: { number: '10', unit: 'm' },
      locations: [privateLocUS],
    })
  );

  await createMonitor(
    tcpMonitor({
      name: 'TCP No Tags',
      hosts: 'localhost:80',
      tags: [],
      schedule: { number: '10', unit: 'm' },
      locations: [privateLocEU],
    })
  );

  await createMonitor(
    httpMonitor({
      name: 'HTTP Many Tags',
      urls: 'https://httpbin.org/get',
      tags: [
        'production',
        'critical',
        'api',
        'monitoring',
        'sla-99.9',
        'team-platform',
        'region-us',
        'tier-1',
      ],
      schedule: { number: '3', unit: 'm' },
      locations: allLocations,
    })
  );

  await createMonitor(
    httpMonitor({
      name: 'HTTP 2min Schedule',
      urls: 'https://httpbin.org/status/200',
      tags: ['api', 'schedule-test'],
      schedule: { number: '2', unit: 'm' },
      locations: [privateLocUS],
    })
  );

  await createMonitor(
    httpMonitor({
      name: 'HTTP 4h Schedule',
      urls: 'https://httpbin.org/status/200',
      tags: ['api', 'schedule-test'],
      schedule: { number: '240', unit: 'm' },
      locations: [privateLocEU],
    })
  );

  // ---------------------------------------------------------------------------
  // Ingest mock summary data into ES for all monitors
  // ---------------------------------------------------------------------------
  // eslint-disable-next-line no-console
  console.log('\n=== Ingesting mock summary data ===');

  const allMonitors = await fetchAllMonitors();
  // eslint-disable-next-line no-console
  console.log(`  Found ${allMonitors.length} monitors to seed data for`);

  const { upCount, downCount } = await ingestSummaryData(allMonitors);
  // eslint-disable-next-line no-console
  console.log(`  ✓ Ingested ${upCount} up + ${downCount} down summary docs`);

  // eslint-disable-next-line no-console
  console.log('\n=== Done! ===');
  // eslint-disable-next-line no-console
  console.log('Summary of created monitors:');
  // eslint-disable-next-line no-console
  console.log('  HTTP:      16 monitors (12 standard + 4 edge-case)');
  // eslint-disable-next-line no-console
  console.log('  TCP:       8 monitors');
  // eslint-disable-next-line no-console
  console.log('  ICMP:      6 monitors');
  // eslint-disable-next-line no-console
  console.log('  Browser:   10 monitors');
  // eslint-disable-next-line no-console
  console.log(
    '  w/ Project: 7 monitors (3 projects: ecommerce-app, infra-monitoring, mobile-app-backend)'
  );
  // eslint-disable-next-line no-console
  console.log('  Total:     ~40 monitors across 5 private locations');
  // eslint-disable-next-line no-console
  console.log('\nGroup-by coverage:');
  // eslint-disable-next-line no-console
  console.log('  By Type:     http, tcp, icmp, browser');
  // eslint-disable-next-line no-console
  console.log('  By Location: US East, EU West, Asia Pacific, South America, Australia');
  // eslint-disable-next-line no-console
  console.log('  By Tags:     production, staging, critical, api, infrastructure, dns, ...');
  // eslint-disable-next-line no-console
  console.log('  By Project:  ecommerce-app, infra-monitoring, mobile-app-backend');
  // eslint-disable-next-line no-console
  console.log('  By Monitor:  each monitor is uniquely named');
};
