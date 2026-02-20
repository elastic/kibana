/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { KbnClient } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  indexFleetEndpointPolicy,
  deleteIndexedFleetEndpointPolicies,
  type IndexedFleetEndpointPolicyResponse,
} from '@kbn/security-solution-plugin/common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { getEndpointPackageInfo } from '@kbn/security-solution-plugin/common/endpoint/utils/package';
import {
  indexHostsAndAlerts,
  deleteIndexedHostsAndAlerts,
  type IndexedHostsAndAlertsResponse,
} from '@kbn/security-solution-plugin/common/endpoint/index_data';
import {
  METADATA_DATASTREAM,
  POLICY_RESPONSE_INDEX,
} from '@kbn/security-solution-plugin/common/endpoint/constants';
import { EndpointDocGenerator } from '@kbn/security-solution-plugin/common/endpoint/generate_data';

/** Re-export for use in specs. */
export type { IndexedFleetEndpointPolicyResponse, IndexedHostsAndAlertsResponse };

const ENDPOINT_EVENTS_INDEX = 'logs-endpoint.events.process-default';
const ENDPOINT_ALERTS_INDEX = 'logs-endpoint.alerts-default';
const ENDPOINT_DEVICE_INDEX = 'logs-endpoint.events.device-default';

/**
 * Get the default Endpoint package version from Fleet (for creating policies).
 */
export async function getEndpointIntegrationVersion(kbnClient: KbnClient): Promise<string> {
  const info = await getEndpointPackageInfo(kbnClient);
  return info.version;
}

/**
 * Create an Endpoint integration policy (and associated Agent Policy) via Fleet API.
 * Use in beforeAll; clean up with deleteIndexedFleetEndpointPolicies in afterAll.
 */
export async function createFleetEndpointPolicy(
  kbnClient: KbnClient,
  options: {
    policyPrefix?: string;
    endpointPackageVersion?: string;
    log?: ToolingLog;
  } = {}
): Promise<IndexedFleetEndpointPolicyResponse> {
  const { policyPrefix = 'Scout', endpointPackageVersion, log } = options;
  const suffix = Math.random().toString(36).substring(2, 7);
  const policyName = `${policyPrefix} ${suffix}`;
  return indexFleetEndpointPolicy(kbnClient, policyName, endpointPackageVersion, policyName, log);
}

/**
 * Delete Fleet Endpoint policies created during tests.
 */
export async function deleteFleetEndpointPolicies(
  kbnClient: KbnClient,
  indexData: IndexedFleetEndpointPolicyResponse
): Promise<void> {
  await deleteIndexedFleetEndpointPolicies(kbnClient, indexData);
}

export interface IndexEndpointHostsOptions {
  numHosts?: number;
  numHostDocs?: number;
  alertsPerHost?: number;
  enableFleetIntegration?: boolean;
  seed?: string;
  isServerless?: boolean;
  log?: ToolingLog;
  /** Include response actions in indexed data (default true). */
  withResponseActions?: boolean;
}

/**
 * Index endpoint hosts (and optional alerts/Fleet integration) for tests that need
 * endpoint list data. Use in beforeAll; clean up with deleteIndexedEndpointHostsData in afterAll.
 */
export async function indexEndpointHostsData(
  esClient: Client,
  kbnClient: KbnClient,
  options: IndexEndpointHostsOptions = {}
): Promise<IndexedHostsAndAlertsResponse> {
  const {
    numHosts = 2,
    numHostDocs = 1,
    alertsPerHost = 1,
    enableFleetIntegration = true,
    seed = `scout.${Math.random()}`,
    isServerless = false,
    log,
    withResponseActions = true,
  } = options;
  return indexHostsAndAlerts(
    esClient as Client,
    kbnClient,
    seed,
    numHosts,
    numHostDocs,
    METADATA_DATASTREAM,
    POLICY_RESPONSE_INDEX,
    ENDPOINT_EVENTS_INDEX,
    ENDPOINT_ALERTS_INDEX,
    ENDPOINT_DEVICE_INDEX,
    alertsPerHost,
    enableFleetIntegration,
    undefined,
    EndpointDocGenerator,
    withResponseActions,
    undefined,
    undefined,
    isServerless,
    log
  );
}

/**
 * Delete indexed endpoint hosts and related data created during tests.
 */
export async function deleteIndexedEndpointHostsData(
  esClient: Client,
  kbnClient: KbnClient,
  indexData: IndexedHostsAndAlertsResponse
): Promise<void> {
  await deleteIndexedHostsAndAlerts(esClient as Client, kbnClient, indexData);
}
