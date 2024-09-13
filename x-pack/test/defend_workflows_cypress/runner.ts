/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Url from 'url';
import { FtrProviderContext } from './ftr_provider_context';

export function DefendWorkflowsCypressCliTestRunner(context: FtrProviderContext) {
  const config = context.getService('config');

  return {
    FORCE_COLOR: '1',
    ELASTICSEARCH_URL: Url.format(config.get('servers.elasticsearch')),
    ELASTICSEARCH_USERNAME: config.get('servers.elasticsearch.username'),
    ELASTICSEARCH_PASSWORD: config.get('servers.elasticsearch.password'),
    FLEET_SERVER_URL: config.get('servers.fleetserver')
      ? Url.format(config.get('servers.fleetserver'))
      : undefined,
    KIBANA_USERNAME: config.get('servers.kibana.username'),
    KIBANA_PASSWORD: config.get('servers.kibana.password'),
    KIBANA_URL: Url.format({
      protocol: config.get('servers.kibana.protocol'),
      hostname: config.get('servers.kibana.hostname'),
      port: config.get('servers.kibana.port'),
    }),
  };
}
