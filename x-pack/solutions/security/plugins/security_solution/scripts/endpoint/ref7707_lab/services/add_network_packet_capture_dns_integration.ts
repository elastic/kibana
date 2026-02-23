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

interface AddNetworkPacketCaptureDnsIntegrationOptions {
    kbnClient: KbnClient;
    log: ToolingLog;
    agentPolicyId: string;
    integrationPolicyName?: string;
    force?: boolean;
}

const isDnsDataset = (dataset?: string): boolean => {
    if (!dataset) return false;
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

// EPM input templates can include fields that the Fleet create-package-policy API doesn't accept.
// Keep only the known-safe subset.
const sanitizeInputsForCreate = (inputs: PackagePolicyInput[]): PackagePolicyInput[] => {
    return inputs.map((input) => {
        const sanitizedStreams = (input.streams ?? []).map((s) => {
            const dataset = s.data_stream?.dataset;
            const vars = { ...((s as any).vars ?? {}) } as Record<string, any>;

            // network_traffic.dns requires these vars (manifest.yml defaults: port=[53], geoip_enrich=true)
            if (dataset === 'network_traffic.dns') {
                vars.port ??= { value: ['53'] };
                vars.geoip_enrich ??= { value: true };
            }

            return {
            enabled: Boolean((s as any).enabled),
            data_stream: s.data_stream,
            vars,
            };
        });

        return {
            type: input.type,
            enabled: Boolean((input as any).enabled),
            vars: (input as any).vars,
            streams: sanitizedStreams as any,
        } as any;
    });
};

/**
 * Adds "Network Packet Capture" integration to an agent policy and enables only DNS streams
 * (so we can reliably ingest `dns.question.name`).
 *
 * Package naming differs across stacks/versions. We try likely candidates in order:
 * - network_traffic
 * - network_packet_capture
 *
 * We always derive the package policy schema from EPM input templates (format=json).
 */
export const addNetworkPacketCaptureDnsIntegrationToAgentPolicy = async ({
    kbnClient,
    log,
    agentPolicyId,
    integrationPolicyName = `network-packet-capture-dns-${Math.random().toString().substring(2, 6)}`,
    force = false,
}: AddNetworkPacketCaptureDnsIntegrationOptions): Promise<PackagePolicy> => {
    // Prefer network_traffic; network_packet_capture isn't present in all package registries.
    const candidatePackageNames = ['network_traffic', 'network_packet_capture'];

    // If `force` is `false` and agent policy already has one of these packages, exit here
    if (!force) {
        log.debug(`Checking if agent policy [${agentPolicyId}] already includes a network capture integration`);
        const agentPolicy = await fetchAgentPolicy(kbnClient, agentPolicyId);
        const integrationPolicies = agentPolicy.package_policies ?? [];
        for (const integrationPolicy of integrationPolicies) {
            const pkg = integrationPolicy.package?.name;
            if (pkg && candidatePackageNames.includes(pkg)) {
                log.debug(`Returning existing network capture Integration Policy [${pkg}] in agent policy [${agentPolicyId}]`);
                return integrationPolicy;
            }
        }
    }

    let lastError: unknown;
    for (const packageName of candidatePackageNames) {
        try {
            // Try to get package info, install if not available
            let packageInfo;
            try {
                packageInfo = await fetchPackageInfo(kbnClient, packageName);
            } catch (error) {
                if (error instanceof Error && error.message.includes('404')) {
                    log.info(`[ref7707] ${packageName} package not found, installing it first...`);
                    await installIntegration(kbnClient, packageName);
                    packageInfo = await fetchPackageInfo(kbnClient, packageName);
                } else {
                    throw error;
                }
            }

            const { version: packageVersion, title: packageTitle } = packageInfo;

            const inputTemplatesPath = epmRouteService.getInputsTemplatesPath(packageName, packageVersion);
            log.debug(`Fetching ${packageName} input templates from: ${inputTemplatesPath}`);

            const inputsTemplatesResponse = await kbnClient.request<unknown>({
                method: 'GET',
                path: inputTemplatesPath,
                headers: { 'Elastic-Api-Version': API_VERSIONS.public.v1 },
                query: { format: 'json' },
            });

            const inputsRaw = (inputsTemplatesResponse.data as any)?.inputs;
            const inputs = Array.isArray(inputsRaw) ? (inputsRaw as PackagePolicyInput[]) : [];
            if (!inputs.length) {
                throw new Error(`EPM did not return any input templates for [${packageName}@${packageVersion}].`);
            }

            const dnsOnlyInputs = normalizeInputsToDnsOnly(inputs);
            if (!dnsOnlyInputs.length) {
                throw new Error(
                    `Unable to find a DNS stream in ${packageName} input templates for [${packageName}@${packageVersion}].`
                );
            }
            const sanitizedInputs = sanitizeInputsForCreate(dnsOnlyInputs);

            log.debug(
                `Creating new ${packageName} (DNS-only) integration policy [package v${packageVersion}] and adding it to agent policy [${agentPolicyId}]`
            );

            return createIntegrationPolicy(kbnClient, {
                name: integrationPolicyName,
                description: `Network packet capture DNS-only integration. Created by script: ${__filename}`,
                policy_id: agentPolicyId,
                enabled: true,
                inputs: sanitizedInputs as any,
                package: {
                    name: packageName,
                    title: packageTitle,
                    version: packageVersion,
                },
            });
        } catch (e) {
            lastError = e;
            log.warning(`[ref7707] unable to install/configure ${packageName} for DNS-only: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    throw lastError instanceof Error
        ? lastError
        : new Error(`Unable to install/configure any network packet capture integration for DNS-only streams`);
};


