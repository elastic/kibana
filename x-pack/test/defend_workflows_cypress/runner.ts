/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Url from 'url';
import { FtrProviderContext } from './ftr_provider_context';

export async function DefendWorkflowsCypressCliTestRunner(context: FtrProviderContext) {
  return startDefendWorkflowsCypress(context, 'dw:run');
}

export async function DefendWorkflowsCypressVisualTestRunner(context: FtrProviderContext) {
  return startDefendWorkflowsCypress(context, 'dw:open');
}

export async function DefendWorkflowsCypressEndpointTestRunner(context: FtrProviderContext) {
  return startDefendWorkflowsCypress(context, 'dw:endpoint:open');
}

function startDefendWorkflowsCypress(
  context: FtrProviderContext,
  cypressCommand: 'dw:endpoint:open' | 'dw:open' | 'dw:run'
) {
  const config = context.getService('config');

  return {
    FORCE_COLOR: '1',
    ELASTICSEARCH_URL: Url.format(config.get('servers.elasticsearch')),
    ELASTICSEARCH_USERNAME: config.get('servers.kibana.username'),
    ELASTICSEARCH_PASSWORD: config.get('servers.kibana.password'),
    FLEET_SERVER_URL: config.get('servers.fleetserver')
      ? Url.format(config.get('servers.fleetserver'))
      : undefined,
    KIBANA_URL: Url.format({
      protocol: config.get('servers.kibana.protocol'),
      hostname: config.get('servers.kibana.hostname'),
      port: config.get('servers.kibana.port'),
    }),
  };
}
