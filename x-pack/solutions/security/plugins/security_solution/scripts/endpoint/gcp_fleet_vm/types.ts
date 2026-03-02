/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface GcpFleetVmConfig {
  gcpProject: string;
  gcpZone: string;

  /** Local Elasticsearch URL (used for fleet output + connectivity validation after being rewritten to Tailscale IP if needed) */
  elasticUrl: string;
  /**
   * Optional: local Tailscale MagicDNS hostname to use instead of a Tailscale IP when rewriting `localhost`.
   * Example: `macbook-pro-patryk.tail9bbcc.ts.net`
   */
  localTailscaleHostname?: string;

  /** Where to run Fleet Server */
  fleetServerMode: 'gcp' | 'local-docker';
  /** Fleet Server listen port (default: 8220) */
  fleetServerPort: number;
  /** Fleet Server VM name (only for fleetServerMode=gcp) */
  fleetServerName: string;
  /** Fleet Server VM machine type (only for fleetServerMode=gcp) */
  fleetServerMachineType: string;

  ubuntuAgentCount: number;
  windowsAgentCount: number;
  /** Number of Ubuntu VMs with Osquery-only policy (no Elastic Defend, no Network Packet Capture) */
  osqueryOnlyAgentCount: number;
  agentMachineType: string;

  /** If empty, the script will use stack-matching version */
  agentVersion?: string;

  /** Tailscale auth key used to join VMs to tailnet */
  tailscaleAuthKey: string;

  /** If set, deploy Caldera agents too */
  enableCaldera: boolean;
  /**
   * If set, install Atomic Red Team + Invoke-AtomicRedTeam on agent VMs (best-effort).
   * Intended to be used alongside Caldera so you can run atomics on the same hosts.
   */
  enableInvokeAtomic: boolean;
  /** e.g. http://100.x.y.z:8888 */
  calderaUrl?: string;

  /** Prefix for VM instance names */
  namePrefix: string;

  /** Delete created VMs (and optionally Fleet artifacts) */
  cleanup: boolean;
  cleanupAll: boolean;

  /**
   * Skip TLS verification when enrolling agents (`--insecure` flag).
   * Defaults to `true` for lab/demo use where Fleet Server uses self-signed certs.
   * Set to `false` when using properly signed certs.
   */
  insecureFleetEnroll: boolean;
}

export interface DeployCalderaToExistingUbuntuConfig {
  gcpProject: string;
  gcpZone: string;
  /** Existing Ubuntu VM instance names */
  vmNames: string[];
  /** Caldera URL reachable from the VM(s) */
  calderaUrl: string;
  /** If set, also install Atomic Red Team + Invoke-AtomicRedTeam (best-effort) */
  enableInvokeAtomic?: boolean;
}

export interface ProvisionedGcpVm {
  name: string;
  os: 'ubuntu' | 'windows';
}

export interface GcpFleetVmContext {
  fleetServerVm: ProvisionedGcpVm;
  agentVms: ProvisionedGcpVm[];
  /** VMs enrolled to the Osquery-only policy */
  osqueryOnlyVms: ProvisionedGcpVm[];

  fleetServerUrl: string;
  elasticsearchOutputUrl: string;
  calderaUrl?: string;

  fleetServerPolicyId: string;
  agentPolicyId: string;
  /** Policy ID for Osquery-only agents (if osqueryOnlyAgentCount > 0) */
  osqueryOnlyPolicyId?: string;
}
