/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout-security';
import { setupFleetForEndpoint } from '@kbn/security-solution-plugin/common/endpoint/data_loaders/setup_fleet_for_endpoint';
import { getOrCreateDefaultAgentPolicy } from '@kbn/security-solution-plugin/scripts/endpoint/common/fleet_services';

const DW_BASE_AGENT_POLICY_NAME = 'DW Scout Base Policy';

globalSetupHook(
  'Defend Workflows: Fleet setup + endpoint package + base agent policy',
  async ({ kbnClient, log }) => {
    log.info('[DW global setup] Setting up Fleet and installing endpoint package...');
    await setupFleetForEndpoint(kbnClient, log);

    log.info('[DW global setup] Ensuring base agent policy exists...');
    const agentPolicy = await getOrCreateDefaultAgentPolicy({
      kbnClient,
      log,
      policyName: DW_BASE_AGENT_POLICY_NAME,
    });
    log.info(`[DW global setup] Base agent policy ready: ${agentPolicy.id}`);
  }
);
