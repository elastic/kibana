/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { EsClient, KbnClient, ScoutLogger } from '@kbn/scout-security';
import {
  METADATA_DATASTREAM,
  POLICY_RESPONSE_INDEX,
} from '../../../../../common/endpoint/constants';
import {
  deleteIndexedHostsAndAlerts,
  indexHostsAndAlerts,
  type IndexedHostsAndAlertsResponse,
} from '../../../../../common/endpoint/index_data';
import { EndpointDocGenerator } from '../../../../../common/endpoint/generate_data';
import {
  indexEndpointRuleAlerts,
  type IndexedEndpointRuleAlerts,
} from '../../../../../common/endpoint/data_loaders/index_endpoint_rule_alerts';
import {
  ENDPOINT_ALERTS_INDEX,
  ENDPOINT_DEVICE_INDEX,
  ENDPOINT_EVENTS_INDEX,
} from '../../../../../scripts/endpoint/common/constants';

export interface SeededAlertWithIsolateAction {
  alertId: string;
  cleanup: () => Promise<void>;
}

/**
 * Indexes an endpoint-rule alert, then a mocked host whose isolate action is
 * linked to that alert id (same seed order as the Cypress results spec).
 */
export const seedAlertWithIsolateAction = async ({
  esClient,
  kbnClient,
  log,
  isServerless,
}: {
  esClient: EsClient;
  kbnClient: KbnClient;
  log: ScoutLogger;
  isServerless: boolean;
}): Promise<SeededAlertWithIsolateAction> => {
  const client = esClient as Client;
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const endpointAgentId = `scout-ara-agent-${suffix}`;
  const endpointHostname = `scout-ara-host-${suffix}`;

  const indexedAlerts: IndexedEndpointRuleAlerts = await indexEndpointRuleAlerts({
    esClient: client,
    kbnClient,
    endpointAgentId,
    endpointHostname,
    endpointIsolated: false,
    count: 1,
  });
  const alertId = indexedAlerts.alerts[0]._id;
  if (!alertId) {
    await indexedAlerts.cleanup();
    throw new Error('indexEndpointRuleAlerts did not return an alert id');
  }

  let indexedHosts: IndexedHostsAndAlertsResponse | undefined;
  try {
    indexedHosts = await indexHostsAndAlerts(
      client,
      kbnClient,
      `scout.ara.${suffix}`,
      1,
      1,
      METADATA_DATASTREAM,
      POLICY_RESPONSE_INDEX,
      ENDPOINT_EVENTS_INDEX,
      ENDPOINT_ALERTS_INDEX,
      ENDPOINT_DEVICE_INDEX,
      0,
      true,
      undefined,
      EndpointDocGenerator,
      true,
      1,
      [alertId],
      isServerless
    );
  } catch (error) {
    await indexedAlerts.cleanup();
    throw error;
  }

  return {
    alertId,
    cleanup: async () => {
      if (indexedHosts) {
        await deleteIndexedHostsAndAlerts(client, kbnClient, indexedHosts).catch((error) => {
          log.warning(`host cleanup threw: ${error.message}`);
        });
      }
      await indexedAlerts.cleanup().catch((error) => {
        log.warning(`alert cleanup threw: ${error.message}`);
      });
    },
  };
};
