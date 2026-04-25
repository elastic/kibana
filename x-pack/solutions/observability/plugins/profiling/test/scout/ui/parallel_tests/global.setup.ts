/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook, tags } from '@kbn/scout-oblt';
import { APM_AGENT_POLICY_ID } from '../../common/fixtures/constants';

globalSetupHook(
  'Set up Profiling Resources and Data',
  { tag: tags.stateful.classic },
  async ({ profilingSetup, apiServices, log }) => {
    try {
      // Create APM agent policy via Fleet API
      await apiServices.fleet.internal.setup();
      log.info('Fleet infrastructure setup completed');
      await apiServices.fleet.agent.setup();
      log.info('Fleet agents setup completed');
      log.info('Checking if APM agent policy exists, creating if needed...');
      const getPolicyResponse = await apiServices.fleet.agent_policies.get({
        page: 1,
        perPage: 10,
      });
      const apmPolicyData = getPolicyResponse.data.items.find(
        (policy: { id: string }) => policy.id === 'policy-elastic-agent-on-cloud'
      );

      if (!apmPolicyData) {
        await apiServices.fleet.agent_policies.create({
          policyName: 'Elastic APM',
          policyNamespace: 'default',
          sysMonitoring: false,
          params: {
            id: APM_AGENT_POLICY_ID,
            description: 'Elastic APM agent policy created via Fleet API',
          },
        });
        log.info(`APM agent policy '${APM_AGENT_POLICY_ID}' is created`);
      } else {
        log.info(`APM agent policy '${APM_AGENT_POLICY_ID}' already exists`);
      }

      // Check profiling status
      log.info('Checking profiling status...');
      const status = await profilingSetup.checkStatus();
      log.info('Profiling status:', status);

      // Set up profiling resources if needed
      if (!status.has_setup) {
        log.info('Setting up Universal profiling resources...');
        await profilingSetup.setupResources();
        log.info('[Done] Setting up Universal profiling resources.');
      } else {
        log.info('Profiling resources already set up.');
      }

      // Load profiling data if needed
      if (!status.has_data) {
        log.info('Loading Universal profiling data...');
        await profilingSetup.loadData();
        log.info('[Done] Loading Universal profiling data.');
      } else {
        log.info('Profiling data already loaded.');
      }
    } catch (error) {
      log.error(`Error setting up profiling: ${error}`);
      throw error;
    }
  }
);
