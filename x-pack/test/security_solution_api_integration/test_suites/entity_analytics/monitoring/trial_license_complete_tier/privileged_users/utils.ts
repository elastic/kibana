/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../ftr_provider_context';

export const PrivMonUtils = (
  getService: FtrProviderContext['getService'],
  namespace: string = 'default'
) => {
  const api = getService('securitySolutionApi');
  const log = getService('log');

  log.info(`Monitoring: Privileged Users: Using namespace ${namespace}`);

  const initPrivMonEngine = async () => {
    log.info(`Initializing Privilege Monitoring engine in namespace ${namespace || 'default'}`);
    const res = await api.initMonitoringEngine(namespace);

    if (res.status !== 200) {
      log.error(`Failed to initialize engine`);
      log.error(JSON.stringify(res.body));
    }

    expect(res.status).to.eql(200);
  };

  return { initPrivMonEngine };
};
