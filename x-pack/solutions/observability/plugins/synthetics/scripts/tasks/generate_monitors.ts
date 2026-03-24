/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import moment from 'moment';
import { readKibanaConfig } from '@kbn/observability-synthetics-test-data';

const UP_MONITORS = 10;
const DOWN_MONITORS = 10;

function getAuthFromKibanaConfig() {
  const config = readKibanaConfig();
  let username = config.elasticsearch?.username;
  if (username === 'kibana_system_user') {
    username = 'elastic';
  }
  const password = config.elasticsearch?.password;
  return { username, password };
}

export const generateMonitors = async () => {
  const policy = (await createTestAgentPolicy()) as { data: { item: { id: string } } };
  const location = await createPrivateLocation(policy.data.item.id);

  // eslint-disable-next-line no-console
  console.log(`Generating ${UP_MONITORS} up monitors`);
  for (let i = 0; i < UP_MONITORS; i++) {
    await createMonitor(getHttpMonitor({ privateLocation: location }));
  }

  // eslint-disable-next-line no-console
  console.log(`Generating ${DOWN_MONITORS} down monitors`);
  for (let i = 0; i < DOWN_MONITORS; i++) {
    await createMonitor(getHttpMonitor({ isDown: true, privateLocation: location }));
  }
};

const createMonitor = async (monitor: any) => {
  await axios
    .request({
      data: monitor,
      method: 'post',
      url: 'http://127.0.0.1:5601/test/api/synthetics/monitors',
      auth: getAuthFromKibanaConfig(),
      headers: { 'kbn-xsrf': 'true', 'elastic-api-version': '2023-10-31' },
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error(error);
    });
};

const createTestAgentPolicy = async () => {
  const data = {
    name: 'Test agent policy ' + moment().format('LTS'),
    description: '',
    namespace: 'default',
    monitoring_enabled: ['logs', 'metrics', 'traces'],
    inactivity_timeout: 1209600,
    is_protected: false,
  };
  return await axios
    .request({
      data,
      method: 'post',
      url: 'http://127.0.0.1:5601/test/api/fleet/agent_policies',
      auth: getAuthFromKibanaConfig(),
      headers: { 'kbn-xsrf': 'true', 'elastic-api-version': '2023-10-31' },
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error(error);
    });
};

const createPrivateLocation = async (policyId: string) => {
  const data = {
    label: 'Test private location ' + moment().format('LTS'),
    agentPolicyId: policyId,
    geo: { lat: 0, lon: 0 },
    spaces: ['*'],
  };

  return (
    (await axios
      .request({
        data,
        method: 'post',
        url: 'http://127.0.0.1:5601/test/api/synthetics/private_locations',
        auth: getAuthFromKibanaConfig(),
        headers: { 'kbn-xsrf': 'true', 'elastic-api-version': '2023-10-31' },
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error(error);
      })) as any
  ).data;
};

const getHttpMonitor = ({
  isDown,
  privateLocation,
}: {
  isDown?: boolean;
  privateLocation?: {
    id: string;
    label: string;
  };
}) => {
  return {
    type: 'http',
    form_monitor_type: 'http',
    enabled: true,
    alert: { status: { enabled: true }, tls: { enabled: true } },
    schedule: { number: '3', unit: 'm' },
    'service.name': '',
    config_id: '',
    tags: [],
    timeout: '16',
    name: 'Monitor at ' + moment().format('LTS'),
    locations: [
      { id: 'us_central_staging', label: 'US Central Staging', isServiceManaged: true },
      { id: 'us_central', label: 'North America - US Central', isServiceManaged: true },
      { id: 'us_central_qa', label: 'US Central QA', isServiceManaged: true },
      ...(privateLocation
        ? [{ id: privateLocation.id, label: privateLocation.label, isServiceManaged: false }]
        : []),
    ],
    namespace: 'default',
    origin: 'ui',
    journey_id: '',
    hash: '',
    id: '',
    params: '',
    max_attempts: 2,
    revision: 1,
    __ui: { is_tls_enabled: false },
    urls: 'https://www.google.com',
    max_redirects: '0',
    'url.port': null,
    password: '',
    proxy_url: '',
    proxy_headers: {},
    'check.response.body.negative': [],
    'check.response.body.positive': isDown ? ["i don't exist"] : [],
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
  };
};
