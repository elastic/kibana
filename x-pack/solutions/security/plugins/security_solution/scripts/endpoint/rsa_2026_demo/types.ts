/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Client } from '@elastic/elasticsearch';
import type { HostVm, SupportedVmManager } from '../common/types';

export interface Rsa2026DemoConfig {
  /** Number of endpoints with Elastic Defend + Osquery (default: 5) */
  defendOsqueryCount: number;
  /** Number of endpoints with Osquery only (default: 5) */
  osqueryOnlyCount: number;
  /** Number of osquery-only endpoints that should have the malicious domain in browser history (default: 2) */
  osqueryOnlyCompromisedCount: number;
  /** Malicious domain to use in browser history (default: digert.ictnsc.com) */
  maliciousDomain: string;
  /** Username for browser history entries (default: patryk) */
  username: string;
  /** Fixed timestamp for browser history entries (Unix timestamp in microseconds) */
  browserHistoryTimestamp: number;
  /** Whether to create detection rule (default: true) */
  createDetectionRule: boolean;
  /** Whether to create VirusTotal workflow (default: true) */
  createWorkflow: boolean;
  /** VirusTotal API key (required if createWorkflow is true) */
  virustotalApiKey?: string;
  /** Agent version to use (default: stack version) */
  agentVersion?: string;

  /** If true, install a GUI (XFCE) + RDP (XRDP) on Multipass VMs */
  enableGui: boolean;
  /** Username to use for GUI login (default: ubuntu) */
  vmGuiUser?: string;
  /** Password to use for GUI login (default: changeme) */
  vmGuiPassword?: string;

  /** VM manager to use: multipass, vagrant, utm, or gcp (default: multipass, CI: vagrant) */
  vmType: SupportedVmManager;
  /** Comma-separated list of existing GCP VM names to target for browser-history step (only for vmType=gcp) */
  gcpVmNames?: string;
}

export interface ProvisionedEndpoint {
  hostname: string;
  agentId: string;
  hostVm: HostVm;
  policyType: 'defend-osquery' | 'osquery-only';
  browserHistory?: {
    browser: 'chrome' | 'firefox';
    domain: string;
    timestamp: number;
  };
}

export interface ProvisioningContext {
  kbnClient: KbnClient;
  esClient: Client;
  log: ToolingLog;
  config: Rsa2026DemoConfig;
  endpoints: ProvisionedEndpoint[];
  policyIds: {
    defendOsquery: string;
    osqueryOnly: string;
  };
  detectionRuleId?: string;
  workflowId?: string;
  virusTotalConnectorId?: string;
}

export interface BrowserHistoryEntry {
  url: string;
  title: string;
  visitTime: number; // Unix timestamp in microseconds
  visitCount: number;
  user: string;
}
