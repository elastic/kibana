/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { KbnClient } from '@kbn/test';
import type { PackagePolicy, PackagePolicyInput } from '@kbn/fleet-plugin/common';
import { API_VERSIONS, epmRouteService } from '@kbn/fleet-plugin/common';
import {
  createIntegrationPolicy,
  fetchAgentPolicy,
  fetchPackageInfo,
  installIntegration,
} from '../../common/fleet_services';

interface AddPacketbeatDnsIntegrationOptions {
  kbnClient: KbnClient;
  log: ToolingLog;
  agentPolicyId: string;
  integrationPolicyName?: string;
  force?: boolean;
}

const isDnsDataset = (dataset?: string): boolean => {
  if (!dataset) return false;
  // Common dataset naming patterns:
  // - packetbeat.dns
  // - dns
  // - *.dns
  return dataset === 'dns' || dataset.endsWith('.dns') || dataset.includes('.dns.');
};

const normalizeInputsToDnsOnly = (inputs: PackagePolicyInput[]): PackagePolicyInput[] => {
  return inputs
    .map((input) => {
      const streams = (input.streams ?? []).map((stream) => {
        const dataset = stream.data_stream?.dataset;
        return { ...stream, enabled: isDnsDataset(dataset) };
      });

      const enabled = streams.some((s) => Boolean(s.enabled));
      return {
        ...input,
        enabled,
        streams,
      };
    })
    .filter((input) => input.enabled);
};

/**
 * Adds Packetbeat integration to an agent policy and enables only DNS streams so we can
 * reliably ingest `dns.question.name` on Linux.
 *
 * Implementation detail:
 * - We fetch the integration's input templates from EPM (format=json) to avoid hard-coding
 *   the current Packetbeat package policy schema.
 */
export const addPacketbeatDnsIntegrationToAgentPolicy = async ({
  kbnClient,
  log,
  agentPolicyId,
  integrationPolicyName = `packetbeat-dns-${Math.random().toString().substring(2, 6)}`,
  force = false,
}: AddPacketbeatDnsIntegrationOptions): Promise<PackagePolicy> => {
  const packetbeatPackageName = 'packetbeat';

  // If `force` is `false` and agent policy already has Packetbeat, exit here
  if (!force) {
    log.debug(
      `Checking to see if agent policy [${agentPolicyId}] already includes a Packetbeat integration policy`
    );
    const agentPolicy = await fetchAgentPolicy(kbnClient, agentPolicyId);
    log.verbose(agentPolicy);
    const integrationPolicies = agentPolicy.package_policies ?? [];

    for (const integrationPolicy of integrationPolicies) {
      if (integrationPolicy.package?.name === packetbeatPackageName) {
        log.debug(
          `Returning existing Packetbeat Integration Policy included in agent policy [${agentPolicyId}]`
        );
        return integrationPolicy;
      }
    }
  }

  // Try to get package info, install if not available
  let packageInfo;
  try {
    packageInfo = await fetchPackageInfo(kbnClient, packetbeatPackageName);
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      log.info('Packetbeat package not found, installing it first...');
      await installIntegration(kbnClient, packetbeatPackageName);
      packageInfo = await fetchPackageInfo(kbnClient, packetbeatPackageName);
    } else {
      throw error;
    }
  }

  const { version: packageVersion, name: packageName, title: packageTitle } = packageInfo;

  // Pull input templates and derive a working package policy body from them
  const inputTemplatesPath = epmRouteService.getInputsTemplatesPath(packageName, packageVersion);
  log.debug(`Fetching Packetbeat input templates from: ${inputTemplatesPath}`);

  const inputsTemplatesResponse = await kbnClient.request<unknown>({
    method: 'GET',
    path: inputTemplatesPath,
    headers: { 'Elastic-Api-Version': API_VERSIONS.public.v1 },
    query: { format: 'json' },
  });

  const inputsRaw = (inputsTemplatesResponse.data as any)?.inputs;
  const inputs = Array.isArray(inputsRaw) ? (inputsRaw as PackagePolicyInput[]) : [];

  if (!inputs.length) {
    throw new Error(
      `EPM did not return any input templates for [${packetbeatPackageName}@${packageVersion}].`
    );
  }

  const dnsOnlyInputs = normalizeInputsToDnsOnly(inputs);
  if (!dnsOnlyInputs.length) {
    throw new Error(
      `Unable to find a DNS stream in Packetbeat input templates for [${packetbeatPackageName}@${packageVersion}].`
    );
  }

  log.debug(
    `Creating new Packetbeat (DNS-only) integration policy [package v${packageVersion}] and adding it to agent policy [${agentPolicyId}]`
  );

  return createIntegrationPolicy(kbnClient, {
    name: integrationPolicyName,
    description: `Packetbeat DNS-only integration. Created by script: ${__filename}`,
    policy_id: agentPolicyId,
    policy_ids: [agentPolicyId],
    enabled: true,
    inputs: dnsOnlyInputs as any,
    package: {
      name: packageName,
      title: packageTitle,
      version: packageVersion,
    },
  });
};
